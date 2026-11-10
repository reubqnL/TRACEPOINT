import { useState } from "react";

function Investigations() {
    const [showModal, setShowModal] = useState(false);
    const [investigationName, setInvestigationName] = useState("");
    const [investigations, setInvestigations] = useState<string[]>([]);

    function createInvestigation(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const name = investigationName.trim();

        if (!name) return;

        setInvestigations((previous) => [...previous, name]);

        setInvestigationName("");
        setShowModal(false);
    }

    return (
        <section className="investigations-container">

            <div className="text">
                <h2 className="title">Investigations</h2>
                <p>Manage and organise your username investigations.</p>
            </div>

            <div className="button">
                <button onClick={() => setShowModal(true)}>
                    New Investigation
                </button>
            </div>

            <div className="investigations-list">
                {investigations.length === 0 ? (
                    <div className="investigations-empty">
                        <h3>No investigations yet</h3>
                        <p>Create your first investigation to get started.</p>
                    </div>
                ) : (
                    investigations.map((name, index) => (
                        <div className="investigation-card" key={index}>
                            <h3>{name}</h3>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="investigation-modal-overlay">
                    <div
                        className="investigation-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                    >
                        <h2 id="modal-title">New Investigation</h2>

                        <p>Give your investigation a name to get started.</p>

                        <form onSubmit={createInvestigation}>
                            <label htmlFor="investigation-name">
                                Investigation name
                            </label>

                            <input
                                id="investigation-name"
                                type="text"
                                placeholder="e.g. Username Research"
                                value={investigationName}
                                onChange={(event) =>
                                    setInvestigationName(event.target.value)
                                }
                                autoFocus
                            />

                            <div className="investigation-modal-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setInvestigationName("");
                                    }}
                                >
                                    Cancel
                                </button>

                                <button type="submit" disabled={!investigationName.trim()}>
                                    Create Investigation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Investigations;
