import {
    createUserWithEmailAndPassword,
    FacebookAuthProvider,
    GoogleAuthProvider,
    sendEmailVerification,
    signInWithPopup
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';

function Register({ setRole }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        password: '',
        role: ''
    });
    const [verificationSent, setVerificationSent] = useState(false);
    const [serverError, setServerError] = useState(''); 
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (serverError) setServerError(''); 
    };

    // Helper function to handle Firestore user document creation for Social Auth
    const saveSocialUserToFirestore = async (user, chosenRole) => {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        // Only create a new document if the user doesn't already exist in Firestore
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                fullName: user.displayName || 'Social User',
                email: user.email,
                role: chosenRole, 
                createdAt: serverTimestamp(),
                emailVerified: user.emailVerified 
            });
        }
    };

    // Google Sign-Up Handler
    const handleGoogleSignUp = async () => {
        setServerError('');
        if (!formData.role) {
            setServerError("Please select a role first before signing up with Google!");
            return;
        }

        const provider = new GoogleAuthProvider();
        try {
            const res = await signInWithPopup(auth, provider);
            await saveSocialUserToFirestore(res.user, formData.role);
            
            // Pass the role upwards if your app relies on setRole state
            if (setRole) setRole(formData.role); 
            
            navigate('/'); // Redirect to dashboard/home after successful OAuth
        } catch (err) {
            setServerError("Google Auth Error: " + err.message);
        }
    };

    // Facebook Sign-Up Handler
    const handleFacebookSignUp = async () => {
        setServerError('');
        if (!formData.role) {
            setServerError("Please select a role first before signing up with Facebook!");
            return;
        }

        const provider = new FacebookAuthProvider();
        try {
            const res = await signInWithPopup(auth, provider);
            await saveSocialUserToFirestore(res.user, formData.role);
            
            if (setRole) setRole(formData.role);
            
            navigate('/'); 
        } catch (err) {
            // Note: Facebook might give errors if the email is already linked to Google
            if (err.code === 'auth/account-exists-with-different-credential') {
                setServerError("An account already exists with the same email address but different sign-in credentials.");
            } else {
                setServerError("Facebook Auth Error: " + err.message);
            }
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setServerError(''); 
        
        if (!formData.role) {
            setServerError("Please select a role first!");
            return;
        }

        try {
            const res = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            
            await sendEmailVerification(res.user);

            await setDoc(doc(db, "users", res.user.uid), {
                uid: res.user.uid,
                fullName: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                role: formData.role, 
                createdAt: serverTimestamp(),
                emailVerified: false 
            });

            setVerificationSent(true);

        } catch (err) {
            if (err.code === 'auth/email-already-in-use') {
                setServerError("The email is already taken. Please use a different one or login.");
            } else {
                setServerError("Auth Error: " + err.message);
            }
        }
    };

    if (verificationSent) {
        return (
            <div className="register-container">
                <div className="register-form verification-notice">
                    <h1 className="form-title">Verify your email</h1>
                    <p>We've sent a verification link to <strong>{formData.email}</strong>.</p>
                    <p>Please check your inbox (and spam folder) and click the link to activate your account.</p>
                    <hr />
                    <Link to="/login" className="signup-btn" style={{ textDecoration: 'none', display: 'block', textAlign: 'center' }}>
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="register-container">
            <div className="register-form">
                <h1 className="form-title">Create account</h1>
                <p>Already have an account? <Link to="/login" className="login-link">Login</Link></p>

                {serverError && (
                    <div className="error-message" style={{ color: 'red', marginBottom: '15px', fontWeight: 'bold' }}>
                        {serverError}
                    </div>
                )}
                {/* Social Sign Up Buttons */}
                <div className="social-signup-container" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button 
                        type="button" 
                        onClick={handleGoogleSignUp} 
                        className="google-btn"
                        style={{ flex: 1, padding: '10px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Sign up with Google
                    </button>
                    <button 
                        type="button" 
                        onClick={handleFacebookSignUp} 
                        className="facebook-btn"
                        style={{ flex: 1, padding: '10px', cursor: 'pointer', fontWeight: 'bold', backgroundColor: '#3b5998', color: 'white', border: 'none' }}
                    >
                        Sign up with Facebook
                    </button>
                </div>

                <div style={{ textAlign: 'center', margin: '15px 0', color: '#777' }}>- OR -</div>

                <form className="input-grid" onSubmit={handleSignUp}>
                    <input type="text" name="firstName" className="input-field" placeholder="Firstname" 
                        required={!formData.role} onChange={handleInputChange} />
                    <input type="text" name="lastName" className="input-field" placeholder="Lastname" 
                        required={!formData.role} onChange={handleInputChange} />
                     {/* Role selection pulled outside the main form so social buttons can read it safely */}
                <div style={{ marginBottom: '15px' }}>
                    <select 
                        name="role"
                        className="input-field select-field" 
                        style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                        value={formData.role} 
                        onChange={handleInputChange}
                        required
                    >
                        <option value="" disabled>Select Role *</option>
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                    <input type="email" name="email" className="input-field" placeholder="Email" 
                        required onChange={handleInputChange} />
                    <input type="password" name="password" className="input-field" placeholder="Password" 
                        required onChange={handleInputChange} />
                    
                    <button type="submit" className="signup-btn">Sign up</button>
                </form>
            </div>
        </div>
    );
}

export default Register;