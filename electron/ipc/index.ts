import type { SearchManager } from "../../engine/search-manager";
import type { InvestigationRepository } from "../database/investigations.repository";
import { registerDatabaseIpc } from "./database.ipc";
import { registerSearchIpc } from "./search.ipc";

export function registerIpcHandlers(deps: { investigations: InvestigationRepository; search: SearchManager }): void {
    registerDatabaseIpc(deps.investigations);
    registerSearchIpc(deps.search);
}
