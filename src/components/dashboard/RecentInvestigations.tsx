import { ArrowRight, Search } from "lucide-react";

function RecentInvestigations() {
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

            {/* Empty state displayed when there are no investigations */}
            <div className="recent-investigations-table">

                <div className="recent-investigations-empty">
                    <Search size={28} />

                    <h3>No recent investigations</h3>

                    <p>Your recent investigations will appear here once you create one.</p>
                </div>
            </div>
        </section>
    );
}

export default RecentInvestigations;