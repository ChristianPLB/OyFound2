import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';

function Profile({ setRole }) { // Receive setRole here
    const navigate = useNavigate();
    const [userData, setUserData] = useState({
        fullName: 'Loading...',
        email: '',
        role: 'Team Member', 
        phone: '',
        location: '',
        photoURL: 'https://via.placeholder.com/100'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const basicInfo = {
                    fullName: user.displayName || "User",
                    email: user.email,
                    photoURL: user.photoURL || null,
                };

                try {
                    const userDocRef = doc(db, "users", user.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const data = userDocSnap.data();
                        setUserData({
                            ...basicInfo,
                            fullName: data.fullName || basicInfo.fullName,
                            role: data.role || 'Team Member',
                            phone: data.phone || 'Not provided',
                        });
                    } else {
                        setUserData(prev => ({ ...prev, ...basicInfo }));
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                }
            } else {
                setRole(null); // Safety check: if no user, clear role
                navigate('/'); 
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [navigate, setRole]);

    // Handle Logout
    const handleLogout = async () => {
        try {
            await signOut(auth); // Sign out from Firebase
            setRole(null);       // Reset the App.js state (fixes the Navbar)
            localStorage.removeItem('userRole'); // Clear persistent storage
            navigate('/');       // Redirect to home
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    if (loading) return <div className="loading-spinner">Loading Profile...</div>;

    return (
        <div className="profile-container">
            <h2 className="main-title">My Profile</h2>

            <div className="profile-card header-card">
                <div className="header-left">
                    <div className="avatar-wrapper">
                    {userData.photoURL ? (
                        <img src={userData.photoURL} alt="Profile" className="profile-avatar" />
                    ) : (
                        <div className="profile-icon-fallback">
                            {userData.fullName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                    <div className="user-meta">
                        <h3 className="user-name">{userData.fullName}</h3>
                        <p className="user-role">{userData.role}</p>
                        <p className="user-location">{userData.location}</p>
                    </div>
                </div>
                <div className="header-actions">
                    {/* Logout Button inside the Profile Card */}
                    <button className="btn-logout-danger" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>

            <div className="profile-card info-card">
                <div className="card-header">
                    <h3>Personal Information</h3>
                </div>

                <div className="info-grid">
                    <div className="info-group">
                        <label>First Name</label>
                        <p>{userData.fullName.split(' ')[0]}</p>
                    </div>
                    <div className="info-group">
                        <label>Last Name</label>
                        <p>{userData.fullName.split(' ').slice(1).join(' ') || '—'}</p>
                    </div>
                    <div className="info-group">
                        <label>Email address</label>
                        <p>{userData.email}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;