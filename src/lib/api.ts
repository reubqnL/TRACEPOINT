import type { IpcError, Result } from "../../shared/result";
import type { TracepointApi } from "../../shared/api";
import type { CreateInvestigationInput, Investigation, UpdateInvestigationInput } from "../../shared/types/investigation";
import type { ProviderInfo, SearchRequest, SearchResponse } from "../../shared/types/search";

/** Thrown for any failed IPC call. `fields` holds per-field messages for forms. */
export class ApiError extends Error {
    readonly code: IpcError["code"];
    readonly fields?: Record<string, string>;

    constructor(error: IpcError) {
        super(error.message);
        this.name = "ApiError";
        this.code = error.code;
        this.fields = error.fields;
    }
}

function bridge(): TracepointApi {
    if (!window.tracepoint) {
        throw new ApiError({
            code: "INTERNAL",
            message: "Tracepoint's local storage is only available in the desktop app. Start it with “npm run dev”.",
        });
    }
    return window.tracepoint;
}

async function unwrap<T>(call: (api: TracepointApi) => Promise<Result<T>>): Promise<T> {
    const result = await call(bridge());
    if (result.ok) return result.data;
    throw new ApiError(result.error);
}

export const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : "Something went wrong. Please try again.";

export const investigationsApi = {
    list: () => unwrap((api) => api.investigations.list()),
    get: (id: string) => unwrap((api) => api.investigations.get(id)),
    create: (input: CreateInvestigationInput): Promise<Investigation> => unwrap((api) => api.investigations.create(input)),
    update: (id: string, patch: UpdateInvestigationInput): Promise<Investigation> =>
        unwrap((api) => api.investigations.update(id, patch)),
    remove: (id: string) => unwrap((api) => api.investigations.delete(id)),
};

export const searchApi = {
    providers: (): Promise<ProviderInfo[]> => unwrap((api) => api.search.providers()),
    run: (request: SearchRequest): Promise<SearchResponse> => unwrap((api) => api.search.run(request)),
    cancel: (searchId: string) => unwrap((api) => api.search.cancel(searchId)),
    openProfile: (url: string) => unwrap((api) => api.openProfile(url)),
};
