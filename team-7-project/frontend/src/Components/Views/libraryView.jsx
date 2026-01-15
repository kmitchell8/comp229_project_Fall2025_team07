import React, { useState, useEffect, useCallback } from 'react'
//import { useAuth } from '../authState/useAuth.jsx'//authentication isn't needed for viewing medias in a library
import { getHash } from '../Api/getPage.jsx'
import { ROUTES, /*LIBRARY_VIEWS*/ } from '../Api/routingConfig'
import Library from '../Library/Library.jsx'
import Media from '../Media/Media.jsx'
import Navbar from '../Navbar/Navbar.jsx'
//import LibraryNavBar from '../Navbar/LibraryNavBar.jsx'

export const LibraryView = () => {

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
            /* if (segments[1]) {
                 return ROUTES.MEDIA;
             }
             
             // Defaulting hash to library if empty
             if (!primarySegment) {
                 window.location.hash = ROUTES.LIBRARY;
             }
             return ROUTES.LIBRARY;*/

            // If the last segment is likely a media ID (e.g., the 2nd, 3rd, or 4th segment)
            // check for length: 
            // #library/medId (len 2)
            // #library/tenId/medId (len 3)
            // #library/tenId/brId/medId (len 4)

            // if more than a prefix, user is either in a specific list or a detail view.
            // For now, let's treat the existence of any segment after the 'path' as a valid filter.
            return segments.length > 1 ? ROUTES.MEDIA : ROUTES.LIBRARY;

        }
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


        let tenantId = null;
        let branchId = null;
        let mediaId = null;

        // Using your extraction logic:
        if (pathSegments.length === 2) {
            // #library/mediaId OR #library/tenantId
            mediaId = pathSegments[1];
            tenantId = pathSegments[1];
        } else if (pathSegments.length === 3) {
            // #library/tenantId/branchId OR #library/tenantId/mediaId
            tenantId = pathSegments[1];
            branchId = pathSegments[2];
            mediaId = pathSegments[2];
        } else if (pathSegments.length === 4) {
            // #library/tenantId/branchId/mediaId
            tenantId = pathSegments[1];
            branchId = pathSegments[2];
            mediaId = pathSegments[3];
        }

        // --- Logic for the Media Detail View ---
        if (currentView === ROUTES.MEDIA && pathSegments.length > 1) {
            return (
                <Media
                    mediaId={mediaId}
                    // If the mediaId is the same as tenantId, it means there is no 
                    // actual library ID in the path (Master Library).
                    tenantId={tenantId !== mediaId ? tenantId : null}
                    branchId={branchId !== mediaId ? branchId : null}
                    viewContext={ROUTES.LIBRARY}
                />
            );
        }

        // --- Logic for the Library List View ---
        // pathId is only passed if the Library is highlighed  or 
        // scroll to a specific item without opening the full Media view.
        return (
            <Library
                pathId={mediaId !== tenantId && mediaId !== branchId ? mediaId : null}
                viewContext={ROUTES.LIBRARY} // Adjusted to use ROUTES config
            />
        );
    };

    return (
        <div className="min-h-screen"> {/*tail-wind css min-h(min-height) and screen(100vh)*/}
            <Navbar />
            <main className="render-view">
                {renderView()}
            </main>

            {/* Do not lose code: Segment tracking for debugging/future robust routing */}
            <div className="library-footer-info" style={{ padding: '20px', opacity: 0.6 }}>
                <p>
                    Hash Routing: {pathSegments[0]} {pathSegments[1] ? `/ ${pathSegments[1]}` : ''}
                </p>
            </div>
        </div>
    );
};

export default LibraryView;