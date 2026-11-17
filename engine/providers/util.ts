import { ProviderError } from "../errors";
import type { RateLimitInfo } from "./types";

export const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

export const str = (v: unknown): string | undefined => (typeof v === "string" && v ? v : undefined);
export const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** Reads `x-ratelimit-remaining` + a reset header that is either an epoch or a delta. */
export function readRateLimit(
    headers: Headers,
    names: { remaining: string; reset: string; resetIs: "epoch" | "delta" },
    nowSeconds = Date.now() / 1000,
): RateLimitInfo | undefined {
    const remaining = Number(headers.get(names.remaining));
    const reset = Number(headers.get(names.reset));
    const info: RateLimitInfo = {};
    if (headers.get(names.remaining) !== null && Number.isFinite(remaining)) info.remaining = remaining;
    if (headers.get(names.reset) !== null && Number.isFinite(reset)) {
        info.resetInSeconds = Math.max(1, names.resetIs === "epoch" ? reset - nowSeconds : reset);
    }
    return info.remaining === undefined && info.resetInSeconds === undefined ? undefined : info;
}

/**
 * Runs an optional extra step (e.g. a similar-name search). If it fails for a
 * recoverable reason the provider still returns what it already found, with a
 * note explaining the gap. Cancellation and timeouts always propagate.
 */
export async function optionalStep<T>(
    label: string,
    notes: string[],
    step: () => Promise<T>,
): Promise<T | undefined> {
    try {
        return await step();
    } catch (error) {
        if (error instanceof ProviderError && error.kind !== "cancelled" && error.kind !== "timeout") {
            notes.push(`${label}: ${error.message}`);
            return undefined;
        }
        throw error;
    }
}
