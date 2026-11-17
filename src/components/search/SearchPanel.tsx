import { ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { platformLabel } from "../../../shared/platforms";
import type { Investigation } from "../../../shared/types/investigation";
import type { ProfileMatch, ProviderResult, ProviderStatus, SearchResponse } from "../../../shared/types/search";
import { errorMessage, searchApi } from "../../lib/api";
import { formatDate } from "../../lib/format";

type Props = { investigation: Investigation; onClose: () => void };

const STATUS_LABEL: Record<ProviderStatus, string> = {
    ok: "Searched",
    rate_limited: "Rate limited",
    unavailable: "Unavailable",
    unauthorized: "Access denied",
    not_configured: "Not set up",
    timeout: "Timed out",
    cancelled: "Cancelled",
    error: "Error",
    skipped: "Skipped",
};

function MatchRow({ match }: { match: ProfileMatch }) {
    const [openError, setOpenError] = useState<string | null>(null);
    const { profile } = match;
    const details = [
        profile.displayName,
        profile.location,
        profile.followers !== undefined ? `${profile.followers.toLocaleString()} followers` : undefined,
        profile.accountCreatedAt ? `Joined ${formatDate(profile.accountCreatedAt)}` : undefined,
    ].filter(Boolean);

    return (
        <li className="match-row">
            <div className="match-row-head">
                <button
                    className="match-link"
                    onClick={() => searchApi.openProfile(match.profileUrl).catch((e) => setOpenError(errorMessage(e)))}
                    title={match.profileUrl}
                >
                    @{match.username} <ExternalLink size={12} />
                </button>
                <span className={`badge badge-${match.matchKind}`}>
                    {match.matchKind === "exact" ? (match.caseDiffers ? "Exact (case differs)" : "Exact match") : "Similar"}
                </span>
                <span className="match-strength" title="How closely the usernames agree. This is not proof that the accounts share an owner.">
                    Name match {Math.round(match.confidence * 100)}%
                </span>
            </div>
            {details.length > 0 && <p className="match-details">{details.join(" · ")}</p>}
            {profile.bio && <p className="match-bio">{profile.bio}</p>}
            {profile.website && <p className="match-details">{profile.website}</p>}
            {openError && <p className="field-error" role="alert">{openError}</p>}
        </li>
    );
}

function ProviderBlock({ result }: { result: ProviderResult }) {
    const noMatches = result.status === "ok" && result.matches.length === 0;
    return (
        <section className="provider-block">
            <header>
                <h4>{result.platformLabel}</h4>
                <span className={`pill pill-${result.status}`}>{STATUS_LABEL[result.status]}</span>
            </header>
            {noMatches && <p className="provider-note">No matching profiles found.</p>}
            {result.message && <p className="provider-note">{result.message}</p>}
            {result.matches.length > 0 && (
                <ul className="match-list">
                    {result.matches.map((m) => <MatchRow key={m.id} match={m} />)}
                </ul>
            )}
        </section>
    );
}

function SearchPanel({ investigation, onClose }: Props) {
    const [phase, setPhase] = useState<"running" | "done" | "failed">("running");
    const [response, setResponse] = useState<SearchResponse | null>(null);
    const [failure, setFailure] = useState<string | null>(null);
    const [includeOrigin, setIncludeOrigin] = useState(false);
    const activeId = useRef<string | null>(null);

    const run = useCallback(async (withOrigin: boolean) => {
        const searchId = crypto.randomUUID();
        activeId.current = searchId;
        setPhase("running");
        setFailure(null);
        try {
            const result = await searchApi.run({
                searchId,
                username: investigation.username,
                originPlatform: investigation.platform,
                includeOriginPlatform: withOrigin,
            });
            if (activeId.current !== searchId) return; // superseded or closed
            setResponse(result);
            setPhase("done");
        } catch (e) {
            if (activeId.current !== searchId) return;
            setFailure(errorMessage(e));
            setPhase("failed");
        }
    }, [investigation.username, investigation.platform]);

    // Search when opened; cancel whatever is in flight when closed.
    useEffect(() => {
        void run(false);
        return () => {
            const id = activeId.current;
            activeId.current = null;
            if (id) void searchApi.cancel(id).catch(() => undefined);
        };
    }, [run]);

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="investigation-modal-overlay">
            <div className="investigation-modal wide" role="dialog" aria-modal="true" aria-labelledby="search-title">
                <div className="search-head">
                    <div>
                        <h2 id="search-title">Search for @{investigation.username}</h2>
                        <p>Looking for matching public profiles. Originally seen on {platformLabel(investigation.platform)}.</p>
                    </div>
                    <button className="icon-button" onClick={onClose} aria-label="Close"><X size={16} /></button>
                </div>

                <label className="checkbox-row">
                    <input
                        type="checkbox"
                        checked={includeOrigin}
                        disabled={phase === "running"}
                        onChange={(e) => { setIncludeOrigin(e.target.checked); void run(e.target.checked); }}
                    />
                    Also search {platformLabel(investigation.platform)} (where this username came from)
                </label>

                <div className="search-results" aria-live="polite">
                    {phase === "running" && (
                        <div className="search-running">
                            <p>Searching platforms politely — requests are spaced out to respect each platform's limits…</p>
                            <button onClick={() => activeId.current && void searchApi.cancel(activeId.current)}>Cancel search</button>
                        </div>
                    )}
                    {phase === "failed" && <p className="field-error" role="alert">{failure}</p>}
                    {phase === "done" && response?.results.map((r) => <ProviderBlock key={r.providerId} result={r} />)}
                </div>

                <p className="search-disclaimer">
                    A matching username doesn't mean two accounts belong to the same person. Verify results independently and
                    respect each platform's terms. Results aren't saved yet.
                </p>
            </div>
        </div>
    );
}

export default SearchPanel;
