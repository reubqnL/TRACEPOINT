import { useState } from "react";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import WelcomeSection from "./components/dashboard/WelcomeSection";
import StatsCards from "./components/dashboard/StatsCards";
import RecentInvestigations from "./components/dashboard/RecentInvestigations";

function App() {
    const [activePage, setActivePage] = useState("Dashboard");

    return (
        <div className="app">
            <Sidebar
                activePage={activePage}
                setActivePage={setActivePage} />

            <div className="app-content">
                <Topbar />

                <main className="app-main">
                    <WelcomeSection />
                    <StatsCards />
                    <RecentInvestigations />
                </main>
            </div>
        </div>
    );
}

export default App;