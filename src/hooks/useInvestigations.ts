import { useCallback, useEffect, useState } from "react";
import type { CreateInvestigationInput, Investigation, UpdateInvestigationInput } from "../../shared/types/investigation";
import { errorMessage, investigationsApi } from "../lib/api";

const byRecentlyUpdated = (a: Investigation, b: Investigation) => b.updatedAt.localeCompare(a.updatedAt);

/**
 * Investigations as stored in the local SQLite database. The database is the
 * source of truth; this hook just mirrors it into React state.
 *
 * `create`, `update` and `remove` throw an `ApiError` on failure so the caller
 * (e.g. a form) can show field-level messages. `error` is only for load failures.
 */
export function useInvestigations() {
    const [investigations, setInvestigations] = useState<Investigation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const reload = useCallback(async () => {
        try {
            setInvestigations(await investigationsApi.list());
            setError(null);
        } catch (e) {
            setError(errorMessage(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    const create = useCallback(async (input: CreateInvestigationInput) => {
        const created = await investigationsApi.create(input);
        setInvestigations((prev) => [created, ...prev]);
        return created;
    }, []);

    const update = useCallback(async (id: string, patch: UpdateInvestigationInput) => {
        const updated = await investigationsApi.update(id, patch);
        setInvestigations((prev) => prev.map((i) => (i.id === id ? updated : i)).sort(byRecentlyUpdated));
        return updated;
    }, []);

    const remove = useCallback(async (id: string) => {
        try {
            await investigationsApi.remove(id);
        } catch (e) {
            await reload(); // e.g. already deleted elsewhere: resync, then let the caller report it
            throw e;
        }
        setInvestigations((prev) => prev.filter((i) => i.id !== id));
    }, [reload]);

    return { investigations, loading, error, reload, create, update, remove };
}
