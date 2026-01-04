import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../StateProvider/authState/useAuth';
//import { getHash } from '../Api/getPage';
import { ROUTES, ADMIN_SUB_VIEWS } from '../Api/routingConfig'
import CreateMedia from '../Admin/CreateMedia';
import UpdateMedia from '../Admin/UpdateMedia';
import UpdateUser from '../Admin/UpdateUser';
import Profile from '../Profile/Profile';
//import './Admin.css'

const AdminView = ({ pathSegments: parentSegments = [] }) => {
  const { role: userRole } = useAuth(); //use the Auth hook to access role of the user
  const internalSegment = parentSegments[1];

  //const adminViews = useMemo(() => [ROUTES.CREATE_MEDIA, ROUTES.UPDATE_MEDIA, ROUTES.UPDATE_USER], []);//recommended but not necessary keep for future reference

  // logic to determine the initial view based on the URL hash
  const getInternalView = useCallback(() => {
    //const adminViews = [ROUTES.CREATE_MEDIA, ROUTES.UPDATE_MEDIA, ROUTES.UPDATE_USER];

    if (userRole !== 'admin') {//safety check
      window.location.hash = ROUTES.PROFILE;
      //return { view: ROUTES.PROFILE, segments: [ROUTES.PROFILE] };
      return ROUTES.PROFILE;
    }
    if (ADMIN_SUB_VIEWS.includes(internalSegment)) {
      return internalSegment;
    }
    return 'admin';


  }, [userRole, internalSegment]);

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

  const NavigationLinks = ({ currentView }) => { //need to be outside the render or it will continually lose it's state
    const isDetailView = !!itemId; // Now isDetailView is strictly true or false
    return (
      <div className="admin-nav-footer">
        {currentView !== ROUTES.ADMIN && (

          <button
            onClick={() => window.history.back()}
            className="admin-go-back"
          >
            &#8592; {/*ICON FOR LEFT POINTING ARROW*/}
          </button>
        )}       {isDetailView && (

          <button
            onClick={() => (window.location.hash = ROUTES.ADMIN)}
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
      case ROUTES.CREATE_MEDIA:
        return <CreateMedia />;
      case ROUTES.UPDATE_MEDIA:
        return <UpdateMedia pathId={itemId} />;
      case ROUTES.UPDATE_USER:
        return itemId ? <Profile managedUserId={itemId} /> : <UpdateUser />;
      //return <UpdateUser parentSegment={parentSegments} />; //Uncomment once UpdateUser accepts parentSegmentsd internally
      //and handles <Profile /> subview logic
      case ROUTES.ADMIN:
      default:
        return (
          <div className='admin-container'>
            <div className='admin-item'>
              <h3>
                <a href={`#${ROUTES.ADMIN}/${ROUTES.CREATE_MEDIA}`}>create media</a>
              </h3>
            </div>
            <div className='admin-item'>
              <h3>
                <a href={`#${ROUTES.ADMIN}/${ROUTES.UPDATE_MEDIA}`}>update media</a>
              </h3>
            </div>
            <div className='admin-item'>
              <h3>
                <a href={`#${ROUTES.ADMIN}/${ROUTES.UPDATE_USER}`}>update user</a>
              </h3>
            </div>
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