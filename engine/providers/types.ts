import type { PlatformId } from "../../shared/platforms";
import type { PublicProfileInfo } from "../../shared/types/search";

/** Read-only access to API credentials. Implemented by the main process; never exposed to the UI. */
export interface CredentialStore {
    get(key: string): string | undefined;
}

export interface HttpResult {
    status: number;
    /** Parsed JSON body, or undefined if the body was empty. Only 2xx/404 responses are returned. */
    json: unknown;
    headers: Headers;
}

export interface RequestOptions {
    headers?: Record<string, string>;
}

/**
 * The ONLY way a provider may touch the network. It enforces HTTPS, the
 * provider's host allow-list, request spacing, back-off, timeouts, a response
 * size cap and error classification, so a new provider cannot forget them.
 */
export interface ProviderHttp {
    getJson(url: string, options?: RequestOptions): Promise<HttpResult>;
    postForm(url: string, form: Record<string, string>, options?: RequestOptions): Promise<HttpResult>;
}

export interface ProviderContext {
    http: ProviderHttp;
    credentials: CredentialStore;
    /** Aborted on user cancel or overall timeout. */
    signal: AbortSignal;
}

/** What a provider hands back: a username + URL it found, plus any public profile fields. */
export interface RawProfile {
    username: string;
    profileUrl: string;
    profile?: PublicProfileInfo;
}

export interface ProviderSearchOutput {
    profiles: RawProfile[];
    /** Non-fatal remarks shown to the user, e.g. "similar-name search unavailable". */
    notes?: string[];
}

export interface RateLimitInfo {
    remaining?: number;
    /** Seconds until the window resets. */
    resetInSeconds?: number;
}

/** One platform integration. Implement this to add a platform; see docs/search-engine.md. */
export interface SearchProvider {
    readonly id: PlatformId;
    readonly label: string;
    /** Link to the platform's API terms or docs, shown to the user. */
    readonly docsUrl: string;
    /** Can search() return usernames other than the exact one? */
    readonly supportsSimilar: boolean;
    /** Credential keys that must ALL be present for this provider to run. */
    readonly requiredCredentials: readonly string[];
    /** HTTPS hostnames the provider may call. Anything else is blocked. */
    readonly apiHosts: readonly string[];
    /** HTTPS hostnames profile URLs returned must be on. Anything else is dropped. */
    readonly profileHosts: readonly string[];
    /** Minimum gap between requests to this platform. */
    readonly minRequestIntervalMs: number;
    /** Reads this platform's rate-limit headers, if it sends any. */
    parseRateLimit?(headers: Headers, status: number): RateLimitInfo | undefined;
    search(query: { username: string }, ctx: ProviderContext): Promise<ProviderSearchOutput>;
}
