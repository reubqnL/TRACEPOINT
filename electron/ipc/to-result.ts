import { SearchRequestError } from "../../engine/errors";
import { fail, type Result } from "../../shared/result";
import { TracepointError } from "../errors";

/**
 * Converts anything thrown in the main process into a safe IpcError.
 * Internal details (SQL, paths, stack traces) are logged here and never returned.
 */
export function toFailure(error: unknown, log: (...args: unknown[]) => void = console.error): Result<never> {
    if (error instanceof TracepointError) {
        if (error.code === "DATABASE") log("[tracepoint] database error:", error.cause);
        return fail({ code: error.code, message: error.message, fields: error.fields });
    }
    if (error instanceof SearchRequestError) {
        return fail({ code: "VALIDATION", message: "Some details need fixing.", fields: error.fields });
    }
    log("[tracepoint] unexpected error:", error);
    return fail({ code: "INTERNAL", message: "Something went wrong. Please try again." });
}
