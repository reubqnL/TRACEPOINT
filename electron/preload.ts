import { contextBridge, ipcRenderer } from "electron";
import type { TracepointApi } from "../shared/api";
import type { IpcChannel } from "../shared/ipc";
import type { Result } from "../shared/result";

// This script is sandboxed: it can't require() local files, so only *types*
// are imported above (erased at compile time) and channel names are written
// as literals. `IpcChannel` makes the compiler reject any that don't match
// shared/ipc.ts.
const invoke = <T>(channel: IpcChannel, ...args: unknown[]): Promise<Result<T>> =>
    ipcRenderer.invoke(channel, ...args);

const api: TracepointApi = {
    platform: process.platform,
    investigations: {
        create: (input) => invoke("investigations:create", input),
        list: () => invoke("investigations:list"),
        get: (id) => invoke("investigations:get", id),
        update: (id, patch) => invoke("investigations:update", id, patch),
        delete: (id) => invoke("investigations:delete", id),
    },
    search: {
        providers: () => invoke("search:providers"),
        run: (request) => invoke("search:run", request),
        cancel: (searchId) => invoke("search:cancel", searchId),
    },
    openProfile: (url) => invoke("app:open-profile", url),
};

// Only this narrow, typed object is exposed. ipcRenderer itself never reaches the page.
contextBridge.exposeInMainWorld("tracepoint", api);
