import { Link, useNavigate } from "react-router-dom";

function NavAdmin({ setRole }) { // Receive setRole to log out
    const navigate = useNavigate();

    const handleLogout = () => {
        setRole(null); // Reset role in App.jsx
        localStorage.removeItem('userRole'); // Clear saved session
        navigate('/'); // Redirect to login page
    };

    return (
        <nav className="navbar navbar-expand-lg bg-body-tertiary">
            <div className="container-fluid">
                <Link className="navbar-brand" to="/admin">OyFound</Link>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav me-auto">
                        <li className="nav-item">
                            <Link to="/dashboard" className="nav-link">Dashboard</Link>
                        </li>
                        <li className="nav-item">
                            <Link to="/messages" className="nav-link">Messages</Link>
                        </li>
                    </ul>
                    {/* Logout Button */}
                    <button
                        className="logout-btn" 
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    );
}

export default NavAdmin;