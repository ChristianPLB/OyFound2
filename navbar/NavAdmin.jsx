import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../firebase";

function NavAdmin({ setRole, searchQuery, setSearchQuery }) {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    const DEFAULT_ICON = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setRole(null);
            localStorage.removeItem('userRole');
            navigate('/');
        } catch (error) {
            console.error("Logout failed: ", error);
        }
    };

    return (
        <aside 
            className="d-flex flex-column flex-shrink-0 p-3 bg-body-tertiary h-100" 
            style={{ width: "260px", minHeight: "100vh", borderRight: "1px solid rgba(119,141,169,0.2)" }}
        >
            {/* 1. BRAND LOGO */}
            <Link 
                className="d-flex align-items-center mb-3 mb-md-0 text-decoration-none px-2" 
                to="/admin"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 50" width="200" height="40">
                    <defs>
                        <style>
                            {`@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap');
                            .logo-text-base { font-family: 'Poppins', sans-serif; font-size: 24px; letter-spacing: -0.4px; }`}
                        </style>
                    </defs>
                    <g transform="translate(4, 3)">
                        <path d="M22,2 C12,2 4,10 4,20 C4,31 22,46 22,46 C22,46 40,31 40,20 C40,10 32,2 22,2 Z" fill="#415A77" />
                        <circle cx="22" cy="17" r="8" stroke="#E0E1DD" strokeWidth="3" fill="none" />
                        <circle cx="22" cy="17" r="3" fill="#E0E1DD" />
                        <line x1="28" y1="23" x2="35" y2="30" stroke="#778DA9" strokeWidth="3.5" strokeLinecap="round" />
                    </g>
                    <text x="56" y="32" className="logo-text-base">
                        <tspan fill="#778DA9" fontWeight="500">Oy</tspan>
                        <tspan fill="#E0E1DD" fontWeight="700">Found</tspan>
                    </text>
                </svg>
            </Link>

            <hr className="my-3" />

            {/* 2. SEARCH INPUT INTEGRATION */}
            <div className="mb-3 px-2">
                <input 
                    type="search" 
                    className="form-control form-control-sm" 
                    placeholder="Search reports..." 
                    value={searchQuery || ""} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                />
            </div>

            {/* 3. NAVIGATION LINKS */}
            <ul className="nav nav-pills flex-column mb-auto gap-1">
                <li className="nav-item">
                    <Link to="/admin" className="nav-link link-body-emphasis">Home Admin</Link>
                </li>
                <li className="nav-item">
                    <Link to="/dashboard" className="nav-link link-body-emphasis">Dashboard</Link>
                </li>
                <li className="nav-item">
                    <Link to="/messages" className="nav-link link-body-emphasis">Messages</Link>
                </li>
                <li className="nav-item mt-2">
                    <Link to="/report" className="btn btn-primary w-100 btn-sm">Report Here</Link>
                </li>
            </ul>

            <hr className="my-3" />

            {/* 4. USER PROFILE & LOGOUT FOOTER */}
            {user && (
                <div className="d-flex align-items-center justify-content-between px-2">
                    <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                        <img 
                            src={user.photoURL || DEFAULT_ICON} 
                            alt="Profile" 
                            className="rounded-circle flex-shrink-0"
                            style={{ 
                                width: '36px', 
                                height: '36px', 
                                objectFit: 'cover',
                                border: '2px solid #778DA9'
                            }}
                        />
                        <span 
                            className="small text-truncate" 
                            style={{ color: '#E0E1DD', fontWeight: '500' }}
                            title={user.displayName || user.email}
                        >
                            {user.displayName || user.email?.split('@')[0]}
                        </span>
                    </div>
                    <button
                        className="btn btn-sm btn-outline-danger flex-shrink-0" 
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            )}
        </aside>
    );
}

export default NavAdmin;