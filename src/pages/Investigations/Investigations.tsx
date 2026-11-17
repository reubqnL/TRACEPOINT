// attribution: https://headlessui.com/react/dialog

import { useState } from "react";

import type { Investigation, InvestigationStatus } from "../../../shared/types/investigation";
import SearchPanel from "../../components/search/SearchPanel";
import { useInvestigations } from "../../hooks/useInvestigations";
import { errorMessage } from "../../lib/api";
import InvestigationCard from "./InvestigationCard";
import InvestigationForm, { type InvestigationFormValues } from "./InvestigationForm";

type Dialog =
    | { kind: "create" }
    | { kind: "edit"; investigation: Investigation }
    | { kind: "search"; investigation: Investigation }
    | null;

function Investigations() {
    const { investigations, loading, error, reload, create, update, remove } = useInvestigations();
    const [dialog, setDialog] = useState<Dialog>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    async function run(action: () => Promise<unknown>) {
        setActionError(null);
        try {
            await action();
        } catch (e) {
            setActionError(errorMessage(e));
        }
    }

    async function save(values: InvestigationFormValues) {
        // Errors propagate to the form so it can show field-level messages.
        if (dialog?.kind === "edit") {
            const before = dialog.investigation;
            const patch = Object.fromEntries(
                (Object.keys(values) as (keyof InvestigationFormValues)[]).filter((k) => values[k] !== before[k]).map((k) => [k, values[k]]),
            );
            if (Object.keys(patch).length) await update(before.id, patch);
        } else {
            await create(values);
        }
        setDialog(null);
    }

    return (
        <section className="investigations-container">

            <div className="text">
                <h2 className="title">Investigations</h2>
                <p>Manage and organise your username investigations.</p>
            </div>

            <div className="button">
                <button onClick={() => setDialog({ kind: "create" })}>
                    New Investigation
                </button>
            </div>

            {(error || actionError) && (
                <div className="investigations-error" role="alert">
                    <span>{error ?? actionError}</span>
                    {error && <button onClick={() => void reload()}>Try again</button>}
                </div>
            )}

            <div className="investigations-list">
                {loading ? (
                    <div className="investigations-empty"><p>Loading investigations…</p></div>
                ) : investigations.length === 0 && !error ? (
                    <div className="investigations-empty">
                        <h3>No investigations yet</h3>
                        <p>Create your first investigation to get started.</p>
                    </div>
                ) : (
                    investigations.map((investigation) => (
                        <InvestigationCard
                            key={investigation.id}
                            investigation={investigation}
                            onSearch={(i) => setDialog({ kind: "search", investigation: i })}
                            onEdit={(i) => setDialog({ kind: "edit", investigation: i })}
                            onStatusChange={(i, status: InvestigationStatus) => void run(() => update(i.id, { status }))}
                            onDelete={(i) => void run(() => remove(i.id))}
                        />
                    ))
                )}
            </div>

            {(dialog?.kind === "create" || dialog?.kind === "edit") && (
                <InvestigationForm
                    investigation={dialog.kind === "edit" ? dialog.investigation : undefined}
                    onSubmit={save}
                    onClose={() => setDialog(null)}
                />
            )}

            {dialog?.kind === "search" && (
                <SearchPanel investigation={dialog.investigation} onClose={() => setDialog(null)} />
            )}
        </section>
    );
}

export default Investigations;
