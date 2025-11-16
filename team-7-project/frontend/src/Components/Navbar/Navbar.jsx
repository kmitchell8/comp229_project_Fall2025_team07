import React from 'react'
import './Navbar.css'
//import logo from '/images/team_7_logo.png'
import { useAuth } from '../../Components/authState/useAuth.jsx';



const Navbar = () => {
    const { _view, isAuthenticated, role, logout, _setView } = useAuth();

    //function to render links for unauthenticated users
    const renderSignedOutLinks = () => (
        <>{/* allows the file to add elements without needing an extra tag such as <div></div>/<ul></ul> */}
            {/* Show Login link only if not currently on the login view */}
            <li>
                {/* setView changes the state in AuthProvider, triggering a re-render */}
                {/*onClick={() => setView('login')}
                SetView is not necessary for this  Navbar setup*/}
                <a href="./login.html">Login</a>
            </li>
            <li>
                <a href="./register.html">Register</a>
            </li>
        </>
    );

    //function to render links for authenticated users
    const renderAuthenticatedLinks = () => (
        <>
            <li>
                {/* Example link only available when authenticated */}
                <a href="./profile.html">Profile</a>
            </li>

            {/* Admin-Specific Link */}
            {/* Check if the user's role is exactly 'admin' (case-sensitive) */}
            {role === 'admin' && (
                <li>
                    <a href="./profile.html#admin" style={{ fontWeight: 'bold', color: 'red' }}>
                        Admin Dashboard
                    </a>
                </li>
            )}

            {/* Universal Authenticated Links */}
            <li>
                <button onClick={logout}>Sign Out</button>
            </li>
        </>
    );

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <a href="./"><img src="/images/team_7_logo.png" height="50px" width="50px" alt="" /></a>
            </div>

            <ul className="nav-menu">
                {/* Common link for all views */}
                <li><a href="./">Home</a></li>
                <li><a href="./Library.html">Library</a></li>
                <li><a href="./services.html">Services</a></li>
                <li><a href="./contact.html">Contact</a></li>
                <li><a href="./about.html">About</a></li>
                {/* rendering based on authentication status */}
                {isAuthenticated
                    ? renderAuthenticatedLinks()
                    : renderSignedOutLinks()}
            </ul>

            {/* Testing: delete in final code*/}
            <div className="current-status">
                Status: **{isAuthenticated ? 'Authenticated' : 'Signed Out'}** /
                Role: **{role}**
            </div>
        </nav>
    )
}

export default Navbar