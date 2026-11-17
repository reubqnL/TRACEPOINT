import { isRecord, num, optionalStep, readRateLimit, str } from "./util";
import type { ProviderContext, ProviderSearchOutput, RawProfile, SearchProvider } from "./types";

/**
 * GitHub — official REST API (https://docs.github.com/rest).
 *   exact:   GET /users/{login}
 *   similar: GET /search/users?q={name} in:login
 *
 * Works without credentials but only 60 core requests/hour; an optional
 * personal access token (no scopes needed) raises that to 5,000/hour.
 * The profile's public email is intentionally not read.
 */
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

function toProfile(item: Record<string, unknown>, detailed: boolean): RawProfile | undefined {
    const username = str(item.login);
    const profileUrl = str(item.html_url);
    if (!username || !profileUrl) return undefined;
    return {
        username,
        profileUrl,
        profile: detailed
            ? {
                  displayName: str(item.name),
                  bio: str(item.bio),
                  location: str(item.location),
                  website: str(item.blog),
                  followers: num(item.followers),
                  accountCreatedAt: str(item.created_at),
              }
            : undefined,
    };
}

export const githubProvider: SearchProvider = {
    id: "github",
    label: "GitHub",
    docsUrl: "https://docs.github.com/en/site-policy/github-terms/github-terms-of-service",
    supportsSimilar: true,
    requiredCredentials: [],
    apiHosts: ["api.github.com"],
    profileHosts: ["github.com"],
    minRequestIntervalMs: 1100, // search API: 10 req/min unauthenticated
    parseRateLimit: (headers) =>
        readRateLimit(headers, { remaining: "x-ratelimit-remaining", reset: "x-ratelimit-reset", resetIs: "epoch" }),

    async search({ username }, ctx: ProviderContext): Promise<ProviderSearchOutput> {
        const token = ctx.credentials.get("github.token");
        const headers: Record<string, string> = {
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
        const profiles: RawProfile[] = [];
        const notes: string[] = [];

        if (LOGIN.test(username)) {
            const exact = await ctx.http.getJson(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
            const profile = exact.status === 200 && isRecord(exact.json) ? toProfile(exact.json, true) : undefined;
            if (profile) profiles.push(profile);
        } else {
            notes.push("This isn't a valid GitHub username, so only similar names were searched.");
        }

        const similar = await optionalStep("Similar-name search", notes, () =>
            ctx.http.getJson(
                `https://api.github.com/search/users?q=${encodeURIComponent(`${username} in:login`)}&per_page=10`,
                { headers },
            ),
        );
        if (similar && isRecord(similar.json) && Array.isArray(similar.json.items)) {
            for (const item of similar.json.items) {
                const profile = isRecord(item) ? toProfile(item, false) : undefined;
                if (profile) profiles.push(profile);
            }
        }
        return { profiles, notes };
    },
};
