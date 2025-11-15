//import React from 'react';
const BASE_URL = 'api/contacts';

//getting the header and making it global for all modules
const getAuthHeaders = async(getToken) => {
    const jwt = await getToken();
    if (!jwt) {
        // If the token is missing, we throw an error immediately before fetching
        throw new Error('User not authorized. Please Login.');
    }
    return {
        'Content-Type': 'application/json',//ensure information is listed in json format
        'Authorization': `Bearer ${jwt}`, //manually add token to header
    };
};

//necessary to ensure that fetch works the way it should
//in this asynchronous environment the getAutHeader does not hold the actual header
//it holds the promise of an header thats called in the API helpers
//the function will fail before it gets to populate the headers
const fetchHelper = async (url, options) => {

    //code standardised and no longer needed in every API helper
    try {
        const response = await fetch(url, options);//url = api urls options = options for the data

        // try parse JSON data regardless of response status for detailed error messages
        const data = await response.json().catch(() => ({ message: 'No response body' }));

    
        if (response.ok) {
            console.log('API call successful:', url, data);
            return data;
        } else {            
            const errorMessage = data.message || `API request failed with status: ${response.status}.`;
            console.error('API call failed:', response.status, data);
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('Network or Authorization error:', error);
        throw error; 
    }
};

//Create a contact entry
const create = async (contactData, getToken) => {//
    const headers = await getAuthHeaders(getToken);
    
        return fetchHelper(BASE_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(contactData),//includes data to be created
        });        
    
};


//List all contacts
const list = async (getToken) => {    
    const headers = await getAuthHeaders(getToken);
        return fetchHelper(BASE_URL, {
            method: 'GET',
            headers: headers,    
        });       
};

//Delete all contacts
const deleteAll = async (getToken) => {
 const headers = await getAuthHeaders(getToken);
    
        return fetchHelper(BASE_URL, {
            method: 'DELETE',
            headers: headers,            
        });     
};

//List one contact
const read = async (contactId, getToken) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${contactId}`

        return fetchHelper(url, {
            method: 'GET',
            headers: headers,    
        });
};

//Update contact entry
const update = async (contactData,contactId,getToken) => {
 const headers = await getAuthHeaders(getToken);
 const url = `${BASE_URL}/${contactId}`

        return fetchHelper(url, {
            method: 'PUT',
            headers: headers, 
            body: JSON.stringify(contactData) //needed to update contact data          
        });
};

//Delete one contact
const remove = async (contactId,getToken) => {
 const headers = await getAuthHeaders(getToken);
 const url = `${BASE_URL}/${contactId}`
  return fetchHelper(url, {
            method: 'DELETE',
            headers: headers,            
        });
};
export default { create, list, deleteAll, read, update, remove};