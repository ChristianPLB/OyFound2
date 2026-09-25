import { signOut } from "firebase/auth";
import { useState } from "react";
import {
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";

import "./App.css";
import { auth } from "./firebase";

// Main authentication / public page
import Home from "./components/Home.jsx";

// Navigation
import NavAdmin from "./navbar/NavAdmin.jsx";
import NavStudent from "./navbar/NavStudent.jsx";

// Pages
import Contact from "./pages/Contact.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EditProfile from "./pages/EditProfile.jsx";
import HomeAdmin from "./pages/HomeAdmin.jsx";
import HomeStudent from "./pages/HomeStudent.jsx";
import Messages from "./pages/Messages.jsx";
import Profile from "./pages/Profile.jsx";
import ReportItem from "./pages/ReportItem.jsx";
import SMessages from "./pages/SMessages.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";

// CSS
import "./css/AISupportPage.css";
import "./css/Contact.css";
import "./css/Dashboard.css";
import "./css/Footer.css";
import "./css/Home.css";
import "./css/HomeAdmin.css";
import "./css/HomeStudent.css";
import "./css/Messages.css";
import "./css/Profile.css";
import "./css/Report.css";
import "./css/SMessages.css";


function App() {
    const [role, setRole] = useState(
        () => localStorage.getItem("userRole") || null
    );

    const [searchQuery, setSearchQuery] = useState("");

    const location = useLocation();
    const navigate = useNavigate();


    /* =========================================
       PUBLIC PAGES
       
       No navbar on these pages.
    ========================================= */

    const publicPages = [
        "/",
        "/login",
        "/register",
        "/forgot-password",
        "/contact",
    ];

    const isPublicPage =
        publicPages.includes(location.pathname);


    /* =========================================
       LOGOUT
    ========================================= */

    const handleLogout = async () => {
        try {
            await signOut(auth);

            localStorage.removeItem("userRole");
            localStorage.removeItem("studentId");

            setRole(null);
            setSearchQuery("");

            navigate("/");

        } catch (error) {
            console.error(
                "Logout error:",
                error
            );
        }
    };


    /* =========================================
       LAYOUT
    ========================================= */

    return (
        <div
            className={`app-layout ${
                isPublicPage
                    ? "no-sidebar-layout"
                    : ""
            }`}
            style={{
                display: "flex",
                minHeight: "100vh",
                width: "100%",
            }}
        >

            {/* =================================
                AUTHENTICATED NAVIGATION
            ================================= */}

            {!isPublicPage && (
                <aside
                    className="sidebar-container"
                    style={{
                        width: "260px",
                        flexShrink: 0,
                        zIndex: 10,
                    }}
                >

                    {/* ADMIN NAVBAR */}

                    {role === "admin" && (
                        <NavAdmin
                            setRole={setRole}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            onLogout={handleLogout}
                        />
                    )}


                    {/* STUDENT NAVBAR */}

                    {role === "student" && (
                        <NavStudent
                            setRole={setRole}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            onLogout={handleLogout}
                        />
                    )}


                    {/* PARENT NAVBAR */}

                    {role === "parent" && (
                        <NavStudent
                            setRole={setRole}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            onLogout={handleLogout}
                        />
                    )}

                </aside>
            )}


            {/* =================================
                MAIN CONTENT
            ================================= */}

            <main
                className="main-content"
                style={{
                    flexGrow: 1,
                    minWidth: 0,
                    position: "relative",
                    width: isPublicPage
                        ? "100%"
                        : "auto",
                }}
            >

                <Routes>

                    {/* =================================
                        PUBLIC
                    ================================= */}

                    <Route
                        path="/"
                        element={
                            <Home
                                setRole={setRole}
                            />
                        }
                    />

                    <Route
                        path="/login"
                        element={
                            <Home
                                setRole={setRole}
                            />
                        }
                    />

                    <Route
                        path="/register"
                        element={
                            <Home
                                setRole={setRole}
                            />
                        }
                    />

                    <Route
                        path="/contact"
                        element={
                            <Contact />
                        }
                    />


                    {/* =================================
                        ADMIN
                    ================================= */}

                    {role === "admin" && (
                        <>

                            <Route
                                path="/admin"
                                element={
                                    <HomeAdmin
                                        searchQuery={
                                            searchQuery
                                        }
                                    />
                                }
                            />

                            <Route
                                path="/messages"
                                element={
                                    <Messages />
                                }
                            />

                            <Route
                                path="/dashboard"
                                element={
                                    <Dashboard />
                                }
                            />

                            <Route
                                path="/report"
                                element={
                                    <ReportItem />
                                }
                            />

                        </>
                    )}


                    {/* =================================
                        STUDENT
                    ================================= */}

                    {role === "student" && (
                        <>

                            <Route
                                path="/student"
                                element={
                                    <HomeStudent
                                        searchQuery={
                                            searchQuery
                                        }
                                    />
                                }
                            />

                            <Route
                                path="/studentdashboard"
                                element={
                                    <StudentDashboard />
                                }
                            />

                            <Route
                                path="/studentmessages"
                                element={
                                    <SMessages />
                                }
                            />

                        </>
                    )}


                    {/* =================================
                        PARENT
                    ================================= */}

                    {role === "parent" && (
                        <>

                            {/*
                             * Parent currently uses the
                             * student home/dashboard
                             * pages until dedicated
                             * parent pages are created.
                             */}

                            <Route
                                path="/student"
                                element={
                                    <HomeStudent
                                        searchQuery={
                                            searchQuery
                                        }
                                    />
                                }
                            />

                            <Route
                                path="/studentdashboard"
                                element={
                                    <StudentDashboard />
                                }
                            />

                            <Route
                                path="/studentmessages"
                                element={
                                    <SMessages />
                                }
                            />

                        </>
                    )}


                    {/* =================================
                        PROFILE
                    ================================= */}

                    {role && (
                        <>

                            <Route
                                path="/profile"
                                element={
                                    <Profile
                                        setRole={
                                            setRole
                                        }
                                    />
                                }
                            />

                            <Route
                                path="/edit-profile"
                                element={
                                    <EditProfile
                                        setRole={
                                            setRole
                                        }
                                    />
                                }
                            />

                        </>
                    )}


                    {/* =================================
                        FALLBACK
                    ================================= */}

                    <Route
                        path="*"
                        element={
                            <Home
                                setRole={setRole}
                            />
                        }
                    />

                </Routes>

            </main>

        </div>
    );
}


export default App;