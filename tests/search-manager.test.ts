import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { createDefaultProviders } from "../engine/providers";
import { normaliseProfiles } from "../engine/result-normalizer";
import { SearchManager } from "../engine/search-manager";
import { SearchRequestError } from "../engine/errors";
import type { CredentialStore } from "../engine/providers/types";
import type { ProviderResult, SearchRequest } from "../shared/types/search";

/* ------------------------------ test helpers ------------------------------ */

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

const json = (body: unknown, init: ResponseInit = {}) =>
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

function fakeFetch(routes: Record<string, Handler>) {
    const calls: string[] = [];
    const impl = (async (input: URL | string, init: RequestInit = {}) => {
        const url = new URL(String(input));
        calls.push(`${init.method ?? "GET"} ${url.host}${url.pathname}${url.search}`);
        const key = Object.keys(routes).reverse().find((k) => `${url.host}${url.pathname}`.startsWith(k)); // later entries override earlier ones
        if (!key) return new Response("not routed", { status: 500 });
        return routes[key](url, init);
    }) as typeof fetch;
    return { impl, calls };
}

const creds = (values: Record<string, string> = {}): CredentialStore => ({ get: (k) => values[k] });
const noSleep = async () => {};

function manager(routes: Record<string, Handler>, values: Record<string, string> = {}, extra = {}) {
    const f = fakeFetch(routes);
    const m = new SearchManager(createDefaultProviders(), {
        credentials: creds(values),
        http: { fetchImpl: f.impl },
        sleep: noSleep,
        ...extra,
    });
    return { m, calls: f.calls };
}

const req = (over: Partial<SearchRequest> = {}): SearchRequest => ({ username: "octocat", originPlatform: "discord", ...over });
const by = (r: { results: ProviderResult[] }, id: string) => r.results.find((x) => x.providerId === id)!;

const githubUser = {
    login: "octocat", html_url: "https://github.com/octocat", name: "The Octocat", bio: "Hi\u0000 there", location: "SF",
    blog: "https://github.blog", followers: 7, created_at: "2011-01-25T18:44:36Z", email: "secret@example.com",
};

const happyRoutes: Record<string, Handler> = {
    "api.github.com/users/": () => json(githubUser),
    "api.github.com/search/users": () =>
        json({ items: [{ login: "octocats", html_url: "https://github.com/octocats" }, { login: "unrelated", html_url: "https://github.com/unrelated" }] }),
    "gitlab.com/api/v4/users": (url) =>
        json(url.searchParams.has("username") ? [{ username: "octocat", web_url: "https://gitlab.com/octocat", name: "Octo", state: "active" }]
            : [{ username: "octo_cat", web_url: "https://gitlab.com/octo_cat", state: "active" }, { username: "octocat1", web_url: "https://gitlab.com/octocat1", state: "blocked" }]),
    "hacker-news.firebaseio.com": () => json({ id: "octocat", created: 1_300_000_000, karma: 5, about: "I &amp; you<p>are <b>here</b>" }),
};

/* ---------------------------------- tests --------------------------------- */

describe("SearchManager – matching", () => {
    it("finds exact and similar matches across several platforms", async () => {
        const { m } = manager(happyRoutes);
        const r = await m.search(req());

        const gh = by(r, "github");
        assert.equal(gh.status, "ok");
        assert.deepEqual(gh.matches.map((x) => [x.username, x.matchKind]), [["octocat", "exact"], ["octocats", "similar"]]); // "unrelated" dropped
        assert.equal(gh.matches[0].profile.displayName, "The Octocat");
        assert.equal(gh.matches[0].profile.bio, "Hi there"); // control char cleaned
        assert.equal(gh.matches[0].profile.followers, 7);

        const gl = by(r, "gitlab");
        assert.deepEqual(gl.matches.map((x) => [x.username, x.matchKind]), [["octocat", "exact"], ["octo_cat", "similar"]]); // blocked user hidden

        const hn = by(r, "hackernews");
        assert.equal(hn.matches[0].profile.bio, "I & you are here"); // HTML reduced to text
        assert.equal(hn.matches[0].profileUrl, "https://news.ycombinator.com/user?id=octocat");
    });

    it("never collects email addresses", async () => {
        const { m } = manager(happyRoutes);
        const r = await m.search(req());
        assert.ok(!JSON.stringify(r).includes("secret@example.com"));
    });

    it("flags case-only differences", async () => {
        const { m } = manager(happyRoutes);
        const r = await m.search(req({ username: "OctoCat" }));
        assert.equal(by(r, "github").matches[0].caseDiffers, true);
    });

    it("skips the origin platform unless asked", async () => {
        const { m, calls } = manager(happyRoutes);
        const r = await m.search(req({ originPlatform: "github" }));
        assert.equal(by(r, "github").status, "skipped");
        assert.ok(!calls.some((c) => c.includes("api.github.com")));
        const again = await m.search(req({ originPlatform: "github", includeOriginPlatform: true }));
        assert.equal(by(again, "github").status, "ok");
    });

    it("returns ok with no matches when nothing is found", async () => {
        const { m } = manager({
            "api.github.com": (url) => url.pathname.startsWith("/search") ? json({ items: [] }) : new Response("{}", { status: 404 }),
            "gitlab.com": () => json([]),
            "hacker-news.firebaseio.com": () => json(null),
        });
        const r = await m.search(req());
        for (const id of ["github", "gitlab", "hackernews"]) {
            assert.equal(by(r, id).status, "ok");
            assert.equal(by(r, id).matches.length, 0);
        }
    });
});

describe("SearchManager – error handling", () => {
    it("one failing platform doesn't affect the others", async () => {
        const { m } = manager({ ...happyRoutes, "gitlab.com": () => new Response("boom", { status: 503 }) });
        const r = await m.search(req());
        assert.equal(by(r, "gitlab").status, "unavailable");
        assert.equal(by(r, "github").status, "ok");
        assert.equal(by(r, "hackernews").status, "ok");
    });

    it("reports network failures as unavailable, with a friendly message", async () => {
        const { m } = manager({ ...happyRoutes, "hacker-news.firebaseio.com": () => { throw new TypeError("fetch failed ECONNRESET 10.0.0.5"); } });
        const hn = by(await m.search(req()), "hackernews");
        assert.equal(hn.status, "unavailable");
        assert.ok(!/ECONNRESET|10\.0\.0\.5/.test(hn.message ?? ""));
    });

    it("reports unreadable responses as errors", async () => {
        const { m } = manager({ ...happyRoutes, "hacker-news.firebaseio.com": () => new Response("<html>oops</html>", { status: 200 }) });
        assert.equal(by(await m.search(req()), "hackernews").status, "error");
    });

    it("hides unexpected exceptions behind a generic message and logs them", async () => {
        const logged: unknown[] = [];
        const m = new SearchManager(createDefaultProviders(), {
            credentials: { get: () => { throw new Error("secret internals"); } },
            http: { fetchImpl: fakeFetch(happyRoutes).impl },
            sleep: noSleep,
            log: (_msg, e) => logged.push(e),
        });
        const r = await m.search(req());
        const gh = by(r, "github");
        assert.equal(gh.status, "error");
        assert.ok(!/secret internals/.test(gh.message ?? ""));
        assert.ok(logged.length >= 1);
        // a broken credential store only disables the platform that needs credentials
        assert.equal(by(r, "reddit").status, "not_configured");
        assert.equal(by(r, "gitlab").status, "ok");
    });

    it("times out a slow platform without blocking the rest", async () => {
        const hangs: Handler = (_u, init) =>
            new Promise<Response>((_res, rej) => init.signal!.addEventListener("abort", () => rej(init.signal!.reason)));
        const f = fakeFetch({ ...happyRoutes, "hacker-news.firebaseio.com": hangs });
        const m = new SearchManager(createDefaultProviders(), {
            credentials: creds(), http: { fetchImpl: f.impl, requestTimeoutMs: 40 }, sleep: noSleep,
        });
        const r = await m.search(req());
        assert.equal(by(r, "hackernews").status, "timeout");
        assert.equal(by(r, "github").status, "ok");
    });

    it("rejects invalid requests before any network call", async () => {
        const { m, calls } = manager(happyRoutes);
        for (const bad of [
            req({ username: "" }), req({ username: "a b" }), req({ username: "x&q=evil" }), req({ username: "a".repeat(65) }),
            req({ username: "user in:login org:evil" }), req({ originPlatform: "myspace" as never }), req({ providerIds: ["nope" as never] }),
        ]) {
            await assert.rejects(() => m.search(bad), SearchRequestError);
        }
        assert.equal(calls.length, 0);
    });
});

describe("SearchManager – rate limits and platform terms", () => {
    it("backs off after HTTP 429 and makes NO further requests during the cooldown", async () => {
        let hits = 0;
        const { m, calls } = manager({
            ...happyRoutes,
            "gitlab.com": () => { hits++; return new Response("slow down", { status: 429, headers: { "retry-after": "120" } }); },
        });
        const first = by(await m.search(req()), "gitlab");
        assert.equal(first.status, "rate_limited");
        assert.equal(first.retryAfterSeconds, 120);
        assert.equal(hits, 1);

        const before = calls.length;
        const second = by(await m.search(req()), "gitlab");
        assert.equal(second.status, "rate_limited");
        assert.equal(hits, 1, "must not hit a platform that told us to wait");
        assert.ok(second.retryAfterSeconds! <= 120 && second.retryAfterSeconds! > 100);
        assert.ok(!calls.slice(before).some((c) => c.includes("gitlab.com")));
        assert.match(second.message!, /2 minutes|\d+ seconds/);
    });

    it("treats GitHub's 403 + remaining=0 as a rate limit and honours the reset time", async () => {
        const reset = Math.floor(Date.now() / 1000) + 300;
        const { m } = manager({
            ...happyRoutes,
            "api.github.com": () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) } }),
        });
        const gh = by(await m.search(req()), "github");
        assert.equal(gh.status, "rate_limited");
        assert.ok(gh.retryAfterSeconds! >= 295 && gh.retryAfterSeconds! <= 301);
    });

    it("backs off proactively when a successful response uses up the quota", async () => {
        const reset = Math.floor(Date.now() / 1000) + 600;
        const { m, calls } = manager({
            ...happyRoutes,
            "api.github.com": (url) => json(url.pathname.startsWith("/search") ? { items: [] } : githubUser, { headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(reset) } }),
        });
        const first = by(await m.search(req()), "github");
        assert.equal(first.matches[0].username, "octocat"); // exact result kept…
        assert.match(first.message ?? "", /Similar-name search/); // …similar step refused by the cooldown
        const n = calls.filter((c) => c.includes("api.github.com")).length;
        await m.search(req());
        assert.equal(calls.filter((c) => c.includes("api.github.com")).length, n, "no new GitHub calls while cooling down");
    });

    it("keeps exact results when only the optional similar-name step fails", async () => {
        const { m } = manager({ ...happyRoutes, "api.github.com/search": () => new Response("{}", { status: 503 }) });
        const gh = by(await m.search(req()), "github");
        assert.equal(gh.status, "ok");
        assert.equal(gh.matches[0].username, "octocat");
        assert.match(gh.message!, /Similar-name search/);
    });

    it("spaces requests to the same platform by at least its minimum interval", async () => {
        let t = 1_000_000;
        const waits: number[] = [];
        const f = fakeFetch(happyRoutes);
        const m = new SearchManager(createDefaultProviders(), {
            credentials: creds(),
            http: { fetchImpl: f.impl, now: () => t },
            sleep: async (ms) => { waits.push(ms); t += ms; },
        });
        await m.search(req()); // github makes 2 requests back-to-back
        assert.ok(waits.some((w) => w > 0 && w <= 1100), `expected a wait for GitHub spacing, got ${waits}`);
    });

    it("sends an identifying User-Agent on every request", async () => {
        const agents = new Set<string>();
        const spy = (inner: Handler): Handler => (u, i) => { agents.add(String((i.headers as Record<string, string>)["User-Agent"])); return inner(u, i); };
        const routes = Object.fromEntries(Object.entries(happyRoutes).map(([k, h]) => [k, spy(h)]));
        await manager(routes).m.search(req());
        assert.equal(agents.size, 1);
        assert.match([...agents][0], /^Tracepoint\/1\.0/);
    });

    it("blocks redirects to hosts the provider isn't approved for", async () => {
        const { m } = manager({
            ...happyRoutes,
            "hacker-news.firebaseio.com": () => {
                const r = json({ id: "octocat" });
                Object.defineProperty(r, "url", { value: "https://evil.example/steal" });
                return r;
            },
        });
        const hn = by(await m.search(req()), "hackernews");
        assert.equal(hn.status, "error");
        assert.equal(hn.matches.length, 0);
    });

    it("rejects oversized responses", async () => {
        const f = fakeFetch({ ...happyRoutes, "hacker-news.firebaseio.com": () => json({ id: "octocat", about: "x".repeat(5000) }) });
        const m = new SearchManager(createDefaultProviders(), { credentials: creds(), http: { fetchImpl: f.impl, maxBytes: 1000 }, sleep: noSleep });
        assert.equal(by(await m.search(req()), "hackernews").status, "error");
    });
});

describe("SearchManager – credentials (Reddit)", () => {
    const redditRoutes: Record<string, Handler> = {
        "www.reddit.com/api/v1/access_token": (_u, init) => {
            const auth = (init.headers as Record<string, string>).Authorization;
            return auth === `Basic ${Buffer.from("my-id:").toString("base64")}` ? json({ access_token: "tok", expires_in: 3600 }) : new Response("{}", { status: 401 });
        },
        "oauth.reddit.com/user/": (_u, init) =>
            (init.headers as Record<string, string>).Authorization === "Bearer tok"
                ? json({ data: { name: "octocat", created_utc: 1_300_000_000, subreddit: { title: "Octo", public_description: "hello" } } })
                : new Response("{}", { status: 401 }),
    };

    it("is not searched, and makes no requests, without credentials", async () => {
        const { m, calls } = manager({ ...happyRoutes, ...redditRoutes });
        const r = await m.search(req());
        assert.equal(by(r, "reddit").status, "not_configured");
        assert.ok(!calls.some((c) => c.includes("reddit.com")));
        assert.equal(m.listProviders().find((p) => p.id === "reddit")!.configured, false);
    });

    it("authenticates with the app's credentials, caches the token, and returns the profile", async () => {
        const { m, calls } = manager({ ...happyRoutes, ...redditRoutes }, { "reddit.clientId": "my-id" });
        const r = await m.search(req());
        assert.equal(by(r, "reddit").matches[0].profile.displayName, "Octo");
        await m.search(req());
        assert.equal(calls.filter((c) => c.includes("access_token")).length, 1, "token reused");
    });

    it("reports rejected credentials as unauthorized without leaking them", async () => {
        const { m } = manager({ ...happyRoutes, ...redditRoutes }, { "reddit.clientId": "wrong-id" });
        const rd = by(await m.search(req()), "reddit");
        assert.equal(rd.status, "unauthorized");
        assert.ok(!JSON.stringify(rd).includes("wrong-id"));
    });

    it("lists providers without exposing credential values", () => {
        const { m } = manager(happyRoutes, { "reddit.clientId": "super-secret" });
        const list = m.listProviders();
        assert.equal(list.find((p) => p.id === "reddit")!.configured, true);
        assert.ok(!JSON.stringify(list).includes("super-secret"));
    });
});

describe("SearchManager – cancellation & URL safety", () => {
    it("accepts a caller-chosen searchId so the UI can cancel, and rejects bad or reused ids", async () => {
        const hangs: Handler = (_u, init) =>
            new Promise<Response>((_r, rej) => init.signal!.addEventListener("abort", () => rej(init.signal!.reason)));
        const f = fakeFetch({ ...happyRoutes, "hacker-news.firebaseio.com": hangs });
        const m = new SearchManager(createDefaultProviders(), { credentials: creds(), http: { fetchImpl: f.impl }, sleep: noSleep });
        const id = "6f1c2c3e-8d5b-4c55-9a43-0b7d9f1a2e10";

        const pending = m.search(req({ searchId: id }));
        await assert.rejects(() => m.search(req({ searchId: id })), SearchRequestError); // reuse while running
        await assert.rejects(() => m.search(req({ searchId: "not-a-uuid" })), SearchRequestError);
        await new Promise((resolve) => setTimeout(resolve, 30)); // let the fast providers finish
        assert.equal(m.cancel(id), true);
        const r = await pending;
        assert.equal(r.searchId, id);
        assert.equal(by(r, "hackernews").status, "cancelled");
        assert.equal(by(r, "github").status, "ok"); // finished providers keep their results
    });

    it("cancel() stops a search in flight", async () => {
        const f = fakeFetch({ ...happyRoutes, "hacker-news.firebaseio.com": (_u, init) => new Promise<Response>((_r, rej) => init.signal!.addEventListener("abort", () => rej(init.signal!.reason))) });
        const m = new SearchManager(createDefaultProviders(), { credentials: creds(), http: { fetchImpl: f.impl }, sleep: noSleep });
        const pending = m.search(req());
        // searchId is only known after the call; cancel via the running map by polling
        await new Promise((r) => setTimeout(r, 20));
        const ids = [...(m as unknown as { running: Map<string, AbortController> }).running.keys()];
        assert.equal(ids.length, 1);
        assert.equal(m.cancel(ids[0]), true);
        const r = await pending;
        assert.equal(by(r, "hackernews").status, "cancelled");
        assert.equal(m.cancel(ids[0]), false); // gone afterwards
    });

    it("only approves https profile links on known platform hosts", () => {
        const { m } = manager(happyRoutes);
        assert.equal(m.isKnownProfileUrl("https://github.com/octocat"), true);
        for (const bad of ["http://github.com/octocat", "https://github.com.evil.io/x", "javascript:alert(1)", "file:///etc/passwd", "https://evil.example", "not a url"]) {
            assert.equal(m.isKnownProfileUrl(bad), false, bad);
        }
    });
});

describe("normaliseProfiles", () => {
    const provider = { id: "github" as const, label: "GitHub", profileHosts: ["github.com"] };
    it("drops off-platform and non-https URLs, dedupes, orders exact first and caps the list", () => {
        const raws = [
            { username: "octocat1", profileUrl: "https://github.com/octocat1" },
            { username: "octocat", profileUrl: "https://github.com/octocat" },
            { username: "octocat", profileUrl: "https://github.com/octocat" }, // dup
            { username: "octocat", profileUrl: "http://github.com/octocat-http" }, // not https
            { username: "octocat", profileUrl: "https://evil.example/octocat" }, // wrong host
            ...Array.from("abcdefghijklmnopqrstuvwxyz", (ch) => ({ username: `octocat${ch}`, profileUrl: `https://github.com/octocat${ch}` })),
        ];
        const out = normaliseProfiles(provider, raws, "octocat", "2026-01-01T00:00:00Z");
        assert.equal(out[0].matchKind, "exact");
        assert.equal(out.length, 10);
        assert.equal(new Set(out.map((o) => o.profileUrl)).size, out.length);
        assert.ok(out.every((o) => o.profileUrl.startsWith("https://github.com/")));
    });
    it("sanitises hostile profile text and javascript: websites", () => {
        const [m] = normaliseProfiles(provider, [{
            username: "octocat", profileUrl: "https://github.com/octocat",
            profile: { bio: "a\u0007b".repeat(400), website: "javascript:alert(1)", followers: -3, accountCreatedAt: "garbage" },
        }], "octocat", "t");
        assert.ok(m.profile.bio!.length <= 500);
        assert.ok(!/[\u0000-\u001f]/.test(m.profile.bio!));
        assert.equal(m.profile.website, undefined);
        assert.equal(m.profile.followers, undefined);
        assert.equal(m.profile.accountCreatedAt, undefined);
    });
});
