import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../authState/useAuth.jsx'
import { getHash } from '../Api/getPage.jsx'
import Profile from '../Profile/Profile.jsx'
import Admin from './adminView.jsx'
import Navbar from '../Navbar/Navbar.jsx'



export const ProfileView = () => {
    const { role: userRole, isAuthenticated, loading } = useAuth(); //use the Auth hook to access role of the user
    //const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => { //prevents views to UnAuthorized Pages

        // If not signed in redirect to the home page
        //attempts to block the view of the profile page
        if (!loading && !isAuthenticated) {
            console.log("User not signed in. Redirecting to home page.");
            // Use window.location.replace to prevent users from navigating back to the profile/admin area
            window.location.replace('./');
            //return null;
        }
        //redirect guard logic
        /* if (!isAuthenticated) {
             console.log("User not signed in. Redirecting to home page.");
             window.location.replace('./');
             // Start the fade-out/transition
             //setIsRedirecting(true);
             //const redirectTimer = setTimeout(() => {
                // window.location.replace('./');
             //}, -0.1); // 0.3 seconds
            // return () => clearTimeout(redirectTimer);
         //}
         //else if (isAuthenticated) {
             // If authenticated, stop redirecting flag
             //setIsRedirecting(false);
             return null;
         }*/

    }, [isAuthenticated, loading]);//isAuthenticated/loading dependency




    //State stores both the primary view key and the full path segments

    // logic to determine the initial view based on the URL hash
    const getInitialView = useCallback(() => {
        const hash = getHash(); //see getPage.jsx
        const segments = hash.split('/').filter(s => s !== '');
        const primarySegment = segments[0];
        const adminViews = ['admin', 'createbook', 'updatebook', 'updateuser']

        // ensures user is an admin to be able to see admin view
        if (adminViews.includes(primarySegment)) {
            if (userRole != 'admin') {
                window.location.hash = 'profile';
                //return 'profile';
                //return { view: primarySegment, segments };
                return { view: 'profile', segments: ['profile'] };
            }

            //return primarySegment;
            return { view: primarySegment, segments };
        }
        /* if (hash === 'admin' && userRole !== 'admin') {
             // renders the profile view if not an admin
             window.location.hash = 'profile';
             return 'profile';
         }*/

        // routing for valid users/paths
        // return hash === 'admin' ? 'admin' : 'profile';
        //non admin view
        if (!primarySegment || primarySegment === 'profile') {
            // return 'profile';
            //return { view: primarySegment, segments };
            return { view: 'profile', segments: ['profile'] };
        }

        //default
        window.location.hash = 'profile';
        //return 'profile'
        // return { view: primarySegment, segments };
        return { view: 'profile', segments: ['profile'] };

    }, [userRole]); // userRole dependency: ensures a re-run if role changes (set dependency for useCallback)

    const [viewData, setViewData] = useState(null);//set useSate to null to compensate for the use of userRole
    //during rendering userRole will be null before the parsing url/hash logic
    //takes effect and the useState should match for it to work
    //needs useAuth to fnish checking before calling getInitalview and userRole has been populated



    //const { view: currentView, segments: pathSegments } = viewData;

    //Ok to synchronise since authentication is finished
    // listen for hash changes and update the state
    useEffect(() => {
        //const handleHashChange = () => {
        const handleRouting = () => {
            if (!loading) {
                // Update state with new view and segments
                setViewData(getInitialView());
            }
        };
        handleRouting();
        window.addEventListener('hashchange', handleRouting);

        return () => {
            window.removeEventListener('hashchange', handleRouting);
        };
    }, [loading, getInitialView]);
    //protects viewData from being null
    if (loading || viewData === null) {
        return null; // Stop rendering and wait for viewData to be set
    }
    const { view: currentView, segments: pathSegments } = viewData;
    // conditional rendering
    const renderView = () => {
        switch (currentView) {
            case 'admin':
            case 'createbook': //all nested views default to Admin
            case 'updatebook':
            case 'updateuser':
                return <Admin pathSegments={[...pathSegments]} />;//measure against stale prop references.
                                                                //ecountered during trouble shooting (keep for future reference)
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
