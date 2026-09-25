import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { db } from '../firebase';

function Dashboard() {
    const [activeTab, setActiveTab] = useState('Lost');
    const [searchTerm, setSearchTerm] = useState('');
    const [reports, setReports] = useState([]);
    const [claimedReports, setClaimedReports] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        // 1. Realtime Active Reports (Lost/Found)
        const qActive = query(collection(db, "reports"), orderBy("timestamp", "desc"));
        const unsubActive = onSnapshot(qActive, (snap) => {
            setReports(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });

        // 2. Realtime Claimed Reports
        const qClaimed = query(collection(db, "claimed_reports"), orderBy("claimedAt", "desc"));
        const unsubClaimed = onSnapshot(qClaimed, (snap) => {
            setClaimedReports(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });

        // 3. Realtime Registered Users
        const qUsers = query(collection(db, "users"));
        const unsubUsers = onSnapshot(qUsers, (snap) => {
            setUsers(snap.docs.map(doc => ({ ...doc.data(), id: doc.id })));
        });

        return () => { 
            unsubActive(); 
            unsubClaimed(); 
            unsubUsers();
        };
    }, []);

    // --- Delete Item Function ---
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

    // --- Move Item to Claimed ---
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

    // --- Filter & Categorize Users (Global Count Calculation) ---
    const allStudents = users.filter(u => 
        u.role?.toLowerCase() === 'student' || 
        (!u.role && (u.schoolName || u.school))
    );

    const allGuests = users.filter(u => 
        u.role?.toLowerCase() === 'guest' || 
        (!u.schoolName && !u.school && u.role !== 'student')
    );

    // --- Tab Count Helper ---
    const getCount = (type) => {
        if (type === 'Claimed') return claimedReports.length;
        if (type === 'Users') return users.length;
        return reports.filter(r => r.status === type).length;
    };

    // --- Compute Totals & Percentages ---
    const lostCount = getCount('Lost');
    const foundCount = getCount('Found');
    const claimedCount = getCount('Claimed');
    const totalItems = lostCount + foundCount + claimedCount;

    const getPercentage = (count) => {
        if (totalItems === 0) return 0;
        return ((count / totalItems) * 100).toFixed(1);
    };

    // --- Chart Configurations ---
    const chartData = [
        { name: 'Lost', count: lostCount, color: '#ef4444' },
        { name: 'Found', count: foundCount, color: '#eab308' },
        { name: 'Claimed', count: claimedCount, color: '#10b981' },
    ];

    const pieData = chartData.filter(d => d.count > 0);

    // --- Filter Reports for Active Tab ---
    const filteredItems = (activeTab === 'Claimed' ? claimedReports : reports.filter(r => r.status === activeTab))
        .filter(item => 
            item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.landmark?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    // --- Search Filter for Users View ---
    const filteredUsers = users.filter(u => {
        const userName = u.fullName || u.displayName || u.name || '';
        const userEmail = u.email || '';
        const userSchool = u.schoolName || u.school || u.university || '';
        const userRole = u.role || '';

        return (
            userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userSchool.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userRole.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const displayStudents = filteredUsers.filter(u => 
        u.role?.toLowerCase() === 'student' || 
        (!u.role && (u.schoolName || u.school))
    );

    const displayGuests = filteredUsers.filter(u => 
        u.role?.toLowerCase() === 'guest' || 
        (!u.schoolName && !u.school && u.role !== 'student')
    );

    // Group Students dynamically by School
    const studentsBySchool = displayStudents.reduce((acc, student) => {
        const rawSchool = student.schoolName || student.school || student.university || 'Unspecified School';
        const schoolName = rawSchool.trim();

        if (!acc[schoolName]) {
            acc[schoolName] = [];
        }
        acc[schoolName].push(student);
        return acc;
    }, {});

    return (
        <div className="dashboard-wrapper">
            
            {/* Header & Search */}
            <div className="dashboard-header">
                <h2>Dashboard</h2>
                <input 
                    type="text" 
                    placeholder="Search items, locations, or users..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="dashboard-search"
                />
            </div>

            {/* --- User Registration Summary Banner (Above Graphs) --- */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '20px',
                flexWrap: 'wrap'
            }}>
                <div style={{
                    flex: '1',
                    minWidth: '200px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Registered Students</p>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '1.8rem', color: '#1e293b', fontWeight: '700' }}>{allStudents.length}</h3>
                    </div>
                    <span style={{ fontSize: '2rem' }}>🎓</span>
                </div>

                <div style={{
                    flex: '1',
                    minWidth: '200px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                }}>
                    <div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Registered Guests</p>
                        <h3 style={{ margin: '4px 0 0 0', fontSize: '1.8rem', color: '#1e293b', fontWeight: '700' }}>{allGuests.length}</h3>
                    </div>
                    <span style={{ fontSize: '2rem' }}>👤</span>
                </div>
            </div>

            {/* --- Analytics Section --- */}
            <div className="analytics-section">
                
                {/* Bar Chart Panel */}
                <div className="analytics-panel-bar">
                    <h4 className="analytics-title">Inventory Volume</h4>
                    <div style={{ width: '100%', height: '240px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.15)" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                                <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', background: '#fff', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Circular Percentage Panel */}
                <div className="analytics-panel-circular">
                    <h4 className="analytics-title">Share Distribution</h4>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '12px', flex: 1 }}>
                        <div style={{ width: '120px', height: '120px', position: 'relative' }}>
                            {totalItems === 0 ? (
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '8px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px' }}>Empty</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            dataKey="count"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={38}
                                            outerRadius={50}
                                            paddingAngle={3}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-pie-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        {/* Interactive Metric Buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 }}>
                            {chartData.map((item) => (
                                <button
                                    key={`btn-${item.name}`}
                                    onClick={() => setActiveTab(item.name)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: `1px solid ${activeTab === item.name ? item.color : '#e2e8f0'}`,
                                        background: activeTab === item.name ? `${item.color}10` : '#f8fafc',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
                                        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }} />
                                        {item.name}
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                                        {getPercentage(item.count)}%
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                {['Lost', 'Found', 'Claimed', 'Users'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                    >
                        {tab} <span className="tab-badge">{getCount(tab)}</span>
                    </button>
                ))}
            </div>

            {/* --- Main Content Section --- */}
            {activeTab === 'Users' ? (
                /* --- REGISTERED USERS VIEW --- */
                <div className="users-section">
                    
                    {/* 1. Grouped Students by School */}
                    <div className="students-group-wrapper">
                        <h3 className="section-heading">🎓 Registered Students (By School)</h3>
                        {Object.keys(studentsBySchool).length === 0 ? (
                            <p className="empty-text">No students registered yet.</p>
                        ) : (
                            Object.entries(studentsBySchool).map(([school, studentList]) => (
                                <div key={school} className="school-group-card">
                                    <h4 className="school-name">🏫 {school} <span className="count-tag">({studentList.length})</span></h4>
                                    <div className="user-grid">
                                        {studentList.map(student => {
                                            const name = student.fullName || student.displayName || student.name || 'Unnamed Student';
                                            return (
                                                <div key={student.id} className="user-card">
                                                    <div className="user-avatar">{name.charAt(0).toUpperCase()}</div>
                                                    <div className="user-info">
                                                        <p className="user-name">{name}</p>
                                                        <p className="user-email">✉️ {student.email || 'No email'}</p>
                                                        {student.studentId && <p className="user-meta">🆔 ID: {student.studentId}</p>}
                                                        {student.phone && <p className="user-meta">📞 {student.phone}</p>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* 2. Registered Guests */}
                    <div className="guests-group-wrapper">
                        <h3 className="section-heading">👤 Registered Guests ({displayGuests.length})</h3>
                        {displayGuests.length === 0 ? (
                            <p className="empty-text">No guests registered.</p>
                        ) : (
                            <div className="user-grid">
                                {displayGuests.map(guest => {
                                    const name = guest.fullName || guest.displayName || guest.name || 'Unnamed Guest';
                                    const contact = guest.phone || guest.contact;
                                    return (
                                        <div key={guest.id} className="user-card guest-card">
                                            <div className="user-avatar guest-avatar">{name.charAt(0).toUpperCase()}</div>
                                            <div className="user-info">
                                                <p className="user-name">{name}</p>
                                                <p className="user-email">✉️ {guest.email || 'No email'}</p>
                                                {contact && <p className="user-meta">📞 {contact}</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                </div>
            ) : (
                /* --- INVENTORY ITEM GRID VIEW --- */
                <div className="content-grid">
                    {filteredItems.length === 0 ? (
                        <div className="empty-state-card">
                            <p>No reports found in this section.</p>
                        </div>
                    ) : (
                        filteredItems.map(item => (
                            <div key={item.id} className="item-card">
                                <img src={item.imageUrl || 'https://via.placeholder.com/150'} alt="" className="item-image" />
                                <div className="item-details">
                                    <h3 className="item-name">{item.itemName}</h3>
                                    <p className="item-location">📍 {item.landmark}</p>
                                    
                                    <p className="item-timestamp">
                                        🕒 {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleString() : 
                                            item.claimedAt?.toDate ? item.claimedAt.toDate().toLocaleString() : 'No date'}
                                    </p>
                                    
                                    <div className="item-actions">
                                        {activeTab !== 'Claimed' && (
                                            <button 
                                                onClick={() => handleMoveToClaimed(item)}
                                                className="btn-mark-claimed"
                                            >
                                                Mark Claimed
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDelete(item)}
                                            className="btn-delete"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default Dashboard;