import type { PlatformId } from "../platforms";
import type { MatchKind } from "./investigation";

/** Public profile fields a provider was able to read. All optional. */
export interface PublicProfileInfo {
    displayName?: string;
    bio?: string;
    location?: string;
    website?: string;
    followers?: number;
    /** ISO-8601 */
    accountCreatedAt?: string;
}
// Email addresses are deliberately never collected, even when a platform
// publishes one: data minimisation, per the README's responsible-use policy.

export interface ProfileMatch {
    /** Stable within a response: `${providerId}:${username.toLowerCase()}`. */
    id: string;
    providerId: PlatformId;
    platformLabel: string;
    profileUrl: string;
    /** Username exactly as the platform reports it. */
    username: string;
    matchKind: MatchKind;
    /** 0–1 string similarity between the query and `username`. */
    similarity: number;
    /**
     * 0–1 strength of the *username* match. This is NOT the probability that
     * both accounts belong to the same person; matching handles prove nothing
     * about identity and results must be verified independently.
     */
    confidence: number;
    /** True when the match is exact only if letter case is ignored. */
    caseDiffers: boolean;
    profile: PublicProfileInfo;
    /** ISO-8601 */
    retrievedAt: string;
}

export type ProviderStatus =
    | "ok" // searched successfully (matches may be empty)
    | "rate_limited" // platform asked us to slow down; we are backing off
    | "unavailable" // network error or platform 5xx
    | "unauthorized" // credentials missing, invalid or rejected
    | "not_configured" // provider needs credentials that haven't been set
    | "timeout"
    | "cancelled"
    | "error" // unexpected failure or unusable response
    | "skipped"; // not searched (e.g. it is the origin platform)

export interface ProviderResult {
    providerId: PlatformId;
    platformLabel: string;
    status: ProviderStatus;
    matches: ProfileMatch[];
    /** Human-readable explanation for any non-"ok" status. */
    message?: string;
    /** Set when `status === "rate_limited"`. */
    retryAfterSeconds?: number;
    durationMs: number;
}

export interface SearchRequest {
    /**
     * Optional caller-chosen UUID so the search can be cancelled while it is
     * still running (`search:run` only resolves when it finishes).
     */
    searchId?: string;
    username: string;
    originPlatform: PlatformId;
    /** Search the origin platform too (off by default: it just finds the source profile). */
    includeOriginPlatform?: boolean;
    /** Restrict to these providers; default is all configured providers. */
    providerIds?: PlatformId[];
}

export interface SearchResponse {
    searchId: string;
    query: { username: string; originPlatform: PlatformId };
    startedAt: string;
    completedAt: string;
    /** One entry per provider considered, in a stable order. */
    results: ProviderResult[];
}

export interface ProviderInfo {
    id: PlatformId;
    label: string;
    /** Can it find similar (not just exact) usernames? */
    supportsSimilar: boolean;
    requiresCredentials: boolean;
    /** Whether required credentials are present. Credential values never leave the main process. */
    configured: boolean;
    /** Where the platform's API terms/documentation live. */
    docsUrl: string;
}
