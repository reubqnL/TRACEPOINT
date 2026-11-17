import { shell } from "electron";
import type { SearchManager } from "../../engine/search-manager";
import { IPC_CHANNELS } from "../../shared/ipc";
import type { SearchRequest } from "../../shared/types/search";
import { ValidationError } from "../errors";
import { handle } from "./handle";

export function registerSearchIpc(manager: SearchManager): void {
    handle(IPC_CHANNELS.searchProviders, () => manager.listProviders());

    // The manager validates the request itself; it never trusts the renderer.
    handle(IPC_CHANNELS.searchRun, (request) => manager.search(request as SearchRequest));

    handle(IPC_CHANNELS.searchCancel, (searchId) => {
        if (typeof searchId === "string") manager.cancel(searchId);
        return null;
    });

    handle(IPC_CHANNELS.openProfile, async (url) => {
        // Only https profile pages on platforms Tracepoint knows about, so a
        // compromised renderer can't use this to launch arbitrary URLs/apps.
        if (typeof url !== "string" || !manager.isKnownProfileUrl(url)) {
            throw new ValidationError({ url: "That link can't be opened." });
        }
        await shell.openExternal(url);
        return null;
    });
}
