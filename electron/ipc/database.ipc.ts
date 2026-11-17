import { IPC_CHANNELS } from "../../shared/ipc";
import { isValidId } from "../../shared/validation";
import type { InvestigationRepository } from "../database/investigations.repository";
import { ValidationError } from "../errors";
import { handle } from "./handle";

function requireId(id: unknown): string {
    if (!isValidId(id)) throw new ValidationError({ id: "Invalid investigation id." });
    return id;
}

export function registerDatabaseIpc(repo: InvestigationRepository): void {
    handle(IPC_CHANNELS.investigationsCreate, (input) => repo.create(input));
    handle(IPC_CHANNELS.investigationsList, () => repo.getAll());
    handle(IPC_CHANNELS.investigationsGet, (id) => repo.getById(requireId(id)));
    handle(IPC_CHANNELS.investigationsUpdate, (id, patch) => repo.update(requireId(id), patch));
    handle(IPC_CHANNELS.investigationsDelete, (id) => {
        const valid = requireId(id);
        repo.delete(valid);
        return { id: valid };
    });
}
