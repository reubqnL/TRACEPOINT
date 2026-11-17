/**
 * IPC channel names.
 *
 * The preload script runs sandboxed and cannot `require()` other files, so it
 * can only `import type` from here. Making the channels a string-literal union
 * means the literals written in preload.ts are still checked by the compiler.
 */
export const IPC_CHANNELS = {
    investigationsCreate: "investigations:create",
    investigationsList: "investigations:list",
    investigationsGet: "investigations:get",
    investigationsUpdate: "investigations:update",
    investigationsDelete: "investigations:delete",
    searchProviders: "search:providers",
    searchRun: "search:run",
    searchCancel: "search:cancel",
    openProfile: "app:open-profile",
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];
