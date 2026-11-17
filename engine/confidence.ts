import type { UsernameComparison } from "./similarity";

/**
 * Strength of a *username* match, 0–1.
 *
 *   exact, same case      1.00
 *   exact, case differs   0.95
 *   similar               similarity × 0.9, capped at 0.89 so a similar
 *                         match can never outrank an exact one
 *
 * This is deliberately NOT a probability that two accounts belong to the same
 * person. Handles are routinely reused or coincidentally shared, so the score
 * says how closely the names agree and nothing about who is behind them.
 */
export function computeConfidence(match: Pick<UsernameComparison, "kind" | "similarity" | "caseDiffers">): number {
    if (match.kind === "exact") return match.caseDiffers ? 0.95 : 1;
    if (match.kind === "similar") return Math.round(Math.min(0.89, match.similarity * 0.9) * 100) / 100;
    return 0;
}
