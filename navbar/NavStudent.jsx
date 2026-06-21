import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../firebase"; // Ensure db is exported from your firebase config

function NavStudent({ setRole }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0); // State for notification count

    const DEFAULT_ICON = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        // 1. Listen for new reports (Assuming "reports" collection and a "status" field)
        const reportsRef = collection(db, "reports");
        const q = query(reportsRef, where("status", "==", "new")); // Adjust query as needed

        const unsubscribeReports = onSnapshot(q, (snapshot) => {
            setUnreadCount(snapshot.size); // Updates the badge count in real-time
        });

        return () => {
            unsubscribeAuth();
            unsubscribeReports();
        };
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setRole(null);
            localStorage.removeItem('userRole');
            navigate('/');
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    return (
        <nav className="navbar navbar-expand-lg bg-white border-bottom shadow-sm py-2">
            <div className="container-fluid">
                <Link className="navbar-brand fw-bold text-primary" to="/student">OyFound</Link>
                
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon"></span>
                </button>

                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav me-auto">
                        <li className="nav-item">
                            <Link to="/studentdashboard" className="nav-link">Dashboard</Link>
                        </li>
                        <li className="nav-item position-relative">
                            <Link to="/studentmessages" className="nav-link">
                                Messages
                                {/* 2. Notification Badge for Messages/Reports */}
                                {unreadCount > 0 && (
                                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.6rem' }}>
                                        {unreadCount}
                                    </span>
                                )}
                            </Link>
                        </li>
                    </ul>

                    <div className="d-flex align-items-center gap-3">
                        {user && (
                            <>
                                <Link to="/Profile" className="d-flex align-items-center text-decoration-none">
                                    <span className="me-2 d-none d-md-inline text-muted small">
                                        {user.displayName || user.email?.split('@')[0]}
                                    </span>
                                    <img 
                                        src={user.photoURL || DEFAULT_ICON} 
                                        alt="Profile" 
                                        className="rounded-circle border"
                                        style={{ 
                                            width: '40px', 
                                            height: '40px', 
                                            objectFit: 'cover',
                                            border: '2px solid #fff',
                                            boxShadow: '0 2px 5px rgba(0,0,0,0.1)' 
                                        }}
                                    />
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default NavStudent;