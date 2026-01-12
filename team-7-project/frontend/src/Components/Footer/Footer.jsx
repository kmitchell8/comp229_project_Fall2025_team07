import React from 'react'
import './Footer.css'
import { ROUTES } from '../Api/routingConfig'


const Footer = () => {


 /* const renderView = () => {
    switch (currentView) {
      case ROUTES.CREATE_BRANCH:
        return <RegisterLibrary />;
    }
  };*/
  return (<div className='footer'>
    <div className="min-h-screen"> {/*tail-wind css min-h(min-height) and screen(100vh)*/}
      <main className="render-view">
        {/*renderView()*/}
        <p className="switch-text">
            Want to Create A Library? <span>
              <a href={`./access.html#${ROUTES.REGISTER_LIBRARY}`}>Register Library</a></span>
          </p>
      </main>
    </div>
    </div>)
}

    export default Footer