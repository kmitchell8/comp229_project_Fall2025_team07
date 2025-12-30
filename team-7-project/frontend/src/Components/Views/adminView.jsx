import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../authState/useAuth';
//import { getHash } from '../Api/getPage';
import CreateMedia from '../Admin/CreateMedia';
import UpdateMedia from '../Admin/UpdateMedia';
import UpdateUser from '../Admin/UpdateUser';
//import './Admin.css'

const AdminView = ({ pathSegments: parentSegments = [] }) => {
  const { role: userRole } = useAuth(); //use the Auth hook to access role of the user
  const internalSegment = parentSegments[1];

  //const adminViews = useMemo(() => ['createmedia', 'updatemedia', 'updateuser'], []);//recommended but not necessary keep for future reference

  // logic to determine the initial view based on the URL hash
  const getInternalView = useCallback(() => {
    const adminViews = ['createmedia', 'updatemedia', 'updateuser'];

    if (userRole !== 'admin') {//safety check
      window.location.hash = 'profile';
      //return { view: 'profile', segments: ['profile'] };
      return 'profile';
    }
    if (adminViews.includes(internalSegment)) {
      return internalSegment;
    }
    return 'admin';
    
    ////Do not lose code: This code is a concise way to handle nested views as nested hashes 
    //!VERY IMPORTANT. the hash gets split into an array and that array is then checked
    //Split the hash once into all segments and get the primary key profileview. The code looks at the primary segment
    //and in profileView code the code looks at the second segment [1]
  }, [userRole, internalSegment]);

  //State stores both the primary view key and the full path segments
  const [currentView, setCurrentView] = useState(() => getInternalView());

  // listen for hash changes and update the state
  useEffect(() => {
    setCurrentView(getInternalView());
  }, [parentSegments, getInternalView]);

  if (currentView === 'profile') {
    //forcing a redirect via window.location.hash, 
    //we should stop rendering anything here.
    return null;
  }

  const NavigationLinks = ({ currentView }) => { //need to be outside the render or it will continually lose it's state
    return (
      <div className="admin-nav-footer">
        {currentView !== 'admin' && (
          <button onClick={() => window.location.hash = 'admin'}
            className="admin-go-back"
          >
            Go Back
          </button>
        )}
      </div>
    );
  };

  //conditional rendering
  const itemId = parentSegments[2];
  const renderView = () => {
    switch (currentView) {
      case 'createmedia':
        return <CreateMedia />;
      case 'updatemedia':
        return <UpdateMedia pathId={itemId} />;
      case 'updateuser':
        return <UpdateUser pathId={itemId} />;
      case 'admin':
      default:
        return (
          <div className='admin-container'>
            <div className='admin-item'>
              <h3>
                <a href="#/admin/createmedia">create media</a>
              </h3>
            </div>
            <div className='admin-item'>
              <h3>
                <a href="#/admin/updatemedia">update media</a>
              </h3>
            </div>
            <div className='admin-item'>
              <h3>
                <a href="#/admin/updateuser">update user</a>
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