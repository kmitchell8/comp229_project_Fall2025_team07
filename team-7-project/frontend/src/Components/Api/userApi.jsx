//import React from 'react';
import { API_URL } from "../../../config";
const BASE_URL = `${API_URL}/users`;

//getting the header and making it global for all modules
const getAuthHeaders = async (getToken) => {
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

const getAuthHeadersNoJson = async (getToken) => {
    const jwt = await getToken();
    if (!jwt) {
        // If the token is missing, throw an error immediately before fetching
        throw new Error('User not authorized. Please Login.');
    }
    return {
        //'Content-Type': 'application/json',//ensure information is listed in json format
        //this authheader is for files/data that cannot/should not be processed as json
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

//Create a user entry
const create = async (userData, getToken) => {//
    const headers = await getAuthHeaders(getToken);

    return fetchHelper(BASE_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(userData),//includes data to be created
    });

};


//List all users
const list = async (getToken) => {
    const headers = await getAuthHeaders(getToken);
    return fetchHelper(BASE_URL, {
        method: 'GET',
        headers: headers,
    });
};

//Delete all users
const deleteAll = async (getToken) => {
    const headers = await getAuthHeaders(getToken);

    return fetchHelper(BASE_URL, {
        method: 'DELETE',
        headers: headers,
    });
};

//List one user
const read = async (userId, getToken) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${userId}`

    return fetchHelper(url, {
        method: 'GET',
        headers: headers,
    });
};

//Update user entry
const update = async (userData, userId, getToken) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${userId}`

    return fetchHelper(url, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(userData) //needed to update user data          
    });
};

//Delete one user
const remove = async (userId, getToken) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${userId}`
    return fetchHelper(url, {
        method: 'DELETE',
        headers: headers,
    });
};

//PROFILE
const getCountries = async () => {
    const domainName = BASE_URL.replace('/api/users', '');
    const url = `${domainName}/documents/country.json`;

    return fetchHelper(url, {
        method: 'GET'
    });


};

const getImages = (image, userId) => {
    const domainName = BASE_URL.replace('/api/users', '');
    // METHOD A: The "Placeholder" Path
    const isPlaceholder = image === 'coverimage' || image === 'profileimage'
    if (isPlaceholder) {
        return `${domainName}/images/temp/${image}.png`;
        // Result: http://localhost:5000/images/temp/profileimage.png
    }
    // METHOD B: The "Dedicated User" Path
    return `${domainName}/users/${userId}/${image}`;
    // Result: http://localhost:5000/users/64abc.../profile_123.jpg
};


//UPLOADS USER PICTURES
//This mirrors the CreateMedia logic by using FormData to send the binary file
//along with the necessary metadata (ID and filename).

const uploadPictures = async (data, getToken) => {

    const headers = await getAuthHeadersNoJson(getToken);
    const userFolder = data._id.toString();
    const domainName = BASE_URL.replace('/api/users', '');

    const url = `${domainName}/users/${userFolder}/`;
    const formData = new FormData();

    // The actual image file (from your file input)
    formData.append('imageFile', data.file);
    // Metadata required by the server
    formData.append('userId', data._id);
    formData.append('fileName', data.fileName);      // e.g., "profile_shot"
    formData.append('extension', data.extension);    // e.g., ".jpg"

    // 5. Execute the request
    return fetchHelper(url, {
        method: 'POST',
        headers: headers,
        body: formData, // The body is now the Multi-part Form Data
    });
};
export default { create, list, deleteAll, read, update, remove, getCountries, getImages, uploadPictures };