import { Search, Bell, UserRound, ChevronDown } from "lucide-react";

function Topbar() {
    return (
        <header className="topbar">

            {/* Page information */}
            <div className="topbar-title">
                <div className="topbar-line"></div>

                <div>
                    <h2>Dashboard</h2>
                    <span>Your investigation overview</span>
                </div>
            </div>

            {/* Right side actions */}
            <div className="topbar-actions">

                {/* Search */}
                <div className="topbar-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search..."
                    />
                </div>

                {/* Notifications */}
                <button className="topbar-icon">
                    <Bell size={19} />
                </button>

                {/* User profile */}
                <button className="topbar-profile">
                    <UserRound size={19} />
                    <span>Profile</span>
                    <ChevronDown size={16} />
                </button>

            </div>
        </header>
    );
}

export default Topbar;
