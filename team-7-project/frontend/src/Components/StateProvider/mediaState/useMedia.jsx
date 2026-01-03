import React,{ useContext } from 'react';
import { MediaContext } from './mediaContext.jsx'; //authContext is in the Authentication provider file

//Custom hook to use the authentication context. 
//authentication context sets the views based on the authentication state



export const useMedia = () => { 
    const context = useContext(MediaContext);
    if (!context) {
        throw new Error("useMedia must be used within an MediaProvider");
    }
    return context;
};
