import { isRecord, num, str } from "./util";
import type { ProviderContext, ProviderSearchOutput, SearchProvider } from "./types";

/**
 * Hacker News — official public API (https://github.com/HackerNews/API).
 *   exact: GET /v0/user/{id}.json   (returns `null` when the user doesn't exist)
 *
 * The API has no user search, so this provider finds exact usernames only.
 * IDs are case-sensitive on this API. No credentials needed.
 */
const HN_USERNAME = /^[A-Za-z0-9_-]{2,15}$/;

/** The "about" field is HTML; reduce it to plain text. */
function htmlToText(html: string): string {
    return html
        .replace(/<[^>]*>/g, " ")
        .replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|#39);/gi, (_m, e: string) => {
            const named: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };
            if (e.toLowerCase() in named) return named[e.toLowerCase()];
            const code = e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
            return Number.isFinite(code) && code > 31 && code < 0x10ffff ? String.fromCodePoint(code) : " ";
        });
}

export const hackerNewsProvider: SearchProvider = {
    id: "hackernews",
    label: "Hacker News",
    docsUrl: "https://github.com/HackerNews/API",
    supportsSimilar: false,
    requiredCredentials: [],
    apiHosts: ["hacker-news.firebaseio.com"],
    profileHosts: ["news.ycombinator.com"],
    minRequestIntervalMs: 300,

    async search({ username }, ctx: ProviderContext): Promise<ProviderSearchOutput> {
        if (!HN_USERNAME.test(username)) {
            return { profiles: [], notes: ["This isn't a valid Hacker News username."] };
        }
        const res = await ctx.http.getJson(`https://hacker-news.firebaseio.com/v0/user/${encodeURIComponent(username)}.json`);
        if (res.status !== 200 || !isRecord(res.json)) return { profiles: [] };

        const id = str(res.json.id);
        if (!id) return { profiles: [] };
        const created = num(res.json.created);
        const about = str(res.json.about);
        return {
            profiles: [
                {
                    username: id,
                    profileUrl: `https://news.ycombinator.com/user?id=${encodeURIComponent(id)}`,
                    profile: {
                        bio: about ? htmlToText(about) : undefined,
                        accountCreatedAt: created ? new Date(created * 1000).toISOString() : undefined,
                    },
                },
            ],
        };
    },
};
