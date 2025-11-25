import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth.jsx'
import { getHash } from '../Api/getPage.jsx'
import Profile from '../Profile/Profile.jsx'
import Admin from '../Admin/Admin.jsx'
import Navbar from '../Navbar/Navbar.jsx'

export const ProfileView = () => {
    const { role: userRole } = useAuth(); //use the Auth hook to access role of the user

    // logic to determine the initial view based on the URL hash
    const getInitialView = useCallback(() => {
        const hash = getHash(); //see getPage.jsx

        // ensures user is an admin to be able to see admin view
        if (hash === 'admin' && userRole !== 'admin') {
            // renders the profile view if not an admin
            window.location.hash = 'profile';
            return 'profile';
        }
        // routing for valid users/paths
        return hash === 'admin' ? 'admin' : 'profile';
    }, [userRole]); // userRole dependency: ensures a re-run if role changes (set dependency for useCallback)

    const [currentView, setCurrentView] = useState(getInitialView);

    // listen for hash changes and update the state
    useEffect(() => {
        const handleHashChange = () => {
            setCurrentView(getInitialView());
        };

        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [getInitialView]);

    // conditional rendering
    const renderView = () => {
        switch (currentView) {
            case 'admin':
                return <Admin />;
            case 'profile':
            default:
                return <Profile />;
        }
    };

    return (
        <div className="min-h-screen"> {/*tail-wind css min-h(min-height) and screen(100vh)*/}
            <Navbar />
            <main className="render-view">
                {renderView()}
            </main>
        </div>
    );
};
