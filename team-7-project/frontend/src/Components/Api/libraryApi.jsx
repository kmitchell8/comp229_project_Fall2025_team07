//import React from 'react';
import { API_URL } from "../../../config";
const BASE_URL = `${API_URL}/library`;

// Modified to handle optional authentication
const getAuthHeaders = async (getToken) => {
    const headers = {
        'Content-Type': 'application/json', // Default header
    };

    // 1. Check if getToken was actually passed as a function
    if (typeof getToken === 'function') {
        try {
            const jwt = await getToken();
            // 2. Only add the Authorization header if a token actually exists
            if (jwt) {
                headers['Authorization'] = `Bearer ${jwt}`;
            }
        // eslint-disable-next-line no-unused-vars
        } catch (e) {
            // If getToken fails (e.g., user not logged in), we just log it and proceed as guest
            console.warn("Optional authentication failed or user not logged in. Proceeding as guest.");
        }
    }

    return headers;
};

// Keep your non-json version updated too
const _getAuthHeadersNoJson = async (getToken) => {
    const headers = {};

    if (typeof getToken === 'function') {
        try {
            const jwt = await getToken();
            if (jwt) {
                headers['Authorization'] = `Bearer ${jwt}`;
            }
        // eslint-disable-next-line no-unused-vars
        } catch (e) {
            console.warn("Optional authentication failed. Proceeding as guest.");
        }
    }
    return headers;
};

//necessary to ensure that fetch works the way it should
//in this asynchronous environment the getAutHeader does not hold the actual header
//it holds the promise of an header thats called in the API helpers
//the function will fail before it gets to populate the headers
const fetchHelper = async (url, options) => {

    //code standardised and no longer needed in every API helper
    try {
        const response = await fetch(url, options);//url = api urls & options = options for the data

        const contentType = response.headers.get("content-type");
        // try to parse JSON data / other data regardless of response status for detailed error messages
        const rawData = await response.text();//only checks the incoming stream once
        let data;
        const isTextFile = (contentType && contentType.includes("text/plain")) || url.endsWith('.txt');
        if (isTextFile) {
            data = rawData;
        } else {
            // Attempt JSON, but if it fails, get the raw text so we can see the error
            try {
                data = JSON.parse(rawData);
                // eslint-disable-next-line no-unused-vars
            } catch (e) {
                data = { message: rawData || 'No response body' };
            }
        }
        /*
        if (contentType && contentType.includes("text/plain")) {
            data = await response.text();
        } else {
            data = await response.json().catch(() => ({ message: 'No response body' }));
        }*/

        if (response.ok) {
            //console.log('API call successful:', url, data);
            return data;
        } else {

            const detailedMessage = data || {};
            const error = new Error(detailedMessage.error || detailedMessage.message || `API request failed with status: ${response.status}.`);
            //const errorMessage = data.message || `API request failed with status: ${response.status}.`;
            error.payload = detailedMessage;
            console.error('API call failed:', response.status, data);
            throw error;
        }
    } catch (error) {
        console.error('Network or Authorization error:', error);
        throw error;
    }
};

// ==========================================
// LIBRARY (TENANT) METHODS
// ==========================================

const create = async (libraryData, getToken) => {
    const headers = await getAuthHeaders(getToken);
    return fetchHelper(BASE_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(libraryData),
    });
};

const list = async (getToken = null) => {
    const headers = await getAuthHeaders(getToken);
    return fetchHelper(BASE_URL, {
        method: 'GET',
        headers: headers,
    });
};

const deleteAll = async (getToken) => {
    const headers = await getAuthHeaders(getToken);
    return fetchHelper(BASE_URL, {
        method: 'DELETE',
        headers: headers,
    });
};

const read = async (libraryId, getToken = null) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${libraryId}`;
    return fetchHelper(url, {
        method: 'GET',
        headers: headers,
    });
};

const update = async (libraryData, libraryId, getToken) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${libraryId}`;
    return fetchHelper(url, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(libraryData)
    });
};

const remove = async (libraryId, getToken) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${libraryId}`;
    return fetchHelper(url, {
        method: 'DELETE',
        headers: headers,
    });
};

// ==========================================
// BRANCH METHODS (NESTED & GLOBAL)
// ==========================================

// List all branches across the entire system (Global Admin)
const listAllBranches = async (getToken) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/branches`; // Matches: router.route('/branches')
    return fetchHelper(url, {
        method: 'GET',
        headers: headers,
    });
};

// List branches for a specific library (Tenant View)
const listBranchesByLibrary = async (libraryId, getToken = null) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${libraryId}/branches`; // Matches: router.route('/:libraryId/branches')
    return fetchHelper(url, {
        method: 'GET',
        headers: headers,
    });
};

// Create a branch inside a specific library
const createBranch = async (libraryId, branchData, getToken) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${libraryId}/branches`;
    return fetchHelper(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(branchData),
    });
};

// Read specific branch details
const readBranch = async (libraryId, branchId, getToken = null) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${libraryId}/branches/${branchId}`;
    return fetchHelper(url, {
        method: 'GET',
        headers: headers,
    });
};

// Update specific branch
const updateBranch = async (libraryId, branchId, branchData, getToken) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${libraryId}/branches/${branchId}`;
    return fetchHelper(url, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(branchData),
    });
};

// Remove specific branch
const removeBranch = async (libraryId, branchId, getToken) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${libraryId}/branches/${branchId}`;
    return fetchHelper(url, {
        method: 'DELETE',
        headers: headers,
    });
};

export default {
    create,
    list,
    deleteAll,
    read,
    update,
    remove,
    listAllBranches,
    listBranchesByLibrary,
    createBranch,
    readBranch,
    updateBranch,
    removeBranch
};