import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
} from "firebase/auth";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    serverTimestamp,
    setDoc,
    where,
} from "firebase/firestore";

import { useEffect, useState } from "react";
import {
    useLocation,
    useNavigate,
} from "react-router-dom";

import googleIcon from "../assets/g.png.webp";
import { auth, db } from "../firebase";

import "../css/Home.css";


function Home({ setRole }) {
    const location = useLocation();
    const navigate = useNavigate();

    const path = location.pathname;

    const isHome = path === "/";
    const isLogin = path === "/login";
    const isRegister = path === "/register";


    /* =========================================
       GENERAL AUTH STATE
    ========================================= */

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");


    /* =========================================
       LOGIN STATE
    ========================================= */

    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");


    /* =========================================
       REGISTRATION STATE
    ========================================= */

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        phone: "",
        studentId: "",

        department: "",
        collegeDept: "",
        block: "",
        yearLevel: "",

        shsCourse: "",
        jhsGradeLevel: "",

        gender: "",

        birthMonth: "",
        birthDay: "",
        birthYear: "",

        email: "",
        password: "",
        confirmPassword: "",

        role: "",
    });

    const [verificationSent, setVerificationSent] =
        useState(false);


    /* =========================================
       OAUTH DATA
    ========================================= */

    const oauthData = location.state || null;


    /* =========================================
       DATE OPTIONS
    ========================================= */

    const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];

    const currentYear = new Date().getFullYear();

    const years = Array.from(
        { length: 100 },
        (_, index) => currentYear - index
    );

    const days = Array.from(
        { length: 31 },
        (_, index) => index + 1
    );


    /* =========================================
       ELEMENTARY CHECK
    ========================================= */

    const isElementaryStudent =
        formData.role === "student" &&
        formData.department === "Elementary";


    /* =========================================
       OAUTH PREFILL
    ========================================= */

    useEffect(() => {
        if (!oauthData?.email) {
            return;
        }

        const names = oauthData.displayName
            ? oauthData.displayName.split(" ")
            : ["", ""];

        setFormData((previous) => ({
            ...previous,
            email: oauthData.email,
            firstName: names[0] || "",
            lastName: names.slice(1).join(" ") || "",
        }));
    }, [oauthData]);


    /* =========================================
       CLEAR MESSAGES WHEN PAGE CHANGES
    ========================================= */

    useEffect(() => {
        setError("");
        setSuccess("");
        setVerificationSent(false);
    }, [path]);


    /* =========================================
       NAVIGATION
    ========================================= */

    const goToLogin = () => {
        setError("");
        setSuccess("");
        navigate("/login");
    };


    const goToRegister = () => {
        setError("");
        setSuccess("");
        navigate("/register");
    };


    const goHome = () => {
        setError("");
        setSuccess("");
        navigate("/");
    };


    /* =========================================
       FIND USER ROLE
       
       IMPORTANT:
       Registration saves users inside:
       
           users/{firebaseUid}
       
       Therefore login also reads:
       
           users/{firebaseUid}
    ========================================= */

    const getUserRole = async (user) => {
        try {
            /* =================================
               FIRST: FIND BY FIREBASE UID
            ================================= */

            const userRef = doc(
                db,
                "users",
                user.uid
            );

            const userSnapshot =
                await getDoc(userRef);


            if (userSnapshot.exists()) {
                const userData =
                    userSnapshot.data();

                const userRole =
                    userData.role;


                if (!userRole) {
                    return null;
                }


                localStorage.setItem(
                    "userRole",
                    userRole
                );


                if (userData.studentId) {
                    localStorage.setItem(
                        "studentId",
                        userData.studentId
                    );
                }


                setRole?.(userRole);

                return userRole;
            }


            /* =================================
               SECOND: FALLBACK BY EMAIL
               
               This helps find older users whose
               UID may not match the document ID.
            ================================= */

            if (user.email) {
                const usersQuery = query(
                    collection(db, "users"),
                    where(
                        "email",
                        "==",
                        user.email
                    )
                );

                const usersSnapshot =
                    await getDocs(usersQuery);


                if (!usersSnapshot.empty) {
                    const userData =
                        usersSnapshot
                            .docs[0]
                            .data();

                    const userRole =
                        userData.role;


                    if (!userRole) {
                        return null;
                    }


                    localStorage.setItem(
                        "userRole",
                        userRole
                    );


                    if (userData.studentId) {
                        localStorage.setItem(
                            "studentId",
                            userData.studentId
                        );
                    }


                    setRole?.(userRole);

                    return userRole;
                }
            }


            return null;

        } catch (err) {
            console.error(
                "Error finding user role:",
                err
            );

            return null;
        }
    };


    /* =========================================
       REDIRECT BY ROLE
    ========================================= */

    const redirectByRole = (userRole) => {
        switch (userRole) {
            case "admin":
                navigate("/admin");
                break;

            case "student":
                navigate("/student");
                break;

            case "parent":
                navigate("/student");
                break;

            default:
                navigate("/");
        }
    };


    /* =========================================
       EMAIL LOGIN
    ========================================= */

    const handleLogin = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    loginEmail.trim(),
                    loginPassword
                );

            // Refresh the Firebase user so emailVerified is always current.
            // This is important when the user verified the email in another tab/device.
            await userCredential.user.reload();

            const user =
                auth.currentUser;

            if (!user) {
                setError(
                    "Unable to load your account. Please try logging in again."
                );
                return;
            }


            /* =================================
               EMAIL VERIFICATION
            ================================= */

            if (!user.emailVerified) {
                setError(
                    "Please verify your email address before logging in. " +
                    "After clicking the verification link, return here and try again."
                );

                return;
            }


            /* =================================
               FIND ROLE
            ================================= */

            const userRole =
                await getUserRole(user);


            if (!userRole) {
                setError(
                    "Your account was authenticated, but no user profile or role was found."
                );

                return;
            }


            redirectByRole(userRole);

        } catch (err) {
            console.error(
                "Login error:",
                err
            );


            switch (err.code) {
                case "auth/invalid-credential":
                case "auth/wrong-password":
                case "auth/user-not-found":

                    setError(
                        "Invalid email or password."
                    );

                    break;


                case "auth/invalid-email":

                    setError(
                        "Please enter a valid email address."
                    );

                    break;


                case "auth/too-many-requests":

                    setError(
                        "Too many failed attempts. Please try again later."
                    );

                    break;


                case "auth/user-disabled":

                    setError(
                        "This account has been disabled."
                    );

                    break;


                default:

                    setError(
                        "Unable to log in. Please try again."
                    );
            }

        } finally {
            setLoading(false);
        }
    };


    /* =========================================
       GOOGLE LOGIN
    ========================================= */

    const loginWithGoogle = async () => {
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const provider =
                new GoogleAuthProvider();

            provider.setCustomParameters({
                prompt: "select_account",
            });

            // signInWithPopup works on Vercel as long as the deployed
            // domain is added to Firebase Authentication > Authorized domains.
            const result =
                await signInWithPopup(
                    auth,
                    provider
                );

            // Google accounts are already verified. Reload to make sure
            // Firebase has the latest account state.
            await result.user.reload();

            const user =
                auth.currentUser;

            if (!user) {
                setError(
                    "Unable to load your Google account. Please try again."
                );
                return;
            }

            const userRole =
                await getUserRole(user);

            if (!userRole) {
                setError(
                    "Google sign-in worked, but this Google account is not registered in OyFound."
                );
                return;
            }

            redirectByRole(userRole);

        } catch (err) {
            console.error(
                "Google login error:",
                err
            );

            switch (err.code) {
                case "auth/popup-closed-by-user":
                    setError(
                        "Google sign-in was cancelled."
                    );
                    break;

                case "auth/popup-blocked":
                    setError(
                        "Your browser blocked the Google sign-in popup. Please allow popups for this website and try again."
                    );
                    break;

                case "auth/unauthorized-domain":
                    setError(
                        "This website domain is not authorized for Google sign-in. Add your Vercel domain in Firebase Authentication > Settings > Authorized domains."
                    );
                    break;

                case "auth/operation-not-allowed":
                    setError(
                        "Google sign-in is not enabled. Enable Google under Firebase Authentication > Sign-in method."
                    );
                    break;

                case "auth/account-exists-with-different-credential":
                    setError(
                        "An account already exists with this email using a different sign-in method. Please use the original sign-in method."
                    );
                    break;

                case "auth/network-request-failed":
                    setError(
                        "Network error while connecting to Google. Check your internet connection and try again."
                    );
                    break;

                default:
                    setError(
                        err?.message
                            ? `Google sign-in failed: ${err.message}`
                            : "Unable to sign in with Google. Please try again."
                    );
                    break;
            }

        } finally {
            setLoading(false);
        }
    };


    /* =========================================
       FORGOT PASSWORD
    ========================================= */

    const handleForgotPassword = async () => {
        if (!loginEmail.trim()) {
            setError(
                "Please enter your email address first."
            );

            return;
        }


        setError("");
        setSuccess("");


        try {
            await sendPasswordResetEmail(
                auth,
                loginEmail.trim()
            );


            setSuccess(
                "Password reset email sent. Please check your inbox."
            );

        } catch (err) {
            console.error(
                "Password reset error:",
                err
            );


            if (
                err.code ===
                "auth/user-not-found"
            ) {
                setError(
                    "No account was found with this email."
                );
            } else {
                setError(
                    "Unable to send password reset email."
                );
            }
        }
    };


    /* =========================================
       REGISTRATION INPUT
    ========================================= */

    const handleInputChange = (event) => {
        const {
            name,
            value,
        } = event.target;


        if (name === "department") {
            setFormData((previous) => ({
                ...previous,

                department: value,

                collegeDept: "",
                block: "",
                yearLevel: "",

                shsCourse: "",
                jhsGradeLevel: "",

                phone:
                    value === "Elementary"
                        ? ""
                        : previous.phone,

                email:
                    value === "Elementary"
                        ? ""
                        : previous.email,
            }));

        } else {
            setFormData((previous) => ({
                ...previous,
                [name]: value,
            }));
        }


        if (error) {
            setError("");
        }
    };


    /* =========================================
       CHECK EXISTING ADMIN
    ========================================= */

    const checkIfAdminExists = async () => {
        const adminQuery =
            query(
                collection(db, "users"),
                where(
                    "role",
                    "==",
                    "admin"
                )
            );


        const snapshot =
            await getDocs(adminQuery);


        return !snapshot.empty;
    };


    /* =========================================
       ROLE-SPECIFIC DATA
    ========================================= */

    const getRoleSpecificData = (role) => {
        const formattedBirthdate =
            formData.birthYear &&
            formData.birthMonth &&
            formData.birthDay
                ? `${formData.birthYear}-${String(
                    formData.birthMonth
                ).padStart(2, "0")}-${String(
                    formData.birthDay
                ).padStart(2, "0")}`
                : "";


        /* STUDENT */

        if (role === "student") {
            const baseStudentData = {
                studentId:
                    formData.studentId || "",

                department:
                    formData.department || "",

                gender:
                    formData.gender || "",

                birthdate:
                    formattedBirthdate,
            };


            if (
                formData.department !==
                "Elementary"
            ) {
                baseStudentData.phone =
                    formData.phone || "";
            }


            if (
                formData.department ===
                "College"
            ) {
                return {
                    ...baseStudentData,

                    collegeDept:
                        formData.collegeDept || "",

                    block:
                        formData.block || "",

                    yearLevel:
                        formData.yearLevel || "",
                };
            }


            if (
                formData.department ===
                "Senior High"
            ) {
                return {
                    ...baseStudentData,

                    shsCourse:
                        formData.shsCourse || "",
                };
            }


            if (
                formData.department ===
                "Junior High"
            ) {
                return {
                    ...baseStudentData,

                    jhsGradeLevel:
                        formData.jhsGradeLevel || "",
                };
            }


            return baseStudentData;
        }


        /* PARENT */

        if (role === "parent") {
            return {
                phone:
                    formData.phone || "",

                gender:
                    formData.gender || "",

                birthdate:
                    formattedBirthdate,
            };
        }


        /* ADMIN */

        if (role === "admin") {
            return {
                phone:
                    formData.phone || "",

                gender:
                    formData.gender || "",

                birthdate:
                    formattedBirthdate,
            };
        }


        return {};
    };


    /* =========================================
       REGISTRATION
    ========================================= */

    const handleSignUp = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");
        setLoading(true);


        try {
            /* =================================
               ROLE
            ================================= */

            if (!formData.role) {
                setError(
                    "Please select a role first."
                );

                return;
            }


            /* =================================
               BIRTHDATE
            ================================= */

            if (
                !formData.birthMonth ||
                !formData.birthDay ||
                !formData.birthYear
            ) {
                setError(
                    "Please complete your birthdate."
                );

                return;
            }


            /* =================================
               PASSWORD
            ================================= */

            if (
                !isElementaryStudent &&
                !oauthData &&
                formData.password !==
                    formData.confirmPassword
            ) {
                setError(
                    "Passwords do not match."
                );

                return;
            }


            /* =================================
               ADMIN LIMIT
            ================================= */

            if (
                formData.role === "admin"
            ) {
                const adminExists =
                    await checkIfAdminExists();


                if (adminExists) {
                    setError(
                        "Registration failed: Only one admin is allowed in the system."
                    );

                    return;
                }
            }


            const extraRoleData =
                getRoleSpecificData(
                    formData.role
                );


            /* =================================
               ELEMENTARY STUDENT
               
               NOTE:
               This type does NOT create a
               Firebase Authentication account.
            ================================= */

            if (isElementaryStudent) {
                if (!formData.studentId) {
                    setError(
                        "Please enter the Student ID."
                    );

                    return;
                }


                const studentDocRef =
                    doc(
                        db,
                        "users",
                        formData.studentId
                    );


                await setDoc(
                    studentDocRef,
                    {
                        uid:
                            formData.studentId,

                        fullName:
                            `${formData.firstName} ${formData.lastName}`
                                .trim(),

                        ...extraRoleData,

                        role:
                            formData.role,

                        createdAt:
                            serverTimestamp(),

                        emailVerified:
                            true,
                    }
                );


                localStorage.setItem(
                    "userRole",
                    "student"
                );

                localStorage.setItem(
                    "studentId",
                    formData.studentId
                );


                setRole?.("student");

                navigate("/student");

                return;
            }


            /* =================================
               OAUTH REGISTRATION
            ================================= */

            if (oauthData?.uid) {
                await setDoc(
                    doc(
                        db,
                        "users",
                        oauthData.uid
                    ),
                    {
                        uid:
                            oauthData.uid,

                        fullName:
                            `${formData.firstName} ${formData.lastName}`
                                .trim(),

                        email:
                            formData.email,

                        ...extraRoleData,

                        role:
                            formData.role,

                        createdAt:
                            serverTimestamp(),

                        emailVerified:
                            true,
                    }
                );


                localStorage.setItem(
                    "userRole",
                    formData.role
                );


                if (formData.studentId) {
                    localStorage.setItem(
                        "studentId",
                        formData.studentId
                    );
                }


                setRole?.(
                    formData.role
                );


                redirectByRole(
                    formData.role
                );

                return;
            }


            /* =================================
               NORMAL EMAIL REGISTRATION
            ================================= */

            if (!formData.email.trim()) {
                setError(
                    "Please enter your email address."
                );

                return;
            }


            if (!formData.password) {
                setError(
                    "Please enter a password."
                );

                return;
            }


            const result =
                await createUserWithEmailAndPassword(
                    auth,
                    formData.email.trim(),
                    formData.password
                );


            const user =
                result.user;


            /* =================================
               SEND EMAIL VERIFICATION
            ================================= */

            try {
                await sendEmailVerification(
                    user
                );

            } catch (emailError) {
                console.error(
                    "Verification email error:",
                    emailError
                );

                setError(
                    "Account created, but the verification email could not be sent."
                );

                return;
            }


            /* =================================
               SAVE USER PROFILE
            ================================= */

            await setDoc(
                doc(
                    db,
                    "users",
                    user.uid
                ),
                {
                    uid:
                        user.uid,

                    fullName:
                        `${formData.firstName} ${formData.lastName}`
                            .trim(),

                    email:
                        formData.email.trim(),

                    ...extraRoleData,

                    role:
                        formData.role,

                    createdAt:
                        serverTimestamp(),

                    emailVerified:
                        false,
                }
            );


            /*
             * Do NOT set the role here.
             *
             * The user still needs to verify
             * their email first.
             */

            setVerificationSent(true);

        } catch (err) {
            console.error(
                "Registration error:",
                err
            );


            switch (err.code) {
                case "auth/email-already-in-use":

                    setError(
                        "The email is already taken. Please use a different email or login."
                    );

                    break;


                case "auth/invalid-email":

                    setError(
                        "Please enter a valid email address."
                    );

                    break;


                case "auth/weak-password":

                    setError(
                        "Password should be at least 6 characters."
                    );

                    break;


                default:

                    setError(
                        "Registration failed: " +
                        err.message
                    );
            }

        } finally {
            setLoading(false);
        }
    };


    /* =========================================
       VERIFICATION SCREEN
    ========================================= */

    if (
        isRegister &&
        verificationSent
    ) {
        return (
            <div className="auth-page">

                <div className="auth-background">
                    <div className="auth-orb auth-orb-one"></div>
                    <div className="auth-orb auth-orb-two"></div>
                    <div className="auth-orb auth-orb-three"></div>
                </div>


                <div
                    className="auth-brand"
                    onClick={goHome}
                >
                    <span className="brand-dot"></span>
                    OyFound
                </div>


                <div className="auth-card verification-card">

                    <div className="verification-content">

                        <div className="verification-icon">
                            ✓
                        </div>


                        <h1>
                            Verify your Email
                        </h1>


                        <p>
                            We sent a verification link to
                        </p>


                        <strong>
                            {formData.email}
                        </strong>


                        <p>
                            Please check your inbox and
                            verify your account before
                            continuing.
                        </p>


                        <button
                            type="button"
                            className="primary-auth-button"
                            onClick={goToLogin}
                        >
                            GO TO LOGIN
                        </button>

                    </div>

                </div>

            </div>
        );
    }


    /* =========================================
       HOME SCREEN
    ========================================= */

    if (isHome) {
        return (
            <div className="auth-page">

                <div className="auth-background">
                    <div className="auth-orb auth-orb-one"></div>
                    <div className="auth-orb auth-orb-two"></div>
                    <div className="auth-orb auth-orb-three"></div>
                </div>


                <div
                    className="auth-brand"
                    onClick={goHome}
                >
                    <span className="brand-dot"></span>
                    OyFound
                </div>


                <div className="welcome-card">

                    <div className="welcome-card-content">

                        <div className="welcome-eyebrow">
                            OYFOUND
                        </div>


                        <h1>
                            Welcome to OyFound
                        </h1>


                        <p>
                            Helping lost belongings find
                            their way home.
                        </p>


                        <div className="welcome-actions">

                            <button
                                type="button"
                                className="primary-auth-button"
                                onClick={goToLogin}
                            >
                                LOGIN
                            </button>


                            <button
                                type="button"
                                className="secondary-auth-button"
                                onClick={goToRegister}
                            >
                                REGISTER
                            </button>

                        </div>

                    </div>

                </div>

            </div>
        );
    }


    /* =========================================
       AUTHENTICATION CARD
    ========================================= */

    return (
        <div className="auth-page">

            <div className="auth-background">

                <div className="auth-orb auth-orb-one"></div>
                <div className="auth-orb auth-orb-two"></div>
                <div className="auth-orb auth-orb-three"></div>

            </div>


            {/* BRAND */}

            <div
                className="auth-brand"
                onClick={goHome}
            >
                <span className="brand-dot"></span>
                OyFound
            </div>


            <div
                className={`auth-card ${
                    isRegister
                        ? "register-card"
                        : "login-card"
                }`}
            >

                {/* =================================
                    LOGIN MODE
                ================================= */}

                {isLogin && (
                    <>

                        {/* WELCOME PANEL */}

                        <div className="welcome-panel">

                            <div className="welcome-panel-content">

                                <div className="welcome-eyebrow">
                                    OYFOUND
                                </div>


                                <h1>
                                    Welcome Back!
                                </h1>


                                <p>
                                    Sign in to continue
                                    your journey and help
                                    lost belongings find
                                    their way home.
                                </p>


                                <div className="welcome-divider"></div>


                                <p className="welcome-small-text">
                                    Don't have an account?
                                </p>


                                <button
                                    type="button"
                                    className="outline-auth-button"
                                    onClick={goToRegister}
                                >
                                    REGISTER
                                </button>

                            </div>

                        </div>


                        {/* LOGIN FORM */}

                        <div className="form-panel">

                            <div className="form-wrapper">

                                <h2>
                                    Sign In
                                </h2>


                                <p className="form-subtitle">
                                    Sign in to continue to OyFound
                                </p>


                                {error && (
                                    <div className="auth-error">
                                        {error}
                                    </div>
                                )}


                                {success && (
                                    <div className="auth-success">
                                        {success}
                                    </div>
                                )}


                                <form
                                    onSubmit={handleLogin}
                                >

                                    <div className="form-input-group">

                                        <label>
                                            Email Address
                                        </label>


                                        <input
                                            type="email"
                                            placeholder="Enter your email"
                                            value={loginEmail}
                                            onChange={(e) =>
                                                setLoginEmail(
                                                    e.target.value
                                                )
                                            }
                                            required
                                        />

                                    </div>


                                    <div className="form-input-group">

                                        <label>
                                            Password
                                        </label>


                                        <input
                                            type="password"
                                            placeholder="Enter your password"
                                            value={loginPassword}
                                            onChange={(e) =>
                                                setLoginPassword(
                                                    e.target.value
                                                )
                                            }
                                            required
                                        />

                                    </div>


                                    <div className="forgot-row">

                                        <button
                                            type="button"
                                            onClick={
                                                handleForgotPassword
                                            }
                                        >
                                            Forgot your password?
                                        </button>

                                    </div>


                                    <button
                                        type="submit"
                                        className="primary-form-button"
                                        disabled={loading}
                                    >
                                        {loading
                                            ? "SIGNING IN..."
                                            : "SIGN IN"}
                                    </button>

                                </form>


                                <div className="or-divider">

                                    <span></span>

                                    <p>
                                        OR
                                    </p>

                                    <span></span>

                                </div>


                                <button
                                    type="button"
                                    className="google-button"
                                    onClick={
                                        loginWithGoogle
                                    }
                                    disabled={loading}
                                >

                                    <img
                                        src={googleIcon}
                                        alt="Google"
                                    />

                                    <span>
                                        Continue with Google
                                    </span>

                                </button>


                                <div className="switch-auth">

                                    <span>
                                        Don't have an account?
                                    </span>


                                    <button
                                        type="button"
                                        onClick={
                                            goToRegister
                                        }
                                    >
                                        Register
                                    </button>

                                </div>

                            </div>

                        </div>

                    </>
                )}


                {/* =================================
                    REGISTER MODE
                ================================= */}

                {isRegister && (
                    <>

                        {/* REGISTER FORM */}

                        <div className="form-panel register-form-panel">

                            <div className="form-wrapper register-wrapper">

                                <h2>
                                    Create Account
                                </h2>


                                <p className="form-subtitle">

                                    Already have an account?

                                    <button
                                        type="button"
                                        className="inline-auth-link"
                                        onClick={
                                            goToLogin
                                        }
                                    >
                                        Login
                                    </button>

                                </p>


                                {error && (
                                    <div className="auth-error">
                                        {error}
                                    </div>
                                )}


                                <form
                                    onSubmit={
                                        handleSignUp
                                    }
                                >

                                    <div className="register-grid">

                                        {/* FIRST NAME */}

                                        <div>
                                            <input
                                                type="text"
                                                name="firstName"
                                                placeholder="First Name"
                                                value={
                                                    formData.firstName
                                                }
                                                onChange={
                                                    handleInputChange
                                                }
                                                required
                                            />
                                        </div>


                                        {/* LAST NAME */}

                                        <div>
                                            <input
                                                type="text"
                                                name="lastName"
                                                placeholder="Last Name"
                                                value={
                                                    formData.lastName
                                                }
                                                onChange={
                                                    handleInputChange
                                                }
                                                required
                                            />
                                        </div>


                                        {/* ROLE */}

                                        <div>
                                            <select
                                                name="role"
                                                value={
                                                    formData.role
                                                }
                                                onChange={
                                                    handleInputChange
                                                }
                                                required
                                            >

                                                <option
                                                    value=""
                                                    disabled
                                                >
                                                    Select Role
                                                </option>


                                                <option value="student">
                                                    Student
                                                </option>


                                                <option value="parent">
                                                    Parent
                                                </option>


                                                <option value="admin">
                                                    Admin
                                                </option>

                                            </select>
                                        </div>


                                        {/* STUDENT */}

                                        {formData.role === "student" && (
                                            <>

                                                <div>
                                                    <input
                                                        type="text"
                                                        name="studentId"
                                                        placeholder="Student ID"
                                                        value={
                                                            formData.studentId
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        required
                                                    />
                                                </div>


                                                <div>
                                                    <select
                                                        name="department"
                                                        value={
                                                            formData.department
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        required
                                                    >

                                                        <option
                                                            value=""
                                                            disabled
                                                        >
                                                            Select Department
                                                        </option>


                                                        <option value="College">
                                                            College
                                                        </option>


                                                        <option value="Senior High">
                                                            Senior High
                                                        </option>


                                                        <option value="Junior High">
                                                            Junior High
                                                        </option>


                                                        <option value="Elementary">
                                                            Elementary
                                                        </option>

                                                    </select>
                                                </div>


                                                {/* COLLEGE */}

                                                {formData.department ===
                                                    "College" && (
                                                    <>

                                                        <div>
                                                            <select
                                                                name="collegeDept"
                                                                value={
                                                                    formData.collegeDept
                                                                }
                                                                onChange={
                                                                    handleInputChange
                                                                }
                                                                required
                                                            >

                                                                <option
                                                                    value=""
                                                                    disabled
                                                                >
                                                                    Select Program
                                                                </option>


                                                                <option value="BEED">
                                                                    BEED
                                                                </option>


                                                                <option value="BSED">
                                                                    BSED
                                                                </option>


                                                                <option value="BPED">
                                                                    BPED
                                                                </option>


                                                                <option value="BSEntrep">
                                                                    BSEntrep
                                                                </option>


                                                                <option value="BSHM">
                                                                    BSHM
                                                                </option>


                                                                <option value="BSIT">
                                                                    BSIT
                                                                </option>

                                                            </select>
                                                        </div>


                                                        <div>
                                                            <select
                                                                name="block"
                                                                value={
                                                                    formData.block
                                                                }
                                                                onChange={
                                                                    handleInputChange
                                                                }
                                                                required
                                                            >

                                                                <option
                                                                    value=""
                                                                    disabled
                                                                >
                                                                    Select Block
                                                                </option>


                                                                <option value="A">
                                                                    Block A
                                                                </option>


                                                                <option value="B">
                                                                    Block B
                                                                </option>


                                                                <option value="C">
                                                                    Block C
                                                                </option>


                                                                <option value="D">
                                                                    Block D
                                                                </option>


                                                                <option value="E">
                                                                    Block E
                                                                </option>

                                                            </select>
                                                        </div>


                                                        <div>
                                                            <select
                                                                name="yearLevel"
                                                                value={
                                                                    formData.yearLevel
                                                                }
                                                                onChange={
                                                                    handleInputChange
                                                                }
                                                                required
                                                            >

                                                                <option
                                                                    value=""
                                                                    disabled
                                                                >
                                                                    Select Year Level
                                                                </option>


                                                                <option value="1">
                                                                    1st Year
                                                                </option>


                                                                <option value="2">
                                                                    2nd Year
                                                                </option>


                                                                <option value="3">
                                                                    3rd Year
                                                                </option>


                                                                <option value="4">
                                                                    4th Year
                                                                </option>

                                                            </select>
                                                        </div>

                                                    </>
                                                )}


                                                {/* SENIOR HIGH */}

                                                {formData.department ===
                                                    "Senior High" && (
                                                    <div className="full-width">

                                                        <select
                                                            name="shsCourse"
                                                            value={
                                                                formData.shsCourse
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            required
                                                        >

                                                            <option
                                                                value=""
                                                                disabled
                                                            >
                                                                Select Strand / Track
                                                            </option>


                                                            <option value="ABM">
                                                                ABM
                                                            </option>


                                                            <option value="HUMSS">
                                                                HUMSS
                                                            </option>


                                                            <option value="STEM">
                                                                STEM
                                                            </option>


                                                            <option value="TVL: ICT">
                                                                TVL: ICT
                                                            </option>


                                                            <option value="TVL: HE">
                                                                TVL: HE
                                                            </option>

                                                        </select>

                                                    </div>
                                                )}


                                                {/* JUNIOR HIGH */}

                                                {formData.department ===
                                                    "Junior High" && (
                                                    <div className="full-width">

                                                        <select
                                                            name="jhsGradeLevel"
                                                            value={
                                                                formData.jhsGradeLevel
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            required
                                                        >

                                                            <option
                                                                value=""
                                                                disabled
                                                            >
                                                                Select Grade Level
                                                            </option>


                                                            <option value="7">
                                                                Grade 7
                                                            </option>


                                                            <option value="8">
                                                                Grade 8
                                                            </option>


                                                            <option value="9">
                                                                Grade 9
                                                            </option>


                                                            <option value="10">
                                                                Grade 10
                                                            </option>

                                                        </select>

                                                    </div>
                                                )}


                                                {/* GENDER */}

                                                <div>
                                                    <select
                                                        name="gender"
                                                        value={
                                                            formData.gender
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        required
                                                    >

                                                        <option
                                                            value=""
                                                            disabled
                                                        >
                                                            Select Gender
                                                        </option>


                                                        <option value="male">
                                                            Male
                                                        </option>


                                                        <option value="female">
                                                            Female
                                                        </option>


                                                        <option value="other">
                                                            Other
                                                        </option>

                                                    </select>
                                                </div>


                                                {/* PHONE */}

                                                {!isElementaryStudent && (
                                                    <div>
                                                        <input
                                                            type="tel"
                                                            name="phone"
                                                            placeholder="Phone Number"
                                                            value={
                                                                formData.phone
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            required
                                                        />
                                                    </div>
                                                )}

                                            </>
                                        )}


                                        {/* PARENT */}

                                        {formData.role === "parent" && (
                                            <>

                                                <div>
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        placeholder="Phone Number"
                                                        value={
                                                            formData.phone
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        required
                                                    />
                                                </div>


                                                <div>
                                                    <select
                                                        name="gender"
                                                        value={
                                                            formData.gender
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        required
                                                    >

                                                        <option
                                                            value=""
                                                            disabled
                                                        >
                                                            Select Gender
                                                        </option>


                                                        <option value="male">
                                                            Male
                                                        </option>


                                                        <option value="female">
                                                            Female
                                                        </option>


                                                        <option value="other">
                                                            Other
                                                        </option>

                                                    </select>
                                                </div>

                                            </>
                                        )}


                                        {/* ADMIN */}

                                        {formData.role === "admin" && (
                                            <>

                                                <div>
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        placeholder="Phone Number"
                                                        value={
                                                            formData.phone
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        required
                                                    />
                                                </div>


                                                <div>
                                                    <select
                                                        name="gender"
                                                        value={
                                                            formData.gender
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        required
                                                    >

                                                        <option
                                                            value=""
                                                            disabled
                                                        >
                                                            Select Gender
                                                        </option>


                                                        <option value="male">
                                                            Male
                                                        </option>


                                                        <option value="female">
                                                            Female
                                                        </option>


                                                        <option value="other">
                                                            Other
                                                        </option>

                                                    </select>
                                                </div>

                                            </>
                                        )}


                                        {/* BIRTHDATE */}

                                        {formData.role && (
                                            <div className="birthdate-field full-width">

                                                <label>
                                                    Birthdate
                                                </label>


                                                <div className="birthdate-grid">

                                                    <select
                                                        name="birthMonth"
                                                        value={
                                                            formData.birthMonth
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        required
                                                    >

                                                        <option
                                                            value=""
                                                            disabled
                                                        >
                                                            Month
                                                        </option>


                                                        {months.map(
                                                            (
                                                                month,
                                                                index
                                                            ) => (
                                                                <option
                                                                    key={month}
                                                                    value={
                                                                        index + 1
                                                                    }
                                                                >
                                                                    {month}
                                                                </option>
                                                            )
                                                        )}

                                                    </select>


                                                    <select
                                                        name="birthDay"
                                                        value={
                                                            formData.birthDay
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        required
                                                    >

                                                        <option
                                                            value=""
                                                            disabled
                                                        >
                                                            Day
                                                        </option>


                                                        {days.map(
                                                            (day) => (
                                                                <option
                                                                    key={day}
                                                                    value={
                                                                        day
                                                                    }
                                                                >
                                                                    {day}
                                                                </option>
                                                            )
                                                        )}

                                                    </select>


                                                    <select
                                                        name="birthYear"
                                                        value={
                                                            formData.birthYear
                                                        }
                                                        onChange={
                                                            handleInputChange
                                                        }
                                                        required
                                                    >

                                                        <option
                                                            value=""
                                                            disabled
                                                        >
                                                            Year
                                                        </option>


                                                        {years.map(
                                                            (year) => (
                                                                <option
                                                                    key={year}
                                                                    value={
                                                                        year
                                                                    }
                                                                >
                                                                    {year}
                                                                </option>
                                                            )
                                                        )}

                                                    </select>

                                                </div>

                                            </div>
                                        )}


                                        {/* EMAIL */}

                                        {!isElementaryStudent && (
                                            <div className="full-width">

                                                <input
                                                    type="email"
                                                    name="email"
                                                    placeholder="Email"
                                                    value={
                                                        formData.email
                                                    }
                                                    disabled={
                                                        !!oauthData
                                                    }
                                                    onChange={
                                                        handleInputChange
                                                    }
                                                    required
                                                />

                                            </div>
                                        )}


                                        {/* PASSWORD */}

                                        {!isElementaryStudent &&
                                            !oauthData && (
                                                <>

                                                    <div>
                                                        <input
                                                            type="password"
                                                            name="password"
                                                            placeholder="Password"
                                                            value={
                                                                formData.password
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            required
                                                        />
                                                    </div>


                                                    <div>
                                                        <input
                                                            type="password"
                                                            name="confirmPassword"
                                                            placeholder="Confirm Password"
                                                            value={
                                                                formData.confirmPassword
                                                            }
                                                            onChange={
                                                                handleInputChange
                                                            }
                                                            required
                                                        />
                                                    </div>

                                                </>
                                            )}

                                    </div>


                                    <button
                                        type="submit"
                                        className="primary-form-button register-submit"
                                        disabled={loading}
                                    >
                                        {loading
                                            ? "CREATING ACCOUNT..."
                                            : oauthData
                                                ? "FINISH REGISTRATION"
                                                : "SIGN UP"}
                                    </button>

                                </form>

                            </div>

                        </div>


                        {/* WELCOME / LOGIN PANEL */}

                        <div className="welcome-panel">

                            <div className="welcome-panel-content">

                                <div className="welcome-eyebrow">
                                    OYFOUND
                                </div>


                                <h1>
                                    Welcome Back!
                                </h1>


                                <p>
                                    To keep connected with us,
                                    please login with your
                                    personal information.
                                </p>


                                <div className="welcome-divider"></div>


                                <p className="welcome-small-text">
                                    Already have an account?
                                </p>


                                <button
                                    type="button"
                                    className="outline-auth-button"
                                    onClick={
                                        goToLogin
                                    }
                                >
                                    SIGN IN
                                </button>

                            </div>

                        </div>

                    </>
                )}

            </div>

        </div>
    );
}


export default Home;