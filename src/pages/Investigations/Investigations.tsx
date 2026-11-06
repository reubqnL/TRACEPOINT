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
    return (
        <section className="investigations-container">
            <div className="text">
                <h2 className="title">Investigations</h2>
                <p>Lorem</p>
            </div>

            <div className="button">
                <button>New Investigation</button>
            </div>

            <div className="investigations-list">
                {investigations.map((investigation) => {
                    return (
                        <div>
                            <h3>{investigation.name}</h3>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

export default Investigations;