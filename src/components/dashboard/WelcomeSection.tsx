import { Plus, ArrowRight } from "lucide-react";

function WelcomeSection() {
    return (
        <section className="welcome-section">
            <div className="welcome-section-content">
                <span className="welcome-section-eyebrow">
                    YOUR WORKSPACE
                </span>

                <h1>Welcome back.</h1>

                <p>
                    Your investigation workspace is ready.
                    Start something new or continue where you left off.
                </p>
            </div>

            <div className="welcome-section-actions">
                <button className="welcome-section-primary">
                    <Plus size={17} />
                    New Investigation
                </button>

                <button className="welcome-section-secondary">
                    View Investigations
                    <ArrowRight size={16} />
                </button>
            </div>
        </section>
    );
}
export default WelcomeSection;