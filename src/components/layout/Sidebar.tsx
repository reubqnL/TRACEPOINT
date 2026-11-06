import { LayoutDashboard, Search, FolderSearch, Bookmark, FileText, Settings, Shield } from "lucide-react";

const navigation = [
    {
        title: "WORKSPACE",
        items: [
            { label: "Dashboard", icon: LayoutDashboard },
            { label: "Search", icon: Search },
            { label: "Investigations", icon: FolderSearch },
        ],
    },
    {
        title: "LIBRARY",
        items: [
            { label: "Bookmarks", icon: Bookmark },
            { label: "Reports", icon: FileText },
        ],
    },
];

function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="sidebar-logo">
                    <Shield size={21} />
                </div>

                <div>
                    <h2>TRACEPOINT</h2>
                    <span>INVESTIGATION WORKSPACE</span>
                </div>
            </div>

            <nav className="sidebar-navigation">
                {navigation.map((section) => (
                    <div className="sidebar-section" key={section.title}>
            <span className="sidebar-section-title">
              {section.title}
            </span>

                        {section.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.label === "Dashboard";

                            return (
                                <button
                                    key={item.label}
                                    className={`sidebar-link ${
                                        isActive ? "sidebar-link-active" : ""
                                    }`}
                                >
                                    <Icon size={18} strokeWidth={1.8} />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className="sidebar-bottom">
                <button className="sidebar-link">
                    <Settings size={18} />
                    <span>Settings</span>
                </button>

                <div className="sidebar-version">
                    Tracepoint <span>v1.0.0</span>
                </div>
            </div>
        </aside>
    );
}
export default Sidebar;
