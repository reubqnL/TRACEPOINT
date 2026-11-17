import type { CredentialStore } from "../../engine/providers/types";

/**
 * Where API credentials come from. For now: environment variables, e.g.
 *     TRACEPOINT_REDDIT_CLIENT_ID=... npm run dev
 *
 * Credentials stay in the main process. They are never sent to the renderer
 * (the UI only learns whether a platform is "configured"), never logged, and
 * never written to the investigation database.
 *
 * Follow-up: a Settings screen backed by Electron's `safeStorage` (OS keychain
 * encryption) can implement the same `CredentialStore` interface.
 */
const ENV_VARS: Readonly<Record<string, string>> = {
    "github.token": "TRACEPOINT_GITHUB_TOKEN",
    "reddit.clientId": "TRACEPOINT_REDDIT_CLIENT_ID",
    "reddit.clientSecret": "TRACEPOINT_REDDIT_CLIENT_SECRET",
};

export class EnvCredentialStore implements CredentialStore {
    constructor(private readonly env: NodeJS.ProcessEnv = process.env) {}

    get(key: string): string | undefined {
        const name = ENV_VARS[key];
        return (name && this.env[name]?.trim()) || undefined;
    }
}
