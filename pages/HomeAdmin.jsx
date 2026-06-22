import {
    collection,
    onSnapshot,
    orderBy,
    query
} from "firebase/firestore";
import { useEffect, useState } from 'react';
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

    return (
        <div className="home-admin-container">
            {/* --- Image Modal Overlay --- */}
            {selectedImg && (
                <div className="image-modal-overlay" onClick={() => setSelectedImg(null)}>
                    <div className="modal-content">
                        <span className="close-modal">&times;</span>
                        <img src={selectedImg} alt="Full size" />
                    </div>
                </div>
            )}

            <main className="admin-main-content w-100">
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
                                            onClick={() => setSelectedImg(report.imageUrl)} 
                                            style={{ cursor: 'zoom-in' }}
                                        >
                                            <img src={report.imageUrl} alt={report.itemName} className="report-img-preview" />
                                        </div>
                                    )}
                                    <div className="report-details">
                                        <div className="card-header-flex">
                                            <span className={`status-badge ${report.status ? report.status.toLowerCase() : ''}`}>
                                                {report.status}
                                            </span>
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