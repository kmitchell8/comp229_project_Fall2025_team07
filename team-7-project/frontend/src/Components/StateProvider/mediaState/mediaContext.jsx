import React, { createContext} from 'react';

//Create the Context object
//separate file needed to avoid fast refresh warning
//if no fast refresh warning this MediaContext can be placed in the 
//MediaProvider file

export const MediaContext = createContext(null);