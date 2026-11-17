import type { ErrorCode } from "../shared/result";
import type { FieldErrors } from "../shared/validation";

export class TracepointError extends Error {
    constructor(
        readonly code: ErrorCode,
        message: string,
        readonly fields?: FieldErrors,
    ) {
        super(message);
        this.name = new.target.name;
    }
}

export class ValidationError extends TracepointError {
    constructor(fields: FieldErrors) {
        super("VALIDATION", "Some details need fixing.", fields);
    }
}

export class NotFoundError extends TracepointError {
    constructor(what: string, id: string) {
        super("NOT_FOUND", `${what} not found.`);
        // The id is kept out of the user-facing message but useful in logs.
        this.cause = id;
    }
}

/** Wraps any storage failure. The original error is kept as `cause` for logging only. */
export class DatabaseError extends TracepointError {
    constructor(cause: unknown) {
        super("DATABASE", "Tracepoint couldn't read or write its local database. Your data has not been changed.");
        this.cause = cause;
    }
}
