// currently just an example of what it should look like in the future

import {
    ArrowRight,
    Globe,
    UserRound,
    Search,
    MoreHorizontal,
    Clock3
} from "lucide-react";

const investigations = [
    {
        name: "Example Username Search",
        description: "@exampleuser",
        type: "Username",
        icon: UserRound,
        updated: "2 hours ago",
        status: "Active"
    },
    {
        name: "Example Domain Lookup",
        description: "example.com",
        type: "Domain",
        icon: Globe,
        updated: "Yesterday",
        status: "Completed"
    },
    {
        name: "Example Profile Search",
        description: "Public profile investigation",
        type: "Public Profile",
        icon: Search,
        updated: "3 days ago",
        status: "Paused"
    }
];

function RecentInvestigations() {
    return (
        <section className="recent-investigations">

            <div className="recent-investigations-header">
                <div>
                    <h2>Recent Investigations</h2>
                    <p>Continue where you left off.</p>
                </div>

                <button className="recent-investigations-view-all">
                    View all
                    <ArrowRight size={16} />
                </button>
            </div>

            <hr />

            <div className="recent-investigations-table">

                <div className="recent-investigations-table-header">
                    <span>Investigation</span>
                    <span>Type</span>
                    <span>Last updated</span>
                    <span>Status</span>
                    <span></span>
                </div>

                {investigations.map((investigation) => {
                    const Icon = investigation.icon;

                    return (
                        <div
                            className="recent-investigations-row"
                            key={investigation.name}
                        >
                            <div className="recent-investigations-name">
                                <div className="recent-investigations-icon">
                                    <Icon size={18} />
                                </div>

                                <div>
                                    <h3>{investigation.name}</h3>
                                    <p>{investigation.description}</p>
                                </div>
                            </div>

                            <span className="recent-investigations-type">
                                {investigation.type}
                            </span>

                            <span className="recent-investigations-updated">
                                <Clock3 size={14} />
                                {investigation.updated}
                            </span>

                            <span
                                className={`recent-investigations-status recent-investigations-status-${investigation.status.toLowerCase()}`}
                            >
                                {investigation.status}
                            </span>

                            <button
                                className="recent-investigations-more"
                                aria-label={`More options for ${investigation.name}`}
                            >
                                <MoreHorizontal size={19} />
                            </button>
                        </div>
                    );
                })}

            </div>
        </section>
    );
}

export default RecentInvestigations;