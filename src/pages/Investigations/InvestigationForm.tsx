import { useEffect, useState, type FormEvent } from "react";
import { ORIGIN_PLATFORMS, type PlatformId } from "../../../shared/platforms";
import { INVESTIGATION_STATUSES, type Investigation, type InvestigationStatus } from "../../../shared/types/investigation";
import { validateCreateInvestigation } from "../../../shared/validation";
import { ApiError, errorMessage } from "../../lib/api";
import { capitalise } from "../../lib/format";

export interface InvestigationFormValues {
    name: string;
    username: string;
    platform: PlatformId;
    status: InvestigationStatus;
}

type Props = {
    /** Pass an investigation to edit it; omit to create a new one. */
    investigation?: Investigation;
    onSubmit: (values: InvestigationFormValues) => Promise<void>;
    onClose: () => void;
};

function InvestigationForm({ investigation, onSubmit, onClose }: Props) {
    const editing = investigation !== undefined;
    const [name, setName] = useState(investigation?.name ?? "");
    const [username, setUsername] = useState(investigation?.username ?? "");
    const [platform, setPlatform] = useState<PlatformId>(investigation?.platform ?? "discord");
    const [status, setStatus] = useState<InvestigationStatus>(investigation?.status ?? "active");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && !saving && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose, saving]);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); // dev note, pls keep this to stop page refresh

        // Same rules the main process enforces, so most mistakes are caught instantly.
        const checked = validateCreateInvestigation({ name, username, platform, status });
        if (!checked.ok) return setErrors(checked.fields);

        setSaving(true);
        setErrors({});
        try {
            await onSubmit(checked.value);
        } catch (e) {
            setErrors(e instanceof ApiError && e.fields ? e.fields : { _: errorMessage(e) });
            setSaving(false);
        }
    }

    return (
        <div className="investigation-modal-overlay">
            <div className="investigation-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <h2 id="modal-title">{editing ? "Edit Investigation" : "New Investigation"}</h2>
                <p>
                    {editing
                        ? "Update the details of this investigation."
                        : "Tell Tracepoint who and where you're starting from."}
                </p>

                <form onSubmit={submit} noValidate>
                    <label htmlFor="investigation-name">Investigation name</label>
                    <input
                        id="investigation-name"
                        type="text"
                        placeholder="e.g. Username Research"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        aria-invalid={Boolean(errors.name)}
                        autoFocus
                    />
                    {errors.name && <span className="field-error" role="alert">{errors.name}</span>}

                    <label htmlFor="investigation-username">Username being researched</label>
                    <input
                        id="investigation-username"
                        type="text"
                        placeholder="e.g. octocat"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        aria-invalid={Boolean(errors.username)}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {errors.username && <span className="field-error" role="alert">{errors.username}</span>}

                    <label htmlFor="investigation-platform">Original platform</label>
                    <select id="investigation-platform" value={platform} onChange={(e) => setPlatform(e.target.value as PlatformId)}>
                        {ORIGIN_PLATFORMS.map((p) => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                    </select>
                    {errors.platform && <span className="field-error" role="alert">{errors.platform}</span>}

                    {editing && (
                        <>
                            <label htmlFor="investigation-status">Status</label>
                            <select id="investigation-status" value={status} onChange={(e) => setStatus(e.target.value as InvestigationStatus)}>
                                {INVESTIGATION_STATUSES.map((s) => (
                                    <option key={s} value={s}>{capitalise(s)}</option>
                                ))}
                            </select>
                        </>
                    )}

                    {errors._ && <span className="field-error form-error" role="alert">{errors._}</span>}

                    <div className="investigation-modal-actions">
                        <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
                        <button type="submit" disabled={saving}>
                            {saving ? "Saving…" : editing ? "Save changes" : "Create Investigation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default InvestigationForm;
