/**
 * Envelope returned by every IPC call.
 *
 * Errors thrown inside Electron's main process lose their type and have their
 * message mangled when they cross `ipcRenderer.invoke`. Returning a plain,
 * serialisable envelope instead keeps error handling predictable and means
 * internal details (SQL, file paths, stack traces) never reach the renderer.
 */
export type ErrorCode =
    | "VALIDATION" // input rejected; see `fields`
    | "NOT_FOUND" // record does not exist
    | "DATABASE" // storage failure (details are logged in main only)
    | "UNTRUSTED_SENDER" // IPC call came from an unexpected frame
    | "INTERNAL"; // anything unexpected

export interface IpcError {
    code: ErrorCode;
    /** Safe, user-presentable message. */
    message: string;
    /** Per-field validation messages when `code === "VALIDATION"`. */
    fields?: Record<string, string>;
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: IpcError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (error: IpcError): Result<never> => ({ ok: false, error });
