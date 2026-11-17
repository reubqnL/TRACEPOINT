import { app, session, type BrowserWindow, type IpcMainInvokeEvent } from "electron";

export const DEV_SERVER_URL = "http://localhost:5173";

/** Is `url` one of the pages Tracepoint itself serves (Vite in dev, bundled files when packaged)? */
export function isTrustedUrl(url: string): boolean {
    return app.isPackaged ? url.startsWith("file://") : url === DEV_SERVER_URL || url.startsWith(`${DEV_SERVER_URL}/`);
}

/** IPC is only honoured from our own top-level page, never from an iframe or navigated-away content. */
export function isTrustedSender(event: IpcMainInvokeEvent): boolean {
    const frame = event.senderFrame;
    return frame !== null && frame.parent === null && isTrustedUrl(frame.url);
}

export function lockDownWindow(window: BrowserWindow): void {
    // No pop-up windows; external links go through the validated `openProfile` IPC call instead.
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event, url) => {
        if (!isTrustedUrl(url)) event.preventDefault();
    });
}

/** Tracepoint needs no camera, microphone, geolocation, notifications, etc. */
export function lockDownSession(): void {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
}
