import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp
} from "firebase/firestore";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';

function HomeAdmin() {
    const [reports, setReports] = useState([]);
    const [selectedImg, setSelectedImg] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const reportsArr = [];
            querySnapshot.forEach((doc) => {
                reportsArr.push({ ...doc.data(), id: doc.id });
            });
            setReports(reportsArr);
        });
        return () => unsubscribe();
    }, []);

    const handleClaim = async (report) => {
        const confirmClaim = window.confirm(`Mark "${report.itemName}" as claimed? This will move it to the claimed dashboard.`);
        
        if (confirmClaim) {
            try {
                await addDoc(collection(db, "claimed_reports"), {
                    ...report,
                    claimedAt: serverTimestamp(),
                    archiveStatus: 'Claimed'
                });
                await deleteDoc(doc(db, "reports", report.id));
                alert("Item successfully moved to Claimed.");
            } catch (error) {
                console.error("Error claiming item:", error);
                alert("Failed to mark as claimed.");
            }
        }
    };

    return (
        <div className="home-admin-container">
            {/* --- NEW: Image Modal Overlay --- */}
            {selectedImg && (
                <div className="image-modal-overlay" onClick={() => setSelectedImg(null)}>
                    <div className="modal-content">
                        <span className="close-modal">&times;</span>
                        <img src={selectedImg} alt="Full size" />
                    </div>
                </div>
            )}

            <aside className="admin-sidebar">
                <div className="search-container">
                    <input type="text" placeholder="Search items......" className="search-bar" />
                </div>
                <div className="report-section">
                    <h2>Report an Item</h2>
                    <Link to="/report" className="report-btn-link">Report Here</Link>
                    
                    {/* Change button to Link */}
                    <Link to="/matches" className="ai-matches-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
                        AI Matches
                    </Link>
                </div>
            </aside>

            <main className="admin-main-content">
                <header className="content-header">
                    <h1>Recent Reports</h1>
                </header>

                <div className="dashboard-widgets">
                    {reports.length === 0 ? (
                        <div className="empty-state-card">
                            <p>No active reports found.</p>
                        </div>
                    ) : (
                        <div className="reports-grid">
                            {reports.map((report) => (
                                <div key={report.id} className="report-card">
                                    {report.imageUrl && (
                                        <div 
                                            className="report-image-container" 
                                            onClick={() => setSelectedImg(report.imageUrl)} // Trigger expand
                                            style={{ cursor: 'zoom-in' }}
                                        >
                                            <img src={report.imageUrl} alt={report.itemName} className="report-img-preview" />
                                        </div>
                                    )}
                                    <div className="report-details">
                                        <div className="card-header-flex">
                                            <span className={`status-badge ${report.status.toLowerCase()}`}>
                                                {report.status}
                                            </span>
                                            <button 
                                                className="claimed-action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevents modal from opening if button is inside image container
                                                    handleClaim(report);
                                                }}
                                            >
                                                Claimed
                                            </button>
                                        </div>
                                        <h3>{report.itemName}</h3>
                                        <p><strong>Location:</strong> {report.landmark}</p>
                                        <p className="description-text">{report.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default HomeAdmin;