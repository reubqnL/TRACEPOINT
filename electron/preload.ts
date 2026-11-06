import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("tracepoint", {
    platform: process.platform,
});