function InvestigationActivity() {
    const weeklyActivity = [
        { day: "Mon", sources: 4 },
        { day: "Tue", sources: 7 },
        { day: "Wed", sources: 5 },
        { day: "Thu", sources: 9 },
        { day: "Fri", sources: 6 },
        { day: "Sat", sources: 8 },
        { day: "Sun", sources: 3 },
    ];

    const maxSources = Math.max(
        ...weeklyActivity.map((day) => day.sources)
    );

    return (
        <section className="investigation-activity-section">
            <div className="investigation-activity-header">
                <div>
                    <h2>Investigation Activity</h2>
                    <span className="investigation-activity-eyebrow">
                        Your activity over the last 7 days
                    </span>
                </div>

                <span className="investigation-activity-period">
                    This week
                </span>
            </div>

            <div className="investigation-activity-content">
                <div className="investigation-activity-summary">
                    <span className="investigation-activity-stats">
                        24
                    </span>
                    <span>Sources reviewed</span>
                </div>

                <div className="investigation-activity-chart">
                    {weeklyActivity.map((day) => (
                        <div
                            className="investigation-activity-day"
                            key={day.day}
                        >
                            <div className="investigation-activity-bar-container">
                                <div
                                    className="investigation-activity-bar"
                                    style={{
                                        height: `${(day.sources / maxSources) * 100}%`,
                                    }}
                                />
                            </div>

                            <span className="investigation-activity-label">
                                {day.day}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
export default InvestigationActivity;
