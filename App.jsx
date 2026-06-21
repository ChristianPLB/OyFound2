import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import './App.css';

// Components
import Home from './components/Home.jsx';
import Login from './components/Login.jsx';
import Register from './components/Register.jsx';

// Navbar
import NavAdmin from './navbar/NavAdmin.jsx';
import Navbar from './navbar/Navbar.jsx';
import NavStudent from './navbar/NavStudent.jsx';

// Pages
import AIMatches from './pages/AIMatches.jsx';
import Contact from './pages/Contact.jsx';
import Dashboard from './pages/Dashboard.jsx';
import HomeAdmin from './pages/HomeAdmin.jsx';
import HomeStudent from './pages/HomeStudent.jsx';
import Messages from './pages/Messages.jsx';
import Profile from './pages/Profile.jsx';
import ReportItem from './pages/ReportItem.jsx';
import SMessages from './pages/SMessages.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx'; // Fixed spelling

// CSS
import './css/Contact.css';
import './css/Footer.css';
import './css/HomeAdmin.css';
import './css/HomeStudent.css';
import './css/Login.css';
import './css/Messages.css';
import './css/Navbar.css';
import './css/Profile.css';
import './css/Register.css';
import './css/Report.css';
import './css/SMessages.css';

function App() {
  const [role, setRole] = useState(() => localStorage.getItem('userRole') || null);

  return (
    <>
      {!role && <Navbar />} 
      {role === 'admin' && <NavAdmin setRole={setRole}/>}
      {(role === 'student' || role === 'guest') && <NavStudent setRole={setRole} />} 

      <Routes>
        {/* Public Routes */}
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login setRole={setRole} />} />
        <Route path='/register' element={<Register setRole={setRole} />} />
        <Route path="/contact" element={<Contact/>} />

        {/* Admin Protected Routes */}
        {role === 'admin' && (
          <>
            <Route path='/matches' element={<AIMatches />} />
            <Route path='/admin' element={<HomeAdmin />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/report" element={<ReportItem />} />
          </>
        )}

        {/* Student/Guest Protected Routes */}
        {(role === 'student' || role === 'guest') && (
          <>
            <Route path="/student" element={<HomeStudent />} /> 
            <Route path="/studentdashboard" element={<StudentDashboard />} /> 
            <Route path="/studentmessages" element={<SMessages />} />
            <Route path="/profile" element={<Profile setRole={setRole} />} 
  />
          </>
        )}

        {/* Shared Protected Route */}
        {role && <Route path="/profile" element={<Profile />} />}
        
        {/* Fallback for undefined routes */}
        <Route path="*" element={<Home />} />
      </Routes>

      {/*<Footer />*/}
    </>
  );
}

export default App;