import React, { createContext} from 'react';

//Create the Context object
//separate file needed to avoid fast refresh warning
//if no fast refresh warning this LibraryContext can be placed in the 
//libraryProvider file
export const LibraryContext = createContext(null);