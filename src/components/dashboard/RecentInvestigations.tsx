import { ArrowRight, Search } from "lucide-react";
import { platformLabel } from "../../../shared/platforms";
import { useInvestigations } from "../../hooks/useInvestigations";
import { capitalise, formatDate } from "../../lib/format";

function RecentInvestigations() {
    const { investigations, loading } = useInvestigations();
    const recent = investigations.slice(0, 5); // already newest-updated first

    return (
        <section className="recent-investigations">
            <div className="recent-investigations-header">
                <div>
                    <h2>Recent Investigations</h2>
                    <p>Continue where you left off.</p>
                </div>

                <button className="recent-investigations-view-all">View all<ArrowRight size={16} />
                </button>
            </div>
            <hr />

            <div className="recent-investigations-table">
                {recent.length > 0 ? (
                    <ul className="recent-investigations-list">
                        {recent.map((i) => (
                            <li key={i.id} className="recent-investigations-item">
                                <div>
                                    <h3>{i.name}</h3>
                                    <p>@{i.username} · {platformLabel(i.platform)} · Updated {formatDate(i.updatedAt)}</p>
                                </div>
                                <span className={`status-pill status-${i.status}`}>{capitalise(i.status)}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    // Empty state displayed when there are no investigations
                    <div className="recent-investigations-empty">
                        <Search size={28} />

                        <h3>{loading ? "Loading…" : "No recent investigations"}</h3>

                        {!loading && <p>Your recent investigations will appear here once you create one.</p>}
                    </div>
                )}
            </div>
        </section>
    );
}

export default RecentInvestigations;