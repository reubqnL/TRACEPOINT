import { ProviderError } from "../errors";
import { isRecord, num, readRateLimit, str } from "./util";
import type { ProviderContext, ProviderSearchOutput, SearchProvider } from "./types";

/**
 * Reddit — official Data API with OAuth (https://support.reddithelp.com/hc/en-us/articles/14945211791892).
 *   exact: GET https://oauth.reddit.com/user/{name}/about
 *
 * Reddit's API terms require registered, authenticated clients, so this
 * provider is OFF until the user supplies their own app credentials:
 *   reddit.clientId      (required)  – from reddit.com/prefs/apps
 *   reddit.clientSecret  (optional)  – omit for an "installed app" client
 *
 * Exact usernames only. Suspended accounts are reported without profile detail.
 */
const REDDIT_USERNAME = /^[A-Za-z0-9_-]{3,20}$/;

export function createRedditProvider(now: () => number = Date.now): SearchProvider {
    let token: { value: string; expiresAt: number } | undefined;

    async function getToken(ctx: ProviderContext): Promise<string> {
        if (token && token.expiresAt - 30_000 > now()) return token.value;

        const id = ctx.credentials.get("reddit.clientId");
        if (!id) throw new ProviderError("unauthorized", "Reddit API credentials are not set.");
        const secret = ctx.credentials.get("reddit.clientSecret");

        const res = await ctx.http.postForm(
            "https://www.reddit.com/api/v1/access_token",
            secret
                ? { grant_type: "client_credentials" }
                : { grant_type: "https://oauth.reddit.com/grants/installed_client", device_id: "DO_NOT_TRACK_THIS_DEVICE" },
            { headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret ?? ""}`).toString("base64")}` } },
        );
        const value = isRecord(res.json) ? str(res.json.access_token) : undefined;
        if (res.status !== 200 || !value) {
            throw new ProviderError("unauthorized", "Reddit rejected the API credentials.");
        }
        const seconds = (isRecord(res.json) ? num(res.json.expires_in) : undefined) ?? 3600;
        token = { value, expiresAt: now() + seconds * 1000 };
        return value;
    }

    return {
        id: "reddit",
        label: "Reddit",
        docsUrl: "https://www.redditinc.com/policies/data-api-terms",
        supportsSimilar: false,
        requiredCredentials: ["reddit.clientId"],
        apiHosts: ["www.reddit.com", "oauth.reddit.com"],
        profileHosts: ["www.reddit.com", "reddit.com"],
        minRequestIntervalMs: 1000, // well inside the 100 requests/minute allowance
        parseRateLimit: (headers) =>
            readRateLimit(headers, { remaining: "x-ratelimit-remaining", reset: "x-ratelimit-reset", resetIs: "delta" }),

        async search({ username }, ctx): Promise<ProviderSearchOutput> {
            if (!REDDIT_USERNAME.test(username)) {
                return { profiles: [], notes: ["This isn't a valid Reddit username."] };
            }
            const accessToken = await getToken(ctx);
            let res;
            try {
                res = await ctx.http.getJson(`https://oauth.reddit.com/user/${encodeURIComponent(username)}/about`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
            } catch (error) {
                if (error instanceof ProviderError && error.kind === "unauthorized") token = undefined; // force a fresh token next time
                throw error;
            }
            if (res.status !== 200 || !isRecord(res.json) || !isRecord(res.json.data)) return { profiles: [] };

            const data = res.json.data;
            const name = str(data.name);
            if (!name) return { profiles: [] };
            const suspended = data.is_suspended === true;
            const sub = isRecord(data.subreddit) ? data.subreddit : {};
            const created = num(data.created_utc);
            return {
                profiles: [
                    {
                        username: name,
                        profileUrl: `https://www.reddit.com/user/${encodeURIComponent(name)}`,
                        profile: suspended
                            ? {}
                            : {
                                  displayName: str(sub.title),
                                  bio: str(sub.public_description),
                                  accountCreatedAt: created ? new Date(created * 1000).toISOString() : undefined,
                              },
                    },
                ],
                notes: suspended ? ["This Reddit account is suspended."] : undefined,
            };
        },
    };
}
