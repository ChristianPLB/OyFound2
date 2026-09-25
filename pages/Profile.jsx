import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';

function Profile({ setRole }) {
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [loggingOut, setLoggingOut] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const currentUser = auth.currentUser;
                const localStudentId = localStorage.getItem('studentId');

                const docId = currentUser
                    ? currentUser.uid
                    : localStudentId;

                if (!docId) {
                    navigate('/login');
                    return;
                }

                const userDoc = await getDoc(
                    doc(db, "users", docId)
                );

                if (userDoc.exists()) {
                    setUserData(userDoc.data());
                } else {
                    setError(
                        "User profile details could not be found."
                    );
                }

            } catch (err) {
                setError(
                    "Failed to fetch profile: " + err.message
                );
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [navigate]);


    // =========================================
    // LOGOUT
    // =========================================

    const handleLogout = async () => {
        try {
            setLoggingOut(true);

            await signOut(auth);

            // Clear stored login information
            localStorage.removeItem('userRole');
            localStorage.removeItem('studentId');

            // Clear role in App.jsx
            if (setRole) {
                setRole(null);
            }

            // Return to homepage
            navigate('/');

        } catch (err) {
            console.error("Logout error:", err);

            setError(
                "Failed to logout. Please try again."
            );

            setLoggingOut(false);
        }
    };


    // =========================================
    // LOADING
    // =========================================

    if (loading) {
        return (
            <div className="profile-dashboard-layout d-flex align-items-center justify-content-center">
                <p style={{ color: '#E0E1DD' }}>
                    Loading Workspace...
                </p>
            </div>
        );
    }


    // =========================================
    // ERROR
    // =========================================

    if (error) {
        return (
            <div className="profile-dashboard-layout d-flex align-items-center justify-content-center">
                <div
                    className="dashboard-data-card"
                    style={{ textAlign: 'center' }}
                >
                    <p style={{ color: '#f87171' }}>
                        {error}
                    </p>

                    <button
                        className="btn-action-primary w-100"
                        style={{ marginTop: '16px' }}
                        onClick={() => navigate('/login')}
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }


    if (!userData) {
        return null;
    }


    // =========================================
    // USER DATA
    // =========================================

    const formattedRole = userData.role
        ? userData.role.charAt(0).toUpperCase() +
          userData.role.slice(1)
        : 'User';

    const fullName =
        userData.fullName ||
        `${userData.firstName || ''} ${userData.lastName || ''}`.trim();

    const initial = userData.firstName
        ? userData.firstName.charAt(0).toUpperCase()
        : 'U';


    return (
        <div className="profile-dashboard-layout">

            <div className="profile-grid-container">

                {/* =========================================
                    LEFT SIDEBAR: HERO IDENTITY FRAME
                ========================================= */}

                <aside className="hero-identity-sidebar">

                    <div className="sidebar-backdrop-glow"></div>

                    <div className="identity-card-core">

                        <div className="avatar-frame-premium">

                            {userData.photoURL ? (
                                <img
                                    src={userData.photoURL}
                                    alt={fullName}
                                    className="dashboard-avatar-img"
                                    onError={(e) => {
                                        e.target.style.display = 'none';

                                        if (
                                            e.target.nextSibling
                                        ) {
                                            e.target.nextSibling.style.display =
                                                'flex';
                                        }
                                    }}
                                />
                            ) : null}


                            <div
                                className="profile-icon-fallback"
                                style={{
                                    display: userData.photoURL
                                        ? 'none'
                                        : 'flex'
                                }}
                            >
                                {initial}
                            </div>


                            <div
                                className="pulse-indicator-online"
                                title="Online"
                            ></div>

                        </div>


                        <div className="identity-text-stack">

                            <h2 className="user-display-name">
                                {fullName}
                            </h2>

                            <span className="user-role-pill">
                                {formattedRole}
                            </span>

                        </div>

                    </div>


                    {/* =========================================
                        PROFILE ACTIONS
                    ========================================= */}

                    <div className="sidebar-action-footer">

                        {/* EDIT PROFILE */}
                        <Link
                            to="/edit-profile"
                            className="btn-action-primary w-100 mb-2 d-flex align-items-center justify-content-center"
                            style={{
                                textDecoration: 'none'
                            }}
                        >
                            Edit Profile
                        </Link>


                        {/* LOGOUT */}
                        <button
                            type="button"
                            className="profile-logout-button"
                            onClick={handleLogout}
                            disabled={loggingOut}
                        >
                            <span className="logout-icon">
                                ↪
                            </span>

                            {loggingOut
                                ? 'Logging out...'
                                : 'Logout'}
                        </button>

                    </div>

                </aside>


                {/* =========================================
                    RIGHT CONTENT
                ========================================= */}

                <main className="workspace-main-content">

                    <h1 className="workspace-main-title">
                        Account Workspace
                    </h1>


                    <div className="dashboard-cards-grid">

                        {/* =========================================
                            PERSONAL DETAILS
                        ========================================= */}

                        <div className="dashboard-data-card">

                            <div className="card-indicator-line"></div>

                            <h3 className="data-card-title">
                                Personal Details
                            </h3>


                            <div className="meta-data-block">

                                <label>
                                    Full Name
                                </label>

                                <p>
                                    {fullName}
                                </p>

                            </div>


                            <div className="meta-data-block">

                                <label>
                                    Gender
                                </label>

                                <p
                                    style={{
                                        textTransform: 'capitalize'
                                    }}
                                >
                                    {userData.gender || 'N/A'}
                                </p>

                            </div>


                            <div className="meta-data-block">

                                <label>
                                    Date of Birth
                                </label>

                                <p>
                                    {userData.birthdate || 'N/A'}
                                </p>

                            </div>

                        </div>


                        {/* =========================================
                            CONTACT DETAILS
                        ========================================= */}

                        <div className="dashboard-data-card">

                            <div className="card-indicator-line variant-accent"></div>

                            <h3 className="data-card-title">
                                Contact & Security
                            </h3>


                            {userData.email ? (

                                <div className="meta-data-block">

                                    <label>
                                        Email Address
                                    </label>

                                    <p>
                                        {userData.email}
                                    </p>

                                </div>

                            ) : (

                                <div className="meta-data-block">

                                    <label>
                                        Account Type
                                    </label>

                                    <p>
                                        Elementary Student (No Email)
                                    </p>

                                </div>

                            )}


                            {userData.phone && (

                                <div className="meta-data-block">

                                    <label>
                                        Phone Number
                                    </label>

                                    <p>
                                        {userData.phone}
                                    </p>

                                </div>

                            )}


                            <div className="meta-data-block">

                                <label>
                                    Role Type
                                </label>

                                <p>
                                    {formattedRole}
                                </p>

                            </div>

                        </div>


                        {/* =========================================
                            ACADEMIC / STUDENT DETAILS
                        ========================================= */}

                        {userData.role === 'student' && (

                            <div
                                className="dashboard-data-card"
                                style={{
                                    gridColumn: '1 / -1'
                                }}
                            >

                                <div className="card-indicator-line"></div>

                                <h3 className="data-card-title">
                                    Academic Profile
                                </h3>


                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns:
                                            'repeat(auto-fit, minmax(220px, 1fr))',
                                        gap: '20px'
                                    }}
                                >

                                    {userData.studentId && (

                                        <div className="meta-data-block">

                                            <label>
                                                Student ID
                                            </label>

                                            <p>
                                                {userData.studentId}
                                            </p>

                                        </div>

                                    )}


                                    <div className="meta-data-block">

                                        <label>
                                            Department
                                        </label>

                                        <p>
                                            {userData.department || 'N/A'}
                                        </p>

                                    </div>


                                    {userData.department === 'College' && (
                                        <>

                                            <div className="meta-data-block">

                                                <label>
                                                    Program / Major
                                                </label>

                                                <p>
                                                    {userData.collegeDept}
                                                </p>

                                            </div>


                                            <div className="meta-data-block">

                                                <label>
                                                    Year Level
                                                </label>

                                                <p>
                                                    Year {userData.yearLevel}
                                                </p>

                                            </div>


                                            <div className="meta-data-block">

                                                <label>
                                                    Block
                                                </label>

                                                <p>
                                                    Block {userData.block}
                                                </p>

                                            </div>

                                        </>
                                    )}


                                    {userData.department === 'Senior High' && (

                                        <div className="meta-data-block">

                                            <label>
                                                Strand / Track
                                            </label>

                                            <p>
                                                {userData.shsCourse}
                                            </p>

                                        </div>

                                    )}


                                    {userData.department === 'Junior High' && (

                                        <div className="meta-data-block">

                                            <label>
                                                Grade Level
                                            </label>

                                            <p>
                                                Grade {userData.jhsGradeLevel}
                                            </p>

                                        </div>

                                    )}

                                </div>

                            </div>

                        )}

                    </div>

                </main>

            </div>

        </div>
    );
}

export default Profile;