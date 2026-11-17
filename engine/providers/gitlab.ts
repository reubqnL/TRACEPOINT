import { isRecord, optionalStep, readRateLimit, str } from "./util";
import type { ProviderContext, ProviderSearchOutput, RawProfile, SearchProvider } from "./types";

/**
 * GitLab.com — official REST API (https://docs.gitlab.com/ee/api/users.html).
 *   exact:   GET /users?username={name}
 *   similar: GET /users?search={name}
 *
 * No credentials needed. Only users whose state is "active" are reported, so
 * blocked/banned accounts are never surfaced.
 */
function toProfiles(json: unknown): RawProfile[] {
    if (!Array.isArray(json)) return [];
    const out: RawProfile[] = [];
    for (const item of json) {
        if (!isRecord(item) || item.state !== "active") continue;
        const username = str(item.username);
        const profileUrl = str(item.web_url);
        if (!username || !profileUrl) continue;
        out.push({ username, profileUrl, profile: { displayName: str(item.name) } });
    }
    return out;
}

export const gitlabProvider: SearchProvider = {
    id: "gitlab",
    label: "GitLab",
    docsUrl: "https://handbook.gitlab.com/handbook/legal/policies/website-terms-of-use/",
    supportsSimilar: true,
    requiredCredentials: [],
    apiHosts: ["gitlab.com"],
    profileHosts: ["gitlab.com"],
    minRequestIntervalMs: 1000,
    parseRateLimit: (headers) =>
        readRateLimit(headers, { remaining: "ratelimit-remaining", reset: "ratelimit-reset", resetIs: "epoch" }),

    async search({ username }, ctx: ProviderContext): Promise<ProviderSearchOutput> {
        const q = encodeURIComponent(username);
        const notes: string[] = [];

        const exact = await ctx.http.getJson(`https://gitlab.com/api/v4/users?username=${q}`);
        const profiles = exact.status === 200 ? toProfiles(exact.json) : [];

        const similar = await optionalStep("Similar-name search", notes, () =>
            ctx.http.getJson(`https://gitlab.com/api/v4/users?search=${q}&per_page=10`),
        );
        if (similar?.status === 200) profiles.push(...toProfiles(similar.json));
        return { profiles, notes };
    },
};
