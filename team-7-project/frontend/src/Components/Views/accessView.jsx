import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../StateProvider/authState/useAuth.jsx'
import { getPage, getHash } from '../Api/getPage.jsx'
import { ROUTES, ACCESS_VIEWS } from '../Api/routingConfig.js'; // Import route-map
import Register from '../Access/Register.jsx'
import Login from '../Access/Login.jsx'
import ResetPassword from '../Access/ResetPassword.jsx'
import Navbar from '../Navbar/Navbar.jsx'



export const AccessView = () => {
    const { isAuthenticated, loading } = useAuth(); //use the Auth hook to access role of the user
    //const [isRedirecting, setIsRedirecting] = useState(false);



    //State stores both the primary view key and the full path segments

    // logic to determine the initial view based on the URL hash
    const getInitialView = useCallback(() => {
        const hash = getHash(); //see getPage.jsx
        const segments = hash.split('/').filter(s => s !== '');
        const primarySegment = segments[0];
        // const accessViews = [ROUTES.REGISTER, ROUTES.LOGIN, ROUTES.RESET]//Future: add to a config file to allow for dynamic updating
        //if spread values changed then they will not be checked 
        //to perform their desired function (current function: 
        //cases used that render adminView) 

        // ensures user is an admin to be able to see admin view
        if (ACCESS_VIEWS.includes(primarySegment)) {
            // if user is NOT authenticated, allow login, register, or reset
           /* if (!isAuthenticated && (
                primarySegment !== ROUTES.RESET
                && primarySegment !== ROUTES.LOGIN
                && primarySegment !== ROUTES.REGISTER
            )) {
                window.location.hash = ROUTES.LOGIN;
                //return ROUTES.LOGIN;
                //return { view: primarySegment, segments };
                return { view: ROUTES.LOGIN, segments: [ROUTES.LOGIN] };
            }*/
            // Simplified check (using your existing array)
            if (!isAuthenticated && !ACCESS_VIEWS.includes(primarySegment)) {
                window.location.hash = ROUTES.LOGIN;
                return { view: ROUTES.LOGIN, segments: [ROUTES.LOGIN] };
            }

            //return primarySegment;
            return { view: primarySegment, segments };
        }



        //default
        window.location.hash = ROUTES.LOGIN;
        //return ROUTES.LOGIN
        // return { view: primarySegment, segments };
        return { view: ROUTES.LOGIN, segments: [ROUTES.LOGIN] };

    }, [isAuthenticated]); // isAuthenticated dependency: ensures a re-run if role changes (set dependency for useCallback)

    const [viewData, setViewData] = useState(null);//set useSate to null to compensate for the use of isAuthenticated
    //during rendering authentication will be null before the parsing url/hash logic
    //takes effect and the useState should match for it to work
    //needs useAuth to fnish checking before calling getInitalview and userRole has been populated


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


    //getting a usable string from the function
    const getPageString = getPage();
    const getHashString = getHash();
    //logic to ensure user does not get to the login/regster pages if logged in
    useEffect(() => {
        // Only act if we are sure the user is authenticated and loading is finished
        if (!loading && isAuthenticated) {
            const isOnAuthPage =
                getPageString === ROUTES.LOGIN
                || getPageString === ROUTES.REGISTER
                || getHashString === ROUTES.LOGIN
                || getHashString === ROUTES.REGISTER;

            if (isOnAuthPage) {
                console.log("Authenticated user detected on Auth page. Redirecting to home.");
                window.location.replace('./profile.html');
            }
        }
    }, [isAuthenticated, loading, getPageString, getHashString]);
    if ((getPageString === ROUTES.LOGIN
        || getHashString === ROUTES.LOGIN
        || getPageString === ROUTES.REGISTER
        || getHashString === ROUTES.REGISTER
    ) && isAuthenticated) {
        return null;
    }


    //protects viewData from being null
    if (loading || viewData === null) {
        return null; // Stop rendering and wait for viewData to be set
    }
    const { view: currentView, segments: pathSegments } = viewData;
    // conditional rendering
    const renderView = () => {
        switch (currentView) {
            case ROUTES.LOGIN:
                return <Login />
            case ROUTES.RESET:
                return <ResetPassword pathSegments={[...pathSegments]} />;//measure against stale prop references.
            //ecountered during trouble shooting (keep for future reference)
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
