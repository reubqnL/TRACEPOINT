import { ProviderError } from "./errors";
import type { RateLimitInfo, ProviderHttp, HttpResult, RequestOptions, SearchProvider } from "./providers/types";
import type { RequestScheduler } from "./rate-limiter";
import { formatWait } from "./rate-limiter";

export const USER_AGENT = "Tracepoint/1.0 (+https://github.com/reubqnL/TRACEPOINT; open-source OSINT research tool)";

export interface HttpOptions {
    fetchImpl?: typeof fetch;
    /** Per-request timeout. */
    requestTimeoutMs?: number;
    /** Responses larger than this are rejected. */
    maxBytes?: number;
    now?: () => number;
}

const DEFAULTS = { requestTimeoutMs: 10_000, maxBytes: 1_000_000 };

/** Parses a Retry-After header (delta-seconds or HTTP-date) into seconds. */
export function parseRetryAfter(value: string | null, nowMs: number): number | undefined {
    if (!value) return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, seconds);
    const date = Date.parse(value);
    return Number.isNaN(date) ? undefined : Math.max(0, (date - nowMs) / 1000);
}

export function createProviderHttp(
    provider: Pick<SearchProvider, "id" | "label" | "apiHosts" | "parseRateLimit">,
    scheduler: RequestScheduler,
    signal: AbortSignal,
    options: HttpOptions = {},
): ProviderHttp {
    const fetchImpl = options.fetchImpl ?? fetch;
    const timeoutMs = options.requestTimeoutMs ?? DEFAULTS.requestTimeoutMs;
    const maxBytes = options.maxBytes ?? DEFAULTS.maxBytes;
    const now = options.now ?? Date.now;

    const assertAllowed = (raw: string): URL => {
        const url = new URL(raw);
        if (url.protocol !== "https:" || !provider.apiHosts.includes(url.hostname)) {
            throw new ProviderError("error", `${provider.label}: blocked request to an unapproved address.`);
        }
        return url;
    };

    async function send(url: string, init: RequestInit): Promise<HttpResult> {
        const target = assertAllowed(url);
        await scheduler.acquire(signal);

        let response: Response;
        try {
            response = await fetchImpl(target, {
                ...init,
                signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
                redirect: "follow",
            });
        } catch (error) {
            if (signal.aborted) throw new ProviderError("cancelled", "Search cancelled.");
            if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
                throw new ProviderError("timeout", `${provider.label} took too long to respond.`);
            }
            throw new ProviderError("unavailable", `Couldn't reach ${provider.label}. Check your connection.`);
        }

        // A redirect must not take us somewhere we haven't approved.
        try {
            assertAllowed(response.url || target.href);
        } catch {
            throw new ProviderError("error", `${provider.label}: blocked redirect to an unapproved address.`);
        }

        // ---- rate limiting -------------------------------------------------
        const info: RateLimitInfo | undefined = provider.parseRateLimit?.(response.headers, response.status);
        const retryAfter = parseRetryAfter(response.headers.get("retry-after"), now());
        const exhausted = info?.remaining !== undefined && info.remaining <= 0;
        const waitSeconds = retryAfter ?? info?.resetInSeconds ?? 60;

        if (response.status === 429 || (response.status === 403 && exhausted)) {
            const seconds = scheduler.setCooldown(waitSeconds);
            throw new ProviderError(
                "rate_limited",
                `${provider.label} rate limit reached. Try again in about ${formatWait(seconds)}.`,
                seconds,
            );
        }
        // Quota used up by this very request: back off *before* the next one needs to be refused.
        if (exhausted && response.ok) scheduler.setCooldown(waitSeconds);

        // ---- classification ------------------------------------------------
        if (response.status === 401 || response.status === 403) {
            throw new ProviderError("unauthorized", `${provider.label} denied access. Its API credentials may be missing or invalid.`);
        }
        if (response.status >= 500) {
            throw new ProviderError("unavailable", `${provider.label} is having problems right now (HTTP ${response.status}).`);
        }
        if (response.status !== 404 && !response.ok) {
            throw new ProviderError("error", `${provider.label} returned an unexpected response (HTTP ${response.status}).`);
        }

        // ---- body ----------------------------------------------------------
        const declared = Number(response.headers.get("content-length"));
        if (declared > maxBytes) throw new ProviderError("error", `${provider.label} returned an unexpectedly large response.`);
        const text = await response.text();
        if (text.length > maxBytes) throw new ProviderError("error", `${provider.label} returned an unexpectedly large response.`);

        let json: unknown;
        if (text.trim()) {
            try {
                json = JSON.parse(text);
            } catch {
                if (response.ok) throw new ProviderError("error", `${provider.label} returned an unreadable response.`);
            }
        }
        return { status: response.status, json, headers: response.headers };
    }

    const withDefaults = (extra?: RequestOptions): Record<string, string> => ({
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...extra?.headers,
    });

    return {
        getJson: (url, opts) => send(url, { method: "GET", headers: withDefaults(opts) }),
        postForm: (url, form, opts) =>
            send(url, {
                method: "POST",
                headers: { ...withDefaults(opts), "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(form).toString(),
            }),
    };
}
