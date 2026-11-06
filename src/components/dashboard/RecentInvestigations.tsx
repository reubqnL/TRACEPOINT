import { FileSearch, ScanSearch, Bookmark, FileText } from "lucide-react"

function Cards() {
    return (
        <section className="card-grid">
            <div className="card-item">
                <span className="total-investigation">
                    <FileSearch size={5} />
                    <h3>Total Investigations</h3>
                    <span className="number">0</span>
                    <span className="subtitle">
                        <h4>Across your investigation workspace</h4>
                    </span>
                </span>
            </div>
        </section>
    )
}