/**
 * Platforms an investigation's username may have originated from.
 *
 * This list is deliberately wider than the list of platforms Tracepoint can
 * *search* (see engine/providers). Some platforms, such as Discord, offer no
 * public username lookup, so they can be an origin but never a search target.
 *
 * Stored in SQLite as the plain `id` string (no CHECK constraint) so adding a
 * platform never needs a database migration.
 */
export const ORIGIN_PLATFORMS = [
    { id: "discord", label: "Discord" },
    { id: "reddit", label: "Reddit" },
    { id: "github", label: "GitHub" },
    { id: "gitlab", label: "GitLab" },
    { id: "hackernews", label: "Hacker News" },
    { id: "x", label: "X (Twitter)" },
    { id: "instagram", label: "Instagram" },
    { id: "tiktok", label: "TikTok" },
    { id: "twitch", label: "Twitch" },
    { id: "steam", label: "Steam" },
    { id: "youtube", label: "YouTube" },
    { id: "other", label: "Other" },
] as const;

export type PlatformId = (typeof ORIGIN_PLATFORMS)[number]["id"];

export const PLATFORM_IDS: readonly PlatformId[] = ORIGIN_PLATFORMS.map((p) => p.id);

export function isPlatformId(value: unknown): value is PlatformId {
    return typeof value === "string" && (PLATFORM_IDS as readonly string[]).includes(value);
}

export function platformLabel(id: string): string {
    return ORIGIN_PLATFORMS.find((p) => p.id === id)?.label ?? id;
}
