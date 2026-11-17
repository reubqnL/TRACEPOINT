import { ProviderError } from "./errors";

/** Longest we will ever back off for, whatever a platform asks. */
const MAX_COOLDOWN_SECONDS = 60 * 60;

export type Sleep = (ms: number, signal: AbortSignal) => Promise<void>;

export const defaultSleep: Sleep = (ms, signal) =>
    new Promise((resolve, reject) => {
        if (signal.aborted) return reject(new ProviderError("cancelled", "Search cancelled."));
        const timer = setTimeout(() => {
            signal.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new ProviderError("cancelled", "Search cancelled."));
        };
        signal.addEventListener("abort", onAbort, { once: true });
    });

/**
 * Per-platform politeness gate. Every outgoing request to a platform passes
 * through `acquire()`, which:
 *   1. refuses immediately while the platform has told us to back off, and
 *   2. serialises requests and spaces them at least `minIntervalMs` apart.
 *
 * One instance lives per provider for the life of the app, so limits are
 * honoured across searches, not just within one.
 */
export class RequestScheduler {
    private nextSlotAt = 0;
    private cooldownUntil = 0;
    private tail: Promise<void> = Promise.resolve();

    constructor(
        private readonly minIntervalMs: number,
        private readonly now: () => number = Date.now,
        private readonly sleep: Sleep = defaultSleep,
    ) {}

    /** Whole seconds left in the current back-off, or 0. */
    cooldownRemainingSeconds(): number {
        return Math.max(0, Math.ceil((this.cooldownUntil - this.now()) / 1000));
    }

    /** Back off for `seconds` (clamped). Never shortens an existing back-off. */
    setCooldown(seconds: number): number {
        const clamped = Math.min(Math.max(1, Math.ceil(seconds)), MAX_COOLDOWN_SECONDS);
        this.cooldownUntil = Math.max(this.cooldownUntil, this.now() + clamped * 1000);
        return this.cooldownRemainingSeconds();
    }

    acquire(signal: AbortSignal): Promise<void> {
        const turn = this.tail.then(async () => {
            if (signal.aborted) throw new ProviderError("cancelled", "Search cancelled.");

            const cooldown = this.cooldownRemainingSeconds();
            if (cooldown > 0) {
                throw new ProviderError(
                    "rate_limited",
                    `The platform asked Tracepoint to slow down. Try again in about ${formatWait(cooldown)}.`,
                    cooldown,
                );
            }

            const wait = this.nextSlotAt - this.now();
            if (wait > 0) await this.sleep(wait, signal);
            this.nextSlotAt = this.now() + this.minIntervalMs;
        });
        // Keep the chain alive even when this turn fails.
        this.tail = turn.catch(() => undefined);
        return turn;
    }
}

export function formatWait(seconds: number): string {
    if (seconds < 90) return `${seconds} second${seconds === 1 ? "" : "s"}`;
    const minutes = Math.ceil(seconds / 60);
    return minutes < 90 ? `${minutes} minutes` : `${Math.ceil(minutes / 60)} hours`;
}
