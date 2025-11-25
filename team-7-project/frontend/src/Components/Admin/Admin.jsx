import React from 'react'
import './Admin.css'



const Admin =()=>{
  return ( <div className ='admin'>
        <p>this is another test message</p>
        <p>Update user</p>
        <p>update book</p>
        <p>remove book</p>
           <div >
            <p >
                This is the **Admin** view, rendered when the URL hash is `#admin`. Access is restricted to users with the 'admin' role.
            </p>
        </div>
  </div>)
}

export default Admin