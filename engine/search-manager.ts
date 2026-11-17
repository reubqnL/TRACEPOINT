import { randomUUID } from "node:crypto";
import { isPlatformId, platformLabel } from "../shared/platforms";
import type {
    ProviderInfo,
    ProviderResult,
    ProviderStatus,
    SearchRequest,
    SearchResponse,
} from "../shared/types/search";
import { isValidId, validateSearchUsername } from "../shared/validation";
import { ProviderError, SearchRequestError } from "./errors";
import { createProviderHttp, type HttpOptions } from "./http";
import type { CredentialStore, SearchProvider } from "./providers/types";
import { RequestScheduler, type Sleep } from "./rate-limiter";
import { isHttpsOnHost, normaliseProfiles } from "./result-normalizer";

export interface SearchManagerOptions {
    credentials: CredentialStore;
    http?: HttpOptions;
    /** Overall ceiling for one provider, including any waiting for rate limits. */
    providerTimeoutMs?: number;
    now?: () => Date;
    sleep?: Sleep;
    /** Receives unexpected errors; message text shown to users stays generic. */
    log?: (message: string, error: unknown) => void;
}

const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;

export class SearchManager {
    private readonly schedulers = new Map<string, RequestScheduler>();
    private readonly running = new Map<string, AbortController>();

    constructor(
        private readonly providers: readonly SearchProvider[],
        private readonly options: SearchManagerOptions,
    ) {}

    listProviders(): ProviderInfo[] {
        return this.providers.map((p) => ({
            id: p.id,
            label: p.label,
            supportsSimilar: p.supportsSimilar,
            requiresCredentials: p.requiredCredentials.length > 0,
            configured: this.isConfigured(p),
            docsUrl: p.docsUrl,
        }));
    }

    /** True if `url` is an https profile link on a platform Tracepoint knows. Used before opening links externally. */
    isKnownProfileUrl(url: string): boolean {
        return this.providers.some((p) => isHttpsOnHost(url, p.profileHosts));
    }

    /** Aborts an in-flight search. Providers already finished keep their results. */
    cancel(searchId: string): boolean {
        const controller = this.running.get(searchId);
        controller?.abort();
        return controller !== undefined;
    }

    async search(request: SearchRequest): Promise<SearchResponse> {
        const username = this.validate(request);
        const searchId = request.searchId ?? randomUUID();
        const controller = new AbortController();
        this.running.set(searchId, controller);

        const startedAt = this.options.now?.() ?? new Date();
        try {
            const results = await Promise.all(
                this.providers
                    .filter((p) => !request.providerIds || request.providerIds.includes(p.id))
                    .map((p) => this.runProvider(p, username, request, controller.signal)),
            );
            return {
                searchId,
                query: { username, originPlatform: request.originPlatform },
                startedAt: startedAt.toISOString(),
                completedAt: (this.options.now?.() ?? new Date()).toISOString(),
                results,
            };
        } finally {
            this.running.delete(searchId);
        }
    }

    // ------------------------------------------------------------------ internals

    private validate(request: SearchRequest): string {
        const errors: Record<string, string> = {};
        const username = validateSearchUsername(request?.username);
        if (!username.ok) Object.assign(errors, username.fields);
        if (!isPlatformId(request?.originPlatform)) errors.originPlatform = "Choose the platform the username came from.";
        if (request?.providerIds !== undefined) {
            const known = new Set<string>(this.providers.map((p) => p.id));
            const ok = Array.isArray(request.providerIds) && request.providerIds.every((id) => known.has(id));
            if (!ok) errors.providerIds = "Unknown platform requested.";
        }
        if (request?.searchId !== undefined && (!isValidId(request.searchId) || this.running.has(request.searchId))) {
            errors.searchId = "Invalid or duplicate search id.";
        }
        if (Object.keys(errors).length) throw new SearchRequestError(errors);
        return (username as { ok: true; value: string }).value;
    }

    private isConfigured(provider: SearchProvider): boolean {
        try {
            return provider.requiredCredentials.every((key) => Boolean(this.options.credentials.get(key)));
        } catch (error) {
            // A faulty credential store must degrade one platform, never the whole search.
            this.options.log?.(`Credential lookup failed for ${provider.id}`, error);
            return false;
        }
    }

    private schedulerFor(provider: SearchProvider): RequestScheduler {
        let scheduler = this.schedulers.get(provider.id);
        if (!scheduler) {
            scheduler = new RequestScheduler(provider.minRequestIntervalMs, this.options.http?.now, this.options.sleep);
            this.schedulers.set(provider.id, scheduler);
        }
        return scheduler;
    }

    /** Never rejects: every outcome becomes a ProviderResult. */
    private async runProvider(
        provider: SearchProvider,
        username: string,
        request: SearchRequest,
        userSignal: AbortSignal,
    ): Promise<ProviderResult> {
        const started = Date.now();
        const result = (status: ProviderStatus, extra: Partial<ProviderResult> = {}): ProviderResult => ({
            providerId: provider.id,
            platformLabel: provider.label,
            status,
            matches: [],
            durationMs: Date.now() - started,
            ...extra,
        });

        if (provider.id === request.originPlatform && !request.includeOriginPlatform) {
            return result("skipped", { message: `Skipped: ${platformLabel(provider.id)} is where this username came from.` });
        }
        if (!this.isConfigured(provider)) {
            return result("not_configured", {
                message: `${provider.label} needs API credentials before it can be searched. Its terms require registered access.`,
            });
        }

        // One controller per provider: aborts on user cancel OR this provider's own timeout.
        const controller = new AbortController();
        let timedOut = false;
        const onCancel = () => controller.abort();
        userSignal.addEventListener("abort", onCancel, { once: true });
        const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, this.options.providerTimeoutMs ?? DEFAULT_PROVIDER_TIMEOUT_MS);

        try {
            if (userSignal.aborted) throw new ProviderError("cancelled", "Search cancelled.");
            const http = createProviderHttp(provider, this.schedulerFor(provider), controller.signal, this.options.http);
            const output = await provider.search({ username }, { http, credentials: this.options.credentials, signal: controller.signal });

            const retrievedAt = (this.options.now?.() ?? new Date()).toISOString();
            const matches = normaliseProfiles(provider, output.profiles, username, retrievedAt);
            return result("ok", { matches, message: output.notes?.length ? output.notes.join(" ") : undefined });
        } catch (error) {
            if (timedOut) return result("timeout", { message: `${provider.label} took too long to respond.` });
            if (userSignal.aborted) return result("cancelled", { message: "Search cancelled." });
            if (error instanceof ProviderError) {
                return result(error.kind, { message: error.message, retryAfterSeconds: error.retryAfterSeconds });
            }
            this.options.log?.(`Unexpected error in ${provider.id} provider`, error);
            return result("error", { message: `Something went wrong searching ${provider.label}.` });
        } finally {
            clearTimeout(timer);
            userSignal.removeEventListener("abort", onCancel);
        }
    }
}
