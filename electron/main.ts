import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import { createDefaultProviders } from "../engine/providers";
import { SearchManager } from "../engine/search-manager";
import { InvestigationRepository, openDatabase, type Database } from "./database";
import { registerIpcHandlers } from "./ipc";
import { DEV_SERVER_URL, lockDownSession, lockDownWindow } from "./security/permissions";
import { EnvCredentialStore } from "./security/credentials";

let database: Database | undefined;

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });

    lockDownWindow(mainWindow);

    if (app.isPackaged) {
        // dist-electron/electron/main.js -> dist/index.html
        mainWindow.loadFile(path.join(__dirname, "..", "..", "dist", "index.html"));
    } else {
        mainWindow.loadURL(DEV_SERVER_URL);
    }
};

app.whenReady().then(() => {
    // Investigations live in a SQLite file in the OS's per-user app-data folder:
    //   Windows  %APPDATA%\TRACEPOINT\tracepoint.db
    //   macOS    ~/Library/Application Support/TRACEPOINT/tracepoint.db
    try {
        database = openDatabase(path.join(app.getPath("userData"), "tracepoint.db"));
    } catch (error) {
        console.error("[tracepoint] could not open database:", (error as { cause?: unknown }).cause ?? error);
        dialog.showErrorBox(
            "Tracepoint can't open its database",
            "Your investigations are stored locally and Tracepoint couldn't open them, so it will close without changing anything. " +
                "If this keeps happening, check that you have free disk space and that no other copy of Tracepoint is running.",
        );
        app.quit();
        return;
    }

    lockDownSession();
    registerIpcHandlers({
        investigations: new InvestigationRepository(database),
        search: new SearchManager(createDefaultProviders(), {
            credentials: new EnvCredentialStore(),
            log: (message, error) => console.error(`[tracepoint] ${message}:`, error),
        }),
    });

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("before-quit", () => {
    database?.close();
    database = undefined;
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
