import { React, useState, useEffect } from 'react'
import './Navbar.css'
//import logo from '/images/team_7_logo.png'
import { useAuth } from '../authState/useAuth.jsx';
import { getPage, getHash } from '../Api/getPage.jsx'





const Navbar = () => {
    const { _view, isAuthenticated, role, logout, _setView } = useAuth();
    const [currentHash, setCurrentHash] = useState(getHash());

    useEffect(() => {
        const handleHashChange = () => {
            setCurrentHash(getHash());
        };

        // Listen for hash changes (e.g., clicking the link or browser back/forward)
        window.addEventListener('hashchange', handleHashChange);

        // Clean up listener on unmount
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const currentPath = window.location.pathname;
    const isLogOrReg = currentPath.endsWith('/login.html') || currentPath.endsWith('/register.html');

    //capitalising the first letter of the string and creating a value to display the current file path
    const getPageString = getPage().charAt(0).toUpperCase() + getPage().slice(1);
    //const pageString = ` / ${getPageString}`;
    const pageString = getPageString === "Index" ? '' : ` / ${getPageString}`;



    const renderLoginOrRegister = () => (
        <ul className="nav-menu">
            <li><a href="./">Go Back Home</a></li>

        </ul>

        // Only run if the user is authenticated AND the current page is login or register

    );

    //function to render links for unauthenticated users
    const renderSignedOutLinks = () => (
        <>{/* allows the file to add elements without needing a ccntainer tag such as <div></div>/<ul></ul> */}
            {/* Show Login link only if not currently on the login view */}
            <li>
                {/* setView changes the state in AuthProvider, triggering a re-render */}
                {/*onClick={() => setView('login')}
                SetView is not necessary for this  Navbar setup*/}
                <a href="./login.html">Login /</a>
                <a href="./register.html"> Register</a>
            </li>
        </>
    );

    //function to render links for authenticated users
    const renderAuthenticatedLinks = () => {
        const isAdminActive = currentHash === '#admin' || currentHash === 'admin';
        return (

            <>
                <li>
                    {/* Example link only available when authenticated */}
                    <a href="./profile.html">Profile</a>
                </li>

                {/* Admin-Specific Link */}
                {/* Check if the user's role is exactly 'admin' (case-sensitive) */}
                {role === 'admin' && (
                    <li>
                        <a
                            href="./profile.html#admin"
                            className={`admin-btn ${isAdminActive ? 'is-active' : 'pulse-glow'}`}
                        >
                            Admin Dashboard
                        </a>
                    </li>
                )}

                {/* Universal Authenticated Links */}
                <li>
                    <a onClick={logout} className="sign-out-btn">Sign Out</a>
                </li>
            </>
        )
    };

    return (
        <nav className="navbar">
            <div className="logo">
                <a href="./"><img src="/images/team_7_logo.png" height="50px" width="50px" alt="" /></a>
            </div>
            {isLogOrReg ?
                renderLoginOrRegister()
                : <ul className="nav-menu">
                    {/* Common link for all views */}
                    <li><a href="./">Home</a>

                        {pageString}
                    </li>
                    <li><a href="./library.html">Library</a></li>
                    <li><a href="./services.html">Services</a></li>
                    <li><a href="./contact.html">Contact</a></li>
                    <li><a href="./about.html">About</a></li>
                    {/* rendering based on authentication status */}
                    {isAuthenticated
                        ? renderAuthenticatedLinks()
                        : renderSignedOutLinks()}
                </ul>
            }


            {/* Testing: delete in final code*/}

            {/*<div className="current-status">
                Status: {isAuthenticated ? 'Authenticated' : 'Signed Out'} /
                Role: {role}
            </div>*/}
        </nav>
    )
}

export default Navbar