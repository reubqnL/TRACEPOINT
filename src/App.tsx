import { useState } from "react";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";

import WelcomeSection from "./components/dashboard/WelcomeSection";
import StatsCards from "./components/dashboard/StatsCards";
import RecentInvestigations from "./components/dashboard/RecentInvestigations";

import Investigations from "./pages/Investigations/Investigations";

function App() {
    const [activePage, setActivePage] = useState("Dashboard");

    return (
        <div className="app">
            <Sidebar
                activePage={activePage}
                setActivePage={setActivePage}
            />

            <div className="app-content">
                <Topbar />

                <main className="app-main">
                    {activePage === "Dashboard" && (
                        <>
                            <WelcomeSection />
                            <StatsCards />
                            <RecentInvestigations />
                        </>
                    )}

                    {activePage === "Investigations" && (
                        <Investigations />
                    )}

                    {activePage !== "Dashboard" &&
                        activePage !== "Investigations" && (
                            <h2>{activePage} page coming soon</h2>
                        )}
                </main>
            </div>
        </div>
    );
}

export default App;
