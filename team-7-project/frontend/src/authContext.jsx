import React, { createContext} from 'react';

//Create the Context object
//separate file needed to avoid fast refresh warning
//if no fast refresh warning this AuthContext can be placed in the 
//authProvider file
export const AuthContext = createContext(null);