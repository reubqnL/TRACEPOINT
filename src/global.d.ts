import type { TracepointApi } from "../shared/api";

declare global {
    interface Window {
        /** Injected by electron/preload.ts. Undefined when the UI is opened in a plain browser. */
        tracepoint?: TracepointApi;
    }
}

export {};
