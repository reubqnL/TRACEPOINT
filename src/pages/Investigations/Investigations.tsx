import { useState } from "react";

const investigations = [
    {
        name: "Discord username",
        status: "Active",
        date: "6 November 2026"
    },
    {
        name: "GitHub profile",
        status: "Completed",
        date: "5 November 2026"
    },
    {
        name: "Reddit username",
        status: "Active",
        date: "4 November 2026"
    }
];

function Investigations() {

    const [showMessage, setShowMessage] = useState(false);

    return (
        <section className="investigations-container">
            <div className="text">
                <h2 className="title">Investigations</h2>
                <p>Lorem</p>
            </div>

            <div className="button">
                <button onClick={()=> setShowMessage(!showMessage)}>
                    New Investigation
                </button>
                {showMessage && (
                    <p>New investigation coming soon!</p>
                )}
            </div>

            <div className="investigations-list">
                {investigations.map((investigation) => {
                    return (
                        <div className="investigation-card" key={investigation.name}>
                            <h3>{investigation.name}</h3>
                            <p>{investigation.status}</p>
                            <p>{investigation.date}</p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default Investigations;
