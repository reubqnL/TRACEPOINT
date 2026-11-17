import type { Result } from "./result";
import type {
    CreateInvestigationInput,
    Investigation,
    UpdateInvestigationInput,
} from "./types/investigation";
import type { ProviderInfo, SearchRequest, SearchResponse } from "./types/search";

/** The complete surface the renderer can reach: `window.tracepoint`. */
export interface TracepointApi {
    platform: string;
    investigations: {
        create(input: CreateInvestigationInput): Promise<Result<Investigation>>;
        list(): Promise<Result<Investigation[]>>;
        get(id: string): Promise<Result<Investigation>>;
        update(id: string, patch: UpdateInvestigationInput): Promise<Result<Investigation>>;
        delete(id: string): Promise<Result<{ id: string }>>;
    };
    search: {
        providers(): Promise<Result<ProviderInfo[]>>;
        run(request: SearchRequest): Promise<Result<SearchResponse>>;
        cancel(searchId: string): Promise<Result<null>>;
    };
    /** Opens a discovered profile in the system browser (main validates the URL). */
    openProfile(url: string): Promise<Result<null>>;
}
