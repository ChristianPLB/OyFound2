import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { db } from '../firebase';

function HomeStudent() {
    const [activeCategory, setActiveCategory] = useState('All');
    const [reports, setReports] = useState([]);

    useEffect(() => {
        const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const items = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            setReports(items);
        });
        return () => unsubscribe();
    }, []);

    const filteredReports = reports.filter(item => 
        activeCategory === 'All' || item.status === activeCategory
    );

    return (
        <div className="student-home">
            {/* Category Header */}
            <div className="category-header">
                <button 
                    className={activeCategory === 'Lost' ? 'active' : ''} 
                    onClick={() => setActiveCategory('Lost')}
                >Lost</button>
                <div className="divider">|</div>
                <button 
                    className={activeCategory === 'Found' ? 'active' : ''} 
                    onClick={() => setActiveCategory('Found')}
                >Found</button>
                <div className="divider">|</div>
                <button 
                    className={activeCategory === 'All' ? 'active' : ''} 
                    onClick={() => setActiveCategory('All')}
                >All</button>
            </div>

            <div className="reports-grid">
                {filteredReports.length > 0 ? (
                    filteredReports.map((report) => (
                        <div className="card item-card" key={report.id}>
                            {/* Image Preview Area instead of Map */}
                            <div className="ratio ratio-1x1 image-container">
                                {report.imageUrl ? (
                                    <img 
                                        src={report.imageUrl} 
                                        alt={report.itemName}
                                        className="item-image"
                                        style={{ objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
                                    />
                                ) : (
                                    <div className="no-image-placeholder">
                                        <span>No Image Available</span>
                                    </div>
                                )}
                            </div>

                            <div className="card-body">
                                <div className="card-badge" data-status={report.status}>
                                    {report.status}
                                </div>
                                <h5 className="card-title">{report.itemName}</h5>
                                <p className="card-text">
                                    <strong>Location:</strong> {report.landmark}<br/>
                                    <strong>Date:</strong> {report.date}
                                </p>
                                <p className="description-preview">{report.description}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-reports">
                        <p>No {activeCategory} items reported yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default HomeStudent;