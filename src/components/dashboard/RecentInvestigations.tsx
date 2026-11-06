import { FileSearch, ScanSearch, Bookmark, FileText } from "lucide-react"

function StatsCards() {
    return (
        <section className="card-grid">
            <div className="card-item total-investigation">
                    <FileSearch size={18} />
                    <h3>Total Investigations</h3>
                    <span className="number">0</span>
                    <p className="subtitle">
                        Across your investigation workspace
                    </p>
            </div>

            <div className="card-item active-investigation">
                    <ScanSearch size={18} />
                    <h3>Active Investigations</h3>
                    <span className="number">0</span>
                    <p className="subtitle">
                        Currently open and in progress
                    </p>
            </div>

            <div className="card-item saved-bookmarks">
                    <Bookmark size={18} />
                    <h3>Saved Bookmarks</h3>
                    <span className="number">0</span>
                    <p className="subtitle">
                        Sources saved for further analysis
                    </p>
            </div>

            <div className="card-item reports-generated">
                    <FileText size={18} />
                    <h3>Reports Generated</h3>
                    <span className="number">0</span>
                    <p className="subtitle">
                        Compiled investigation findings
                    </p>
            </div>
        </section>
    )
}
export default StatsCards;