import React from 'react'
import './Profile.css'
import { useAuth } from '../authState/useAuth'

const Profile = () => {
    const { userInfo } = useAuth();

    return (<div className='profile'>
        <p>this is a test message</p>
         <p>view profile details (contact info)</p>
        <div>

            <p><strong>User ID:</strong> {userInfo?._id || 'N/A'}</p>
            <p><strong>Username:</strong> {userInfo?.name || 'N/A'}</p>
            <p><strong>Role:</strong> {userInfo?.role || 'N/A'}</p>
            <p >
                This is the **Profile** view. This view is rendered when the URL hash is empty or `#profile`.
            </p>

        </div>
    </div>)
}

export default Profile