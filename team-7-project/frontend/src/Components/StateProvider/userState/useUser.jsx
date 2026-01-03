import React,{ useContext } from 'react';
import { UserContext } from './userContext.jsx'; //authContext is in the Authentication provider file

//Custom hook to use the authentication context. 
//authentication context sets the views based on the authentication state



export const useUser = () => { 
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within an UserProvider");
    }
    return context;
};
