import type { MatchKind } from "../shared/types/investigation";

/** Minimum string similarity for a non-identical username to be reported as "similar". */
export const SIMILAR_THRESHOLD = 0.8;

export interface UsernameComparison {
    kind: MatchKind | "none";
    /** 0–1. */
    similarity: number;
    /** Exact only when letter case is ignored (e.g. "Octocat" vs "octocat"). */
    caseDiffers: boolean;
}

const clean = (s: string) => s.normalize("NFKC").trim().replace(/^@/, "");
const stripSeparators = (s: string) => s.replace(/[._-]/g, "");
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Classic edit distance (insert/delete/substitute), O(n·m) time, O(min) memory. */
export function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    if (a.length < b.length) [a, b] = [b, a]; // keep the row short

    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const current = [i];
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
        }
        previous = current;
    }
    return previous[b.length];
}

/** 1 − (edit distance ÷ longer length). 1 = identical, 0 = nothing in common. */
export function ratio(a: string, b: string): number {
    const longest = Math.max(a.length, b.length);
    return longest === 0 ? 1 : 1 - levenshtein(a, b) / longest;
}

/**
 * Compares the username the user searched for with one a platform returned.
 *
 *   exact    identical, or identical ignoring letter case
 *   similar  equal once "." "_" "-" are removed (john_doe ≈ johndoe, 0.95),
 *            or edit-distance similarity ≥ SIMILAR_THRESHOLD
 *   none     anything else
 */
export function compareUsernames(query: string, candidate: string): UsernameComparison {
    const q = clean(query);
    const c = clean(candidate);
    if (!q || !c) return { kind: "none", similarity: 0, caseDiffers: false };

    if (q === c) return { kind: "exact", similarity: 1, caseDiffers: false };

    const ql = q.toLowerCase();
    const cl = c.toLowerCase();
    if (ql === cl) return { kind: "exact", similarity: 1, caseDiffers: true };

    const qs = stripSeparators(ql);
    const cs = stripSeparators(cl);
    if (qs && qs === cs) return { kind: "similar", similarity: 0.95, caseDiffers: false };

    const similarity = round2(Math.max(ratio(ql, cl), qs && cs ? ratio(qs, cs) : 0));
    return similarity >= SIMILAR_THRESHOLD
        ? { kind: "similar", similarity, caseDiffers: false }
        : { kind: "none", similarity, caseDiffers: false };
}
