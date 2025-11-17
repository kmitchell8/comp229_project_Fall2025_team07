import React,{ useContext } from 'react';
import { AuthContext } from './authContext.jsx'; //authContext is in the Authentication provider file

//Custom hook to use the authentication context. 
//authentication context sets the views based on the authentication state



export const useAuth = () => { 
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
