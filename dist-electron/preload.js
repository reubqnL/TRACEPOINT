"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("tracepoint", {
    platform: process.platform,
});
//# sourceMappingURL=preload.js.map