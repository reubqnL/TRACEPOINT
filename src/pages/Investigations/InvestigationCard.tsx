import { Pencil, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { platformLabel } from "../../../shared/platforms";
import { INVESTIGATION_STATUSES, type Investigation, type InvestigationStatus } from "../../../shared/types/investigation";
import { capitalise, formatDate } from "../../lib/format";

type Props = {
    investigation: Investigation;
    onSearch: (investigation: Investigation) => void;
    onEdit: (investigation: Investigation) => void;
    onStatusChange: (investigation: Investigation, status: InvestigationStatus) => void;
    onDelete: (investigation: Investigation) => void;
};

function InvestigationCard({ investigation, onSearch, onEdit, onStatusChange, onDelete }: Props) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    return (
        <article className="investigation-card">
            <div className="investigation-card-main">
                <h3>{investigation.name}</h3>
                <p className="investigation-card-meta">
                    <strong>@{investigation.username}</strong> · from {platformLabel(investigation.platform)}
                </p>
                <p className="investigation-card-dates">
                    Created {formatDate(investigation.createdAt)} · Updated {formatDate(investigation.updatedAt)}
                </p>
            </div>

            <div className="investigation-card-actions">
                <select
                    className={`status-select status-${investigation.status}`}
                    value={investigation.status}
                    aria-label={`Status of ${investigation.name}`}
                    onChange={(e) => onStatusChange(investigation, e.target.value as InvestigationStatus)}
                >
                    {INVESTIGATION_STATUSES.map((s) => (
                        <option key={s} value={s}>{capitalise(s)}</option>
                    ))}
                </select>

                {confirmingDelete ? (
                    <>
                        <button className="danger" onClick={() => onDelete(investigation)}>Delete permanently</button>
                        <button onClick={() => setConfirmingDelete(false)}>Keep</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => onSearch(investigation)}><Search size={14} /> Search</button>
                        <button onClick={() => onEdit(investigation)} aria-label={`Edit ${investigation.name}`}><Pencil size={14} /></button>
                        <button onClick={() => setConfirmingDelete(true)} aria-label={`Delete ${investigation.name}`}><Trash2 size={14} /></button>
                    </>
                )}
            </div>
        </article>
    );
}

export default InvestigationCard;
