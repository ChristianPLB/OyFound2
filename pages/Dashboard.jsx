import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { db } from '../firebase';
// Import Recharts components
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function Dashboard() {
    const [activeTab, setActiveTab] = useState('Lost');
    const [searchTerm, setSearchTerm] = useState('');
    const [reports, setReports] = useState([]);
    const [claimedReports, setClaimedReports] = useState([]);

    useEffect(() => {
        const qActive = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const unsubActive = onSnapshot(qActive, (snap) => {
            setReports(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });

        const qClaimed = query(collection(db, "claimed_reports"), orderBy("claimedAt", "desc"));
        const unsubClaimed = onSnapshot(qClaimed, (snap) => {
            setClaimedReports(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });

        return () => { unsubActive(); unsubClaimed(); };
    }, []);

    // --- Delete Function ---
    const handleDelete = async (item) => {
        if (window.confirm(`Are you sure you want to permanently delete "${item.itemName}"?`)) {
            try {
                const collectionName = activeTab === 'Claimed' ? "claimed_reports" : "reports";
                await deleteDoc(doc(db, collectionName, item.id));
                alert("Deleted successfully.");
            } catch (error) {
                console.error("Delete Error:", error);
                alert("Failed to delete: " + error.message);
            }
        }
    };

    const handleMoveToClaimed = async (item) => {
        if (window.confirm(`Mark ${item.itemName} as claimed?`)) {
            try {
                await addDoc(collection(db, "claimed_reports"), {
                    ...item,
                    status: 'Claimed',
                    claimedAt: serverTimestamp()
                });
                await deleteDoc(doc(db, "reports", item.id));
                alert("Success! Item moved to claimed.");
            } catch (error) {
                alert("Error: " + error.message);
            }
        }
    };

    const getCount = (type) => {
        if (type === 'Claimed') return claimedReports.length;
        return reports.filter(r => r.status === type).length;
    };

    // --- Prepare Chart Data ---
    const chartData = [
        { name: 'Lost', count: getCount('Lost'), color: '#dc3545' },
        { name: 'Found', count: getCount('Found'), color: '#ffc107' },
        { name: 'Claimed', count: getCount('Claimed'), color: '#28a745' },
    ];

    const filteredItems = (activeTab === 'Claimed' ? claimedReports : reports.filter(r => r.status === activeTab))
        .filter(item => 
            item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.landmark?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    return (
        <div className="dashboard-wrapper" style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Dashboard</h2>
                <input 
                    type="text" 
                    placeholder="Search by name or location..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc', width: '300px' }}
                />
            </div>

            {/* --- Analytics Section --- */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '12px', marginBottom: '30px', height: '300px' }}>
                <h4 style={{ marginTop: 0 }}>Inventory Overview</h4>
                <ResponsiveContainer width="100%" height="90%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
                {['Lost', 'Found', 'Claimed'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '10px 20px', cursor: 'pointer', border: 'none', borderRadius: '5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
                            background: activeTab === tab ? '#007bff' : 'transparent',
                            color: activeTab === tab ? '#fff' : '#555',
                        }}
                    >
                        {tab} <span style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '2px 8px', borderRadius: '10px', fontSize: '12px' }}>{getCount(tab)}</span>
                    </button>
                ))}
            </div>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {filteredItems.map(item => (
                    <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', position: 'relative' }}>
                        <img src={item.imageUrl || 'https://via.placeholder.com/150'} alt="" style={{ width: '100%', height: '180px', objectFit: 'cover' }} />
                        <div style={{ padding: '15px' }}>
                            <h3 style={{ margin: '0 0 5px 0' }}>{item.itemName}</h3>
                            <p style={{ color: '#666', fontSize: '13px', margin: '5px 0' }}>📍 {item.landmark}</p>
                            
                            {/* Display Date and Time */}
                            <p style={{ fontSize: '11px', color: '#999', marginBottom: '15px' }}>
                                🕒 {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 
                                    item.claimedAt?.toDate ? item.claimedAt.toDate().toLocaleString() : 'No date'}
                            </p>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {activeTab !== 'Claimed' && (
                                    <button 
                                        onClick={() => handleMoveToClaimed(item)}
                                        style={{ flex: 2, padding: '8px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                    >
                                        Mark Claimed
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDelete(item)}
                                    style={{ flex: 1, padding: '8px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Dashboard;