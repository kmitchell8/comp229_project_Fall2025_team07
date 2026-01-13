import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../StateProvider/authState/useAuth.jsx'
import { getHash } from '../Api/getPage.jsx'
import { ROUTES, ACCESS_VIEWS } from '../Api/routingConfig.js'; // Import route-map
import Register from '../Access/Register.jsx'
import Login from '../Access/Login.jsx'
import ResetPassword from '../Access/ResetPassword.jsx'
import RegisterLibrary from '../Access/RegisterLibrary.jsx';
import Navbar from '../Navbar/Navbar.jsx'

export const AccessView = () => {
    const { isAuthenticated, loading } = useAuth(); //use the Auth hook to access role of the user
    //const [isRedirecting, setIsRedirecting] = useState(false);

    const [viewData, setViewData] = useState(null);//set useSate to null to compensate for the use of isAuthenticated
    //during rendering authentication will be null before the parsing url/hash logic
    //takes effect and the useState should match for it to work
    //needs useAuth to fnish checking before calling getInitalview and userRole has been populated

    // Logic to determine the view based on a provided hash string
    // This is now a "pure" function that takes a hash and returns the view object
    const getInitialView = useCallback((hashString) => {
        const segments = hashString.split('/').filter(s => s !== '');
        const primarySegment = segments[0];

        if (!primarySegment) {
            return { view: ROUTES.LOGIN, segments: [ROUTES.LOGIN] };
        }
        if (ACCESS_VIEWS.includes(primarySegment)) {
            return { view: primarySegment, segments };
        }
        // default
        return { view: ROUTES.LOGIN, segments: [ROUTES.LOGIN] };
    }, []); // No dependencies needed as it processes the input string directly

    // listen for hash changes and update the state using getInitialView
    useEffect(() => {
        const handleRouting = () => {
            if (!loading) {
                const currentHash = getHash();
                // We call getInitialView here to maintain your logic structure
                const nextView = getInitialView(currentHash);
                setViewData(nextView);
            }
        };

        handleRouting(); // Initial call to set view on mount
        window.addEventListener('hashchange', handleRouting);
        return () => window.removeEventListener('hashchange', handleRouting);
    }, [loading, getInitialView]);

    // logic to ensure user does not get to the login/register pages if logged in
    useEffect(() => {
        if (loading) return;

        const currentHash = getHash();

        if (isAuthenticated) {
            // Prevent logged in users from seeing login/register
            if ([ROUTES.LOGIN, ROUTES.REGISTER].includes(currentHash)) {
                console.log("Authenticated user detected on Access page. Redirecting to home.");
                window.location.replace('./profile.html');
            }
        } else {
            // Guest trying to hit Register Library - specifically redirecting guests away from protected access views
            if (currentHash === ROUTES.REGISTER_LIBRARY) {
                window.location.hash = ROUTES.LOGIN;
            }
        }
    }, [isAuthenticated, loading]);

    // 5. Rendering logic
    if (loading || viewData === null) {
        return null;
    }

    const { view: currentView, segments: pathSegments } = viewData;

    // conditional rendering
    const renderView = () => {
        switch (currentView) {
            case ROUTES.LOGIN:
                return <Login />
            case ROUTES.RESET:
                return <ResetPassword pathSegments={[...pathSegments]} />;//measure against stale prop references.
            //encountered during trouble shooting (keep for future reference)
            case ROUTES.REGISTER_LIBRARY:
                return <RegisterLibrary />;
            case ROUTES.REGISTER:
                return <Register />;
            default:
                return <Login />;
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