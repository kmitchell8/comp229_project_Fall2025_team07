import React, { useState, useEffect, useCallback } from 'react'
//import { useAuth } from '../authState/useAuth.jsx'//authentication isn't needed for viewing books in a library
import { getHash } from '../Api/getPage.jsx'
import Library from '../Library/Library.jsx'
import Book from '../Book/Book.jsx'
import Navbar from '../Navbar/NavBar.jsx'
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
          
          //redirect guard logic currently not needed to list books butmay be need in the future
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
        // logic to determine the initial view based on the URL hash
        const getInitialView = useCallback(() => {
            const hash = getHash(); //see getPage.jsx

            //initial view is the the library page
            if (hash === 'library' || hash == '') {
                // renders the library view
                window.location.hash = 'library';
                return 'library';
            }
            return 'book';
            // routing for valid users/paths
            // return hash === 'admin' ? 'admin' : 'profile';
        }, []); // userRole dependency: ensures a re-run if role changes (set dependency for useCallback)

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
                case 'book':
                    return <Book />;
                case 'library':
                default:
                    return <Library />;
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
