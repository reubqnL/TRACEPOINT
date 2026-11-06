import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";

function App() {
    return (
        <div className="app">
            <Sidebar />

            <div className="app-content">
                <Topbar />

                <main className="app-main">
                    <h1>Welcome to Tracepoint</h1>
                </main>
            </div>
        </div>
    );
}

export default App;