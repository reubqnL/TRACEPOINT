import Sidebar from "./components/layout/Sidebar";

function App() {
    return (
        <div className="app">
            <Sidebar />

            <main className="app-main">
                <h1>Dashboard</h1>
                <p>Welcome to the future.</p>
            </main>
        </div>
    );
}
export default App;