import { Plus } from "lucide-react";

function WelcomeSection() {
    return (
        <section className="welcome-section">
            <div className="welcome-section-content">
                <span className="welcome-section-eyebrow">
                    YOUR WORKSPACE
                </span>

                <h1>Let's start strong!</h1>

                <p>
                    Here's what's happening across your investigations.
                    Keep track of your progress and pick up where you left off.
                </p>

                <button className="welcome-section-primary">
                    <Plus size={17} />
                    New Investigation
                </button>
            </div>

            <div className="welcome-section-progress">
                <div className="welcome-section-progress-header">
                    <span>Daily progress</span>
                    <span>65%</span>
                </div>

                <div className="welcome-section-progress-bar">
                    <div className="welcome-section-progress-fill" />
                </div>

                <p>You've reviewed 13 of 20 sources today.</p>
            </div>
        </section>
    );
}

export default WelcomeSection;