import {
  FacebookAuthProvider,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword, // Added for Facebook
  signInWithPopup // Added for social popups
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore"; // Added setDoc for new social users
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';

function Login({ setRole }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(''); 
  const navigate = useNavigate();

  // Helper function to handle routing and Firestore syncing for OAuth providers
  const handleSocialLogin = async (provider) => {
    setError('');
    setMessage('');
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user already exists in your Firestore 'users' collection
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      let userRole = 'guest'; // Default role for new social sign-ins

      if (userDoc.exists()) {
        userRole = userDoc.data().role;
      } else {
        // If they are logging in for the first time via Google/FB, create a record for them
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: userRole, // Assigning default 'guest' role
          createdAt: new Date()
        });
      }

      // Sync state and redirect
      setRole(userRole);
      localStorage.setItem('userRole', userRole);
      navigate(`/${userRole}`);

    } catch (err) {
      setError(`Authentication failed: ${err.message}`);
      console.error(err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userRole = userData.role; 

        setRole(userRole);
        localStorage.setItem('userRole', userRole);
        navigate(`/${userRole}`); 
      } else {
        setError("Account details not found in database.");
      }
    } catch (err) {
      setError("Invalid email or password.");
      console.error(err.message);
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setMessage('');

    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent! Check your inbox.");
    } catch (err) {
      setError("Failed to send password reset email.");
      console.error(err.message);
    }
  };

  return (
    <div className="register-container">
      <div className="form-wrapper">
        <h1 className="form-title">Welcome back!🔍</h1>
        
        <form className="login-form-container" onSubmit={handleLogin}>
          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          {message && <p style={{ color: 'green', textAlign: 'center' }}>{message}</p>}
          
          <div className="input-group">
            <input type="email" className="input-field full-width" placeholder="Email" required 
                   value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type="password" className="input-field full-width" placeholder="Password" required 
                   value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div style={{ textAlign: 'right', marginBottom: '15px' }}>
            <span 
              onClick={handleForgotPassword} 
              style={{ color: '#007bff', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}
            >
              Forgot Password?
            </span>
          </div>

          <button type="submit" className="signup-btn login-btn-wide">Login</button>
        </form>

        {/* Social Logins Divider */}
        <div style={{ margin: '20px 0', textAlign: 'center', color: '#888' }}>
          <span>or sign in with</span>
        </div>

        {/* Social Login Buttons */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button 
            onClick={() => handleSocialLogin(new GoogleAuthProvider())}
            style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#df4a32', color: '#fff', border: 'none', borderRadius: '4px', flex: 1 }}
          >
            Google
          </button>
          <button 
            onClick={() => handleSocialLogin(new FacebookAuthProvider())}
            style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#3b5998', color: '#fff', border: 'none', borderRadius: '4px', flex: 1 }}
          >
            Facebook
          </button>
        </div>

      </div>
    </div>
  );
}

export default Login;