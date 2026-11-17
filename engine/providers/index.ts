import { githubProvider } from "./github";
import { gitlabProvider } from "./gitlab";
import { hackerNewsProvider } from "./hackernews";
import { createRedditProvider } from "./reddit";
import type { SearchProvider } from "./types";

/**
 * Registered platform providers, in display order.
 *
 * Platforms with no public, terms-compliant username lookup (Discord,
 * Instagram, TikTok, X, …) are deliberately absent. They can still be chosen
 * as an investigation's *origin* platform. See docs/search-engine.md.
 */
export function createDefaultProviders(): SearchProvider[] {
    return [githubProvider, gitlabProvider, createRedditProvider(), hackerNewsProvider];
}

export type { SearchProvider } from "./types";
