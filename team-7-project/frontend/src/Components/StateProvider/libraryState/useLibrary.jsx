import React,{ useContext } from 'react';
import { LibraryContext } from './libraryContext.jsx'; //libraryContext is in the Libraryentication provider file

//Custom hook to use the libraryentication context. 
//libraryentication context sets the views based on the libraryentication state



export const useLibrary = () => { 
    const context = useContext(LibraryContext);
    if (!context) {
        throw new Error("useLibrary must be used within an LibraryProvider");
    }
    return context;
};
