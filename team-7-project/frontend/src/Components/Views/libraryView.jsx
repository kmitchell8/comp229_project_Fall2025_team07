import React, { useState, useEffect, useCallback } from 'react'
//import { useAuth } from '../authState/useAuth.jsx'//authentication isn't needed for viewing medias in a library
import { getHash } from '../Api/getPage.jsx'
import {ROUTES, /*LIBRARY_VIEWS*/} from '../Api/routingConfig'
import Library from '../Library/Library.jsx'
import Media from '../Media/Media.jsx'
import Navbar from '../Navbar/Navbar.jsx'
//import LibraryNavBar from '../Navbar/LibraryNavBar.jsx'

export const LibraryView = () => {
    //const { loading } = useAuth(); //use the Auth hook to access role of the user
    //const [isRedirecting, setIsRedirecting] = useState(false);

    /*useEffect(() => {

        // If not signed in redirect to the home page
        //attempts to block the view of the profile page
         if (loading) {
              return null;
          }
          
          //redirect guard logic currently not needed to list medias butmay be need in the future
          if (!isAuthenticated) {
              console.log("User not signed in. Redirecting to home page.");
              window.location.replace('./'); 
              // Start the fade-out/transition
              ///setIsRedirecting(true);
              //const redirectTimer = setTimeout(() => {
                  //window.location.replace('./');
             // }, -0.1); // 0.3 seconds
             // return () => clearTimeout(redirectTimer);
          //}
          //else if (isAuthenticated) {
              // If authenticated, stop redirecting flag
              //setIsRedirecting(false);
              return null;
          }
  
      }, [isAuthenticated,loading]);//isAuthenticated dependency
  */

    // Robust routing arrangement with segments mirroring AdminView
    const getPathSegments = useCallback(() => {
        const hash = getHash(); // see getPage.jsx
        // Split the hash into an array. For #library/itemId, segments[0] is ROUTES.LIBRARY, segments[1] is 'itemId'
        // Preserving logic: filter ensures no empty strings if hash ends in /
        return hash.split('/').filter(s => s !== '');
    }, []);

    // logic to determine the initial view based on the URL hash segments
    const getInitialView = useCallback(() => {
        const segments = getPathSegments();
        const primarySegment = segments[0];

        // initial view is the library page
        if (primarySegment === ROUTES.LIBRARY || !primarySegment) {
            // Check if an itemId exists in the second segment
            // This mirrors the itemId = parentSegments[2] logic in AdminView
            if (segments[1]) {
                return ROUTES.MEDIA;
            }
            
            // Defaulting hash to library if empty
            if (!primarySegment) {
                window.location.hash = ROUTES.LIBRARY;
            }
            return ROUTES.LIBRARY;
        }

        // routing for valid users/paths
        // return hash === 'admin' ? 'admin' : 'profile';
        return ROUTES.MEDIA; 
    }, [getPathSegments]);

    const [currentView, setCurrentView] = useState(() => getInitialView());
    const [pathSegments, setPathSegments] = useState(() => getPathSegments());

    // listen for hash changes and update the state
    useEffect(() => {
        const handleHashChange = () => {
            const newSegments = getPathSegments();
            setPathSegments(newSegments);
            setCurrentView(getInitialView());
        };

        window.addEventListener('hashchange', handleHashChange);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, [getInitialView, getPathSegments]);

    // conditional rendering
    const renderView = () => {
        // itemId is the second segment: #library/itemId
        // Preserving architecture: extracting ID from the stateful pathSegments
        const itemId = pathSegments[1];

        switch (currentView) {
            case ROUTES.MEDIA:
                return (
                    <Media 
                        mediaId={itemId } 
                        viewContext="library"
                        /*onBack={() => window.location.hash = ROUTES.LIBRARY*} */
                    />
                );
            case ROUTES.LIBRARY:
            default:
                return <Library mediaId={itemId} />;
        }
    };

    return (
        <div className="min-h-screen"> {/*tail-wind css min-h(min-height) and screen(100vh)*/}
            <Navbar />
            <main className="render-view">
                {renderView()}
            </main>

            {/* Do not lose code: Segment tracking for debugging/future robust routing */}
            <div className="library-footer-info" style={{padding: '20px', opacity: 0.6}}>
                <p>
                    Hash Routing: {pathSegments[0]} {pathSegments[1] ? `/ ${pathSegments[1]}` : ''}
                </p>
            </div>
        </div>
    );
};

export default LibraryView;