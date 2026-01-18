import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../StateProvider/authState/useAuth.jsx'
import { useLibrary } from '../StateProvider/libraryState/useLibrary.jsx';
import { getHash } from '../Api/getPage.jsx'
import { ROUTES, PROFILE_VIEWS, ROLE_TO_ROUTE_MAP } from '../Api/routingConfig';
import Profile from '../Profile/Profile.jsx'
import Admin from './adminView.jsx'
import Navbar from '../Navbar/Navbar.jsx'

export const ProfileView = () => {
    const { role: userRole, /*branchId,*/ isAuthenticated, loading, hasAdminPrivileges } = useAuth(); //use the Auth hook to access role of the user
    const { loading: libraryLoading/*, currentLibrary */} = useLibrary();
    const isAdminRole = [ROUTES.ADMIN, ROUTES.LIBRARY_ADMIN, ROUTES.BRANCH_ADMIN].includes(userRole);
    const [lastAdminPath, setLastAdminPath] = useState(null);
    const baseAdminRoute = ROLE_TO_ROUTE_MAP[userRole] || ROUTES.ADMIN;
    //const [isRedirecting, setIsRedirecting] = useState(false);

    useEffect(() => { //prevents views to UnAuthorized Pages

        // If not signed in redirect to the home page
        //attempts to block the view of the profile page
        if (!loading && !isAuthenticated) {
            console.log("User not signed in. Redirecting to home page.");
            // Use window.location.replace to prevent users from navigating back to the profile/admin area
            window.location.replace('./');
        }

    }, [isAuthenticated, loading]);//isAuthenticated/loading dependency


    //State stores both the primary view key and the full path segments

    // logic to determine the initial view based on the URL hash
    const getInitialView = useCallback(() => {
        const hash = getHash(); //see getPage.jsx
        const segments = hash.split('/').filter(s => s !== '');
        const primarySegment = segments[0];
        console.log("Current Role:", userRole, "Requested Segment:", primarySegment);
        // const adminViews = [ROUTES.ADMIN, ROUTES.CREATE_MEDIA, ROUTES.UPDATE_MEDIA, ROUTES.UPDATE_USER]//Future: add to a config file to allow for dynamic updating
        //if spread values changed then they will not be checked 
        //to perform their desired function (current function: 
        //cases used that render adminView) 

        // ensures user is an admin to be able to see admin view
        if (PROFILE_VIEWS.includes(primarySegment)) {
            if (!hasAdminPrivileges) { //ADMIN ROUTES will be named after the user role to ensure all ADMIN roles are checked dynamically
                window.location.hash = ROUTES.PROFILE;
                //return ROUTES.PROFILE;
                //return { view: primarySegment, segments };
                return { view: ROUTES.PROFILE, segments: [ROUTES.PROFILE] };
            }

            //return primarySegment;
            return { view: primarySegment, segments };
        }

        // routing for valid users/paths
        // return hash === ROUTES.ADMIN ? ROUTES.ADMIN : ROUTES.PROFILE;
        //non admin view
        if (!primarySegment || primarySegment === ROUTES.PROFILE) {
            // return ROUTES.PROFILE;
            //return { view: primarySegment, segments };
            return { view: ROUTES.PROFILE, segments: [ROUTES.PROFILE] };
        }

        //default
        window.location.hash = ROUTES.PROFILE;
        //return ROUTES.PROFILE
        // return { view: primarySegment, segments };
        return { view: ROUTES.PROFILE, segments: [ROUTES.PROFILE] };

    }, [userRole, hasAdminPrivileges]); // userRole dependency: ensures a re-run if role changes (set dependency for useCallback)

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
            // Synchronized handleRouting with Auth State
            if (!loading && isAuthenticated) {
                // Update state with new view and segments
                setViewData(getInitialView());
                // WORKFLOW PERSISTENCE: If in an Admin view, save the current hash
                const hash = getHash();
                const primarySegment = hash.split('/')[0];
                if (PROFILE_VIEWS.includes(primarySegment) && primarySegment !== ROUTES.PROFILE) {
                    setLastAdminPath(hash);
                }
            }
        };
        handleRouting();
        window.addEventListener('hashchange', handleRouting);

        return () => {
            window.removeEventListener('hashchange', handleRouting);
        };
    }, [loading, isAuthenticated, getInitialView]);


    const DashboardTabs = ({ currentView, userRole, lastAdminPath }) => {
        const isProfileActive = currentView === ROUTES.PROFILE;
        //const isBranchActive = currentView === ROUTES.BRANCH_ADMIN;
        const isAdminActive = !isProfileActive /*&& !isBranchActive*/;
        
        // Use lastAdminPath if it exists, otherwise fall back to the base role route
        const adminTarget = lastAdminPath ? `#${lastAdminPath}` : `#${baseAdminRoute}`;
        const isDeepPath = lastAdminPath && lastAdminPath.split('/').filter(Boolean).length > 1;
        // Library Admins default to the Main Branch; Branch Admins use their assigned ID
      /*  const targetBranchId = userRole === ROUTES.BRANCH_ADMIN
            ? branchId
            : currentLibrary?.mainBranchId;*/
     //  const branchLink = `#${ROUTES.BRANCH_ADMIN}/${ROUTES.UPDATE_BRANCH}/${targetBranchId}`;

        const handleReset = (e) => {
            // Allow the user to clear the saved path by holding Shift or clicking the dot
            if (e.shiftKey) {
                e.preventDefault();
                setLastAdminPath(null);
                window.location.hash = baseAdminRoute;
            }
        };

        return (
            <nav className="profile-tabs-container">
                <a
                    href={`#${ROUTES.PROFILE}`}
                    className={`tab-link ${isProfileActive ? 'active' : ''}`}
                >
                    My Profile
                </a>
                {/*Branch Details Tab - Visible if the user is an Admin */}
              {  /*{targetBranchId && (
                    <a
                        href={branchLink || '#'}
                        className={`tab-link ${isBranchActive ? 'active' : ''} ${!branchLink ? 'disabled' : ''}`}
                        style={{ opacity: branchLink ? 1 : 0.5, cursor: branchLink ? 'pointer' : 'not-allowed' }}
                    >
                        {userRole === ROUTES.BRANCH_ADMIN ? 'My Branch' : 'Main Branch'}
                    </a>
                )}*/}

                {/* Role-based Dashboard Tab */}

                {hasAdminPrivileges && (
                    <a
                        href={adminTarget}/*href={`#${userRole}`}*/
                        onClick={handleReset}
                        className={`tab-link ${isAdminActive ? 'active' : ''}`}
                    >
                        {userRole.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()} 
                        {/* SAVED INDICATOR: Shows a small indicator if a session is paused */}
                        {isProfileActive && isDeepPath && (
                            <span className="saved-indicator" title="Shift-Click to reset to main dashboard"></span>
                        )}
                    </a>
                )}
            </nav>
        );
    };

    // Hardened "Render Guard" - protects viewData from being null 
    // and ensures authentication is confirmed before proceeding
    if (loading || libraryLoading || !isAuthenticated || viewData === null) {
        return null; // Stop rendering and wait for viewData to be set
        /*  return (
        <div className="loading-spinner">
             <p>Resolving Library Context...</p>
         </div>
         )*/
    }
    const { view: currentView, segments: pathSegments } = viewData;
    // conditional rendering
    const renderView = () => {
        switch (currentView) {
            case ROUTES.LIBRARY_ADMIN:
            case ROUTES.BRANCH_ADMIN:
            case ROUTES.ADMIN:
            case ROUTES.CREATE_MEDIA: //all nested views default to Admin
            case ROUTES.UPDATE_MEDIA:
            case ROUTES.UPDATE_USER:
                return <Admin pathSegments={[...pathSegments]} />;//measure against stale prop references.
            //ecountered during trouble shooting (keep for future reference)
            case ROUTES.PROFILE:
            default:
                return <Profile />;
        }
    };

    return (
        //<div className="min-h-screen"> {/*tail-wind css min-h(min-height) and screen(100vh)*/}
        /* <Navbar />
         <main className="render-view">
             {renderView()}
         </main>
     </div>
*/
        <div className="profile-view-wrapper">
            {/* Navbar remains at the top */}
            <Navbar />

            <main className="profile-main-content">
                {/* The Muted Tab Header */}
                <DashboardTabs
                    currentView={currentView}
                    userRole={userRole}
                    isAdminRole={isAdminRole}
                    lastAdminPath={lastAdminPath}
                />

                {/* The Slate-colored content card */}
                <div className="render-view-card">
                    {renderView()}
                </div>
            </main>
        </div>
    );
};

export default ProfileView;