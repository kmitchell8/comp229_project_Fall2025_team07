import React, { createContext} from 'react';

//Create the Context object
//separate file needed to avoid fast refresh warning
//if no fast refresh warning this UserContext can be placed in the 
//UserProvider file

export const UserContext = createContext(null);