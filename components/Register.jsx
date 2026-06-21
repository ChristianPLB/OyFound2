import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore"; // Added serverTimestamp
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase'; //

function Register({ setRole }) {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        password: '',
        role: ''
    });
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        
        if (!formData.role) {
            alert("Please select a role first!");
            return;
        }

      try {
    const res = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
    
    await setDoc(doc(db, "users", res.user.uid), {
        uid: res.user.uid,
        fullName: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        role: formData.role, // This will now save 'guest' if selected
        createdAt: serverTimestamp()
    });

    setRole(formData.role);
    localStorage.setItem('userRole', formData.role);
    navigate(`/${formData.role}`); 
} catch (err) {
    // This catches the 'configuration-not-found' error
    alert("Auth Error: " + err.message); 
}
    };

    return (
        <div className="register-container">
            <div className="register-form">
                <h1 className="form-title">Create account</h1>
                <p>Already have an account? <Link to="/login" className="login-link">Login</Link></p>

                <form className="input-grid" onSubmit={handleSignUp}>
                    <input type="text" name="firstName" className="input-field" placeholder="Firstname" 
                        required onChange={handleInputChange} />
                    <input type="text" name="lastName" className="input-field" placeholder="Lastname" 
                        required onChange={handleInputChange} />
                    
                    
                    <select 
                        name="role"
                        className="input-field select-field" 
                        value={formData.role} 
                        onChange={handleInputChange}
                        required
                    >
                        <option value="" disabled>Select Role</option>
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                    </select>
                    
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