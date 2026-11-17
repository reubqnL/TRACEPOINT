import { ipcMain } from "electron";
import type { IpcChannel } from "../../shared/ipc";
import { fail, ok, type Result } from "../../shared/result";
import { isTrustedSender } from "../security/permissions";
import { toFailure } from "./to-result";

/**
 * Registers an IPC handler that (1) rejects untrusted senders, (2) always
 * resolves with a Result envelope instead of throwing across the process
 * boundary. Arguments arrive as `unknown`: every handler validates its own.
 */
export function handle<T>(channel: IpcChannel, fn: (...args: unknown[]) => T | Promise<T>): void {
    ipcMain.handle(channel, async (event, ...args): Promise<Result<T>> => {
        if (!isTrustedSender(event)) return fail({ code: "UNTRUSTED_SENDER", message: "Request blocked." });
        try {
            return ok(await fn(...args));
        } catch (error) {
            return toFailure(error);
        }
    });
}
