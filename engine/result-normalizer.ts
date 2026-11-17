import type { ProfileMatch, PublicProfileInfo } from "../shared/types/search";
import { computeConfidence } from "./confidence";
import type { RawProfile, SearchProvider } from "./providers/types";
import { compareUsernames } from "./similarity";

export const MAX_MATCHES_PER_PROVIDER = 10;

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;

/** Plain text only: strip control characters, collapse whitespace, cap length. */
export function cleanText(value: unknown, max: number): string | undefined {
    if (typeof value !== "string") return undefined;
    const text = value.replace(CONTROL, " ").replace(/\s+/g, " ").trim();
    if (!text) return undefined;
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function cleanWebsite(value: unknown): string | undefined {
    const text = cleanText(value, 200);
    if (!text) return undefined;
    try {
        const url = new URL(text);
        return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
    } catch {
        return undefined;
    }
}

function cleanDate(value: unknown): string | undefined {
    if (typeof value !== "string" && typeof value !== "number") return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function cleanProfile(raw: PublicProfileInfo | undefined): PublicProfileInfo {
    if (!raw) return {};
    const out: PublicProfileInfo = {};
    const displayName = cleanText(raw.displayName, 100);
    const bio = cleanText(raw.bio, 500);
    const location = cleanText(raw.location, 100);
    const website = cleanWebsite(raw.website);
    const accountCreatedAt = cleanDate(raw.accountCreatedAt);
    if (displayName) out.displayName = displayName;
    if (bio) out.bio = bio;
    if (location) out.location = location;
    if (website) out.website = website;
    if (accountCreatedAt) out.accountCreatedAt = accountCreatedAt;
    if (typeof raw.followers === "number" && Number.isFinite(raw.followers) && raw.followers >= 0) {
        out.followers = Math.floor(raw.followers);
    }
    return out;
}

/** True only for https URLs on one of the given hostnames. */
export function isHttpsOnHost(url: string, hosts: readonly string[]): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" && hosts.includes(parsed.hostname);
    } catch {
        return false;
    }
}

/**
 * Turns a provider's raw findings into the shared `ProfileMatch` shape:
 *   - drops profile URLs that aren't https on the platform's own hosts
 *   - classifies each as exact / similar (dropping anything neither)
 *   - cleans untrusted text from the platform
 *   - de-duplicates, orders (exact first, then strongest), and caps the list
 */
export function normaliseProfiles(
    provider: Pick<SearchProvider, "id" | "label" | "profileHosts">,
    raws: readonly RawProfile[],
    queryUsername: string,
    retrievedAt: string,
): ProfileMatch[] {
    const seen = new Set<string>();
    const matches: ProfileMatch[] = [];

    for (const raw of raws) {
        if (typeof raw.username !== "string" || !isHttpsOnHost(raw.profileUrl, provider.profileHosts)) continue;

        const comparison = compareUsernames(queryUsername, raw.username);
        if (comparison.kind === "none") continue;

        const key = raw.profileUrl.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        matches.push({
            id: `${provider.id}:${raw.username.toLowerCase()}`,
            providerId: provider.id,
            platformLabel: provider.label,
            profileUrl: raw.profileUrl,
            username: raw.username,
            matchKind: comparison.kind,
            similarity: comparison.similarity,
            confidence: computeConfidence(comparison),
            caseDiffers: comparison.caseDiffers,
            profile: cleanProfile(raw.profile),
            retrievedAt,
        });
    }

    matches.sort(
        (a, b) =>
            Number(b.matchKind === "exact") - Number(a.matchKind === "exact") ||
            b.confidence - a.confidence ||
            a.username.localeCompare(b.username),
    );
    return matches.slice(0, MAX_MATCHES_PER_PROVIDER);
}
