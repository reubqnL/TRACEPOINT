import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import WelcomeSection from "./components/dashboard/WelcomeSection";

function App() {
    return (
        <div className="app">
            <Sidebar />

            <div className="app-content">
                <Topbar />

                <main className="app-main">
                    <WelcomeSection />
                </main>
            </div>
        </div>
    );
}

export default App;