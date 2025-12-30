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
    //const hash = getHash();

    ////Do not lose code: This code is a concise way to handle nested views as nested hashes 
    //!VERY IMPORTANT. the hash gets split into an array and that array is then checked
    //Split the hash once into all segments and get the primary key profileview. The code looks at the primary segment
    //and in profileView code the code looks at the second segment [1]
    //Filter out empty strings if the hash is just '#'
    //All of this is passed to adminview from pageview through the Admin arugements

    //const segments = parentSegments.split('/').filter(s => s !== '');
    //const internalSegment = segments[1];
    //const adminViews = ['admin', 'createmedia', 'updatemedia', 'updateuser']

    //if (adminViews.includes(internalSegment)) {
    //If no hash or just 'profile', ensure hash is set correctly for clean routing

    //return { view: internalSegment, segments };
    //}

    //Assign value to primary segment that is either createupdate,updatemedia, andupdateuser
    //makes the adminView resuable for all pages that have a nested view inside the
    //parent admin view
    /* if (['createmedia', 'updatemedia', 'updateuser'].includes(primarySegment)) {
       return { view: primarySegment, segments };
     }
     if (primarySegment ==='admin'){
     window.location.hash = 'admin';
     return { view: 'admin', segments };
     }
    
    if (internalSegment !== 'profile') {
      window.location.hash = 'profile';
    }
    return { view: 'profile', segments: ['profile'] };*/
  }, [userRole, internalSegment/*,adminViews*/]);


  //State stores both the primary view key and the full path segments
  //const [currentView, setCurrentView] = useState(getInitialView);
  const [currentView, setCurrentView] = useState(() => getInternalView());
  //const { view: currentView, segments: pathSegments } = viewData;

  // listen for hash changes and update the state
  useEffect(() => {
    /*const handleHashChange = () => {
      // Update state with new view and segments
      setCurrentView(getInitialView());
    };
      window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };*/
    setCurrentView(getInternalView());

  }, [parentSegments, getInternalView]);
  if (currentView === 'profile') {
    //forcing a redirect via window.location.hash, 
    //we should stop rendering anything here.
    return null;
  }
  const NavigationLinks = ({ currentView }) => {//need to be outside the render or it will continually lose it's state
  return (
    <div>
      {currentView !== 'admin' && (
        <button onClick={() => window.location.hash = 'admin'}
          className="button-group"
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
        return <CreateMedia /*pathSegments={parentSegments}*//>;
      case 'updatemedia':
        return <UpdateMedia pathId={itemId}/*pathSegments={parentSegments}*//>;
      case 'updateuser':
        return <UpdateUser pathId={itemId}/*pathSegments={parentSegments}*//>;
      case 'admin':
      default:
        return (
          <div className='admin-container'>
            <div className='admin'>
              <h3>
                <a href="#/admin/createmedia">create media</a>
              </h3>
            </div>
            <div className='admin'>
              <h3>
                <a href="#/admin/updatemedia">update media</a>
              </h3>
            </div>
            <div className='admin'>
              <h3>
                <a href="#/admin/updateuser">update user</a>
              </h3>
            </div>
          </div>
        );
    }
  };

  //Helper component for navigation buttons
  /* const NavigationLinks = () => {
     return (
       //Keeping container styling for layout purposes (Tail Wind CSS)
       <div className="flex justify-center space-x-4 p-4 border-t border-gray-200 mt-6 bg-gray-50 rounded-b-lg">
         {currentView !== 'list' && (
           <button onClick={() => window.location.hash = 'employee/list'}
             className="button-group"
           >
             View Employee List
           </button>
         )}
         {currentView !== 'form' && (
           <button onClick={() => window.location.hash = 'employee/form'}
             className="button-group"
           >
             Go to Hiring Form
           </button>
         )}
       </div>
     );
   };*/

  return (<div className='admin'>
    <div className="min-h-screen"> {/*tail-wind css min-h(min-height) and screen(100vh)*/}

      <main className="render-view">
        {renderView()}
        <NavigationLinks currentView={currentView} />
      </main>
    </div>
    <p>this is another test message</p>

    <div >
      <p >
        This is the **Admin** view, rendered when the URL hash is `#admin`. Access is restricted to users with the 'admin' role.
      </p>
    </div>
  </div>)
}

export default AdminView