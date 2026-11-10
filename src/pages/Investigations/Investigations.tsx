import { useState } from "react";

function Investigations() {

    // controls whether the input field is displayed
    const [showMessage, setShowMessage] = useState(false);

    // then store what the user types into the input
    const [investigationName, setInvestigationName] = useState("");

    return (
        <section className="investigations-container">

            <div className="text">
                <h2 className="title">Investigations</h2>
                <p>Manage and organise your username investigations.</p>
            </div>

            <div className="button">
                <button onClick={() => setShowMessage(!showMessage)}>
                    New Investigation
                </button>

                {showMessage && (
                    <input
                        type="text"
                        placeholder="Enter investigation name..."
                        value={investigationName}
                        onChange={(event) => setInvestigationName(event.target.value)}
                    />
                )}
            </div>

            {/* Empty state displayed when there are no investigations */}
            <div className="investigations-list">

                <div className="investigations-empty">
                    <h3>No investigations yet</h3>
                    <p>Create your first investigation to get started.</p>
                </div>
            </div>
        </section>
    );
}

export default Investigations;