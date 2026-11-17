import type { ProviderStatus } from "../shared/types/search";
import type { FieldErrors } from "../shared/validation";

/** Statuses a provider/HTTP layer can fail with. */
export type ProviderFailure = Extract<
    ProviderStatus,
    "rate_limited" | "unavailable" | "unauthorized" | "timeout" | "cancelled" | "error"
>;

/** A failure a platform search can classify. The manager turns it into a ProviderResult. */
export class ProviderError extends Error {
    constructor(
        readonly kind: ProviderFailure,
        message: string,
        readonly retryAfterSeconds?: number,
    ) {
        super(message);
        this.name = "ProviderError";
    }
}

/** The caller's SearchRequest was invalid. */
export class SearchRequestError extends Error {
    constructor(readonly fields: FieldErrors) {
        super("Invalid search request.");
        this.name = "SearchRequestError";
    }
}
