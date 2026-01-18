import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../StateProvider/authState/useAuth';
//import { getHash } from '../Api/getPage';
import { ROUTES, ADMIN_SUB_VIEWS, ROLE_TO_ROUTE_MAP } from '../Api/routingConfig'
import { useLibrary } from '../StateProvider/libraryState/useLibrary';
import CreateMedia from '../Admin/CreateMedia';
import UpdateMedia from '../Admin/UpdateMedia';
import UpdateUser from '../Admin/UpdateUser';
import CreateBranch from '../Admin/CreateBranch';
import UpdateBranch from '../Admin/UpdateBranch';
import Profile from '../Profile/Profile';
import { getHash } from '../Api/getPage';
//import './Admin.css'

const AdminView = ({ pathSegments: parentSegments = [] }) => {
  const { role: userRole, hasAdminPrivileges } = useAuth(); //use the Auth hook to access role of the user
  const { activeIds } = useLibrary(); // Get the current SaaS context
  const internalSegment = parentSegments[1];
  const isAdminRoleRoute = ROLE_TO_ROUTE_MAP[userRole]
  const isAdminPath = ADMIN_SUB_VIEWS.includes(parentSegments[0])
  //const adminViews = useMemo(() => [ROUTES.CREATE_MEDIA, ROUTES.UPDATE_MEDIA, ROUTES.UPDATE_USER], []);//recommended but not necessary keep for future reference

  // logic to determine the initial view based on the URL hash
  const getInternalView = useCallback(() => {
    //const adminViews = [ROUTES.CREATE_MEDIA, ROUTES.UPDATE_MEDIA, ROUTES.UPDATE_USER];

    if (!hasAdminPrivileges) {//safety check  //ADMIN ROUTES will be named after the user role to ensure all ADMIN roles are checked dynamically
      window.location.hash = ROUTES.PROFILE;
      //return { view: ROUTES.PROFILE, segments: [ROUTES.PROFILE] };
      return ROUTES.PROFILE;
    }
    if (ADMIN_SUB_VIEWS.includes(internalSegment)) {
      return internalSegment;
    }
    return isAdminRoleRoute || ROUTES.ADMIN; // Ensures fallback to 'admin' if role is missing


  }, [internalSegment, hasAdminPrivileges, isAdminRoleRoute]);
  //State stores both the primary view key and the full path segments
  const [currentView, setCurrentView] = useState(() => getInternalView());
  // listen for hash changes and update the state
  useEffect(() => {
    setCurrentView(getInternalView());
  }, [parentSegments, getInternalView]);

  if (currentView === ROUTES.PROFILE) {
    //forcing a redirect via window.location.hash, 
    //we should stop rendering anything here.
    return null;
  }
  const handleStepBack = () => {
    const currentHash = getHash(); // e.g., "#admin/update-user/123"
    // Find the position of the last slash and slice the string up to that point
    const parentPath = currentHash.substring(0, currentHash.lastIndexOf('/'));

    // Fallback: if parentPath is empty, go to the assigned dashboard route
    window.location.hash = parentPath.length > 1 ? parentPath : `${isAdminRoleRoute}`;
  };

  const handleHomeView = () => {
    const primarySegment = ROLE_TO_ROUTE_MAP[userRole]
    window.location.hash = `${primarySegment}`;
  };


  const NavigationLinks = ({ currentView }) => { //need to be outside the render or it will continually lose it's state
    const isDetailView = !!itemId; // Now isDetailView is strictly true or false
    return (
      <div className="admin-nav-footer">
        {currentView !== isAdminPath && parentSegments.length > 1 && (

          <button
            onClick={handleStepBack}
            className="admin-go-back"
          >
            &#8592; {/*ICON FOR LEFT POINTING ARROW*/}
          </button>
        )}       {isDetailView && (

          <button
            onClick={handleHomeView}
            className="admin-go-back admin-go-home"
          >
            Home
          </button>
        )}
      </div>

    );
  };

  //conditional rendering
  const itemId = parentSegments[2];
  const renderView = () => {
    switch (currentView) {
      case ROUTES.CREATE_BRANCH:
        return <CreateBranch />;
      case ROUTES.UPDATE_BRANCH:
        // If ID in the URL segments (#admin/update-branch/ID), show the profile
        // Otherwise, show the list of branches (assuming you have a BranchList component)
        return itemId ? <UpdateBranch pathId={itemId} /> : <UpdateBranch />;
      case ROUTES.CREATE_MEDIA:
        return <CreateMedia
          libraryId={activeIds.tenantId}
          branchId={activeIds.branchId}
        />;
      case ROUTES.UPDATE_MEDIA:
        return <UpdateMedia pathId={itemId} />;
      case ROUTES.UPDATE_USER:
        return itemId ? <Profile managedUserId={itemId} /> : <UpdateUser />;
      //return <UpdateUser parentSegment={parentSegments} />; //Uncomment once UpdateUser accepts parentSegmentsd internally
      //and handles <Profile /> subview logic

      // Dashboards (Default view for the specific role)
      case ROUTES.LIBRARY_ADMIN:
      case ROUTES.BRANCH_ADMIN:
      case ROUTES.ADMIN:
      default:
        return (
          <div className='admin-container'>
            {/* Standard Actions (All Admins) */}
            <div className='admin-item'>
              <h3><a href={`#${currentView}/${ROUTES.CREATE_MEDIA}`}>create media</a></h3>
            </div>
            <div className='admin-item'>
              <h3><a href={`#${currentView}/${ROUTES.UPDATE_MEDIA}`}>update media</a></h3>
            </div>

            {/* Branch Admin Restriction: No User Management */}
            {currentView !== ROUTES.BRANCH_ADMIN && (
              <div className='admin-item'>
                <h3><a href={`#${currentView}/${ROUTES.UPDATE_USER}`}>update user</a></h3>
              </div>
            )}

            {/* Library Admin Privileges: Branch Management */}
            {currentView === ROUTES.LIBRARY_ADMIN && (
              <>
                <div className='admin-item'>
                  <h3><a href={`#${currentView}/${ROUTES.CREATE_BRANCH}`}>create branch</a></h3>
                </div>
                <div className='admin-item'>
                  <h3><a href={`#${currentView}/${ROUTES.UPDATE_BRANCH}`}>update branch</a></h3>
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className='admin'>
      <div className="min-h-screen"> {/*tail-wind css min-h(min-height) and screen(100vh)*/}
        <main className="render-view">
          {renderView()}
          <NavigationLinks currentView={currentView} />
        </main>
      </div>

      <p className="test-message">this is another test message</p>

      <div className="admin-footer-info">
        <p>
          This is the **Admin** view, rendered when the URL hash is `#admin`. Access is restricted to users with the 'admin' role.
        </p>
      </div>
    </div>
  )
}

export default AdminView