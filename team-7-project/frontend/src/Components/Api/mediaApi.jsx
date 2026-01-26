//import React from 'react';
import { API_URL } from "../../../config";
const BASE_URL = `${API_URL}/media`;
const DOMAIN_URL = BASE_URL.replace('/api/media', '');


//getting the header and making it global for all modules
// 1. Updated for optional auth (Guest-friendly)
const getAuthHeaders = async (getToken) => {
    const headers = { 'Content-Type': 'application/json' };
    if (typeof getToken === 'function') {
        try {
            const jwt = await getToken();
            if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            console.warn("Guest access: No token retrieved.");
        }
    }
    return headers;
};

// 2. Updated for File Uploads (Guest-friendly)
const getAuthHeadersNoJson = async (getToken) => {
    const headers = {};
    if (typeof getToken === 'function') {
        try {
            const jwt = await getToken();
            if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            console.warn("Guest access: No token retrieved.");
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

//Create a media entry
const create = async (mediaData, getToken) => {//
    const headers = await getAuthHeaders(getToken);

    return fetchHelper(BASE_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(mediaData),//includes data to be created
    });

};

//MEDIA COVER

const uploadCover = async (coverFile, libraryId, branchId, mainBranchId, getToken) => {
    const headers = await getAuthHeadersNoJson(getToken);

    const formData = new FormData();
    formData.append('coverImage', coverFile);
    // Append the hierarchy IDs so the controller knows where to save
    formData.append('libraryId', libraryId || "");
    formData.append('branchId', branchId || "");
    formData.append('mainBranchId', mainBranchId || "");

    return fetchHelper(`${BASE_URL}/cover`, {
        method: 'POST',
        headers: headers,
        body: formData,
    });
};

const removeCover = async (filename, libraryId, branchId, getToken) => {
    const headers = await getAuthHeaders(getToken);

    return fetchHelper(`${BASE_URL}/cover`, {
        method: 'DELETE',
        headers: headers,
        // Backend deleteCover controller expects these for getStoragePath
        body: JSON.stringify({
            cover: filename,
            libraryId: libraryId,
            branchId: branchId
        }),
    });
};

const getCoverUrl = (filename, libraryId, branchId) => {
    if (!filename) return '../../assets/default_cover.png';
    const domainName = BASE_URL.replace('/api/media', '');

    // Tier 1: Global Master (IDs are null/null) -> /images/cover/filename
    if (!libraryId || libraryId === 'null') {
        return `${domainName}/images/cover/${filename}`;
    }

    // Tier 2 & 3: Library/Branch -> /images/cover/libId/branchId/filename
    // If it's a Library Master, branchId will be the mainBranchId
    return `${domainName}/images/cover/${libraryId}/${branchId}/${filename}`;
};


//DESCRIPTION

const uploadDescription = async (data, getToken) => {
    const headers = await getAuthHeaders(getToken);

    return fetchHelper(`${BASE_URL}/description`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            descriptionContent: data.descriptionContent,
            coverBaseName: data.coverBaseName,
            libraryId: data.libraryId, // ADD THESE
            branchId: data.branchId

        })
    });

};

const getDescriptionUrl = (filename, libraryId, branchId) => {
    if (!filename) return null;

    const domainName = BASE_URL.replace('/api/media', '');
    // Tier 1: Global
    if (!libraryId || libraryId === 'null') {
        return `${domainName}/documents/description/${filename}`;
    }
    // Tier 2 & 3: Tenant/Branch
    return `${domainName}/documents/description/${libraryId}/${branchId}/${filename}`;
};

const getDescriptionText = async (filename, libraryId, branchId) => {
    const url = getDescriptionUrl(filename, libraryId, branchId);
    if (!url) return "No description available.";

    return await fetchHelper(url, {
        method: 'GET'
    });
};

//List all media
const list = async (libraryId, branchId = 'all', type = null, getToken = null) => {
    // Handle 'all' or null to return the base URL
    /* const isFiltered = type && type !== 'all';
     const url = isFiltered ? `${BASE_URL}?type=${type}` : BASE_URL;
    */

    // Construct the Query Parameters
    // libraryId which is mandatory for SaaS structure
    const params = new URLSearchParams();
    if (libraryId && libraryId !== 'library') {
        params.append('libraryId', libraryId);
    }
    if (branchId && branchId !== 'all') {
        params.append('branchId', branchId);
    }
    if (type && type !== 'all') {
        params.append('type', type);
    }

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}?${queryString}` : BASE_URL;
    const headers = await getAuthHeaders(getToken);

    return fetchHelper(url, {
        method: 'GET',
        headers: headers
    });
};

//Delete all media
const deleteAll = async (getToken) => {
    const headers = await getAuthHeaders(getToken);

    return fetchHelper(BASE_URL, {
        method: 'DELETE',
        headers: headers
    });
};

//List one media
const read = async (mediaId) => {
    const url = `${BASE_URL}/${mediaId}`

    return fetchHelper(url, {
        method: 'GET'
    });
};

//Update media entry
const update = async (mediaData, mediaId, getToken) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${mediaId}`

    return fetchHelper(url, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(mediaData) //needed to update media data          
    });
};

//Delete one media
const remove = async (mediaId, getToken) => {
    const headers = await getAuthHeaders(getToken);
    const url = `${BASE_URL}/${mediaId}`
    return fetchHelper(url, {
        method: 'DELETE',
        headers: headers,
    });
};

const getConfigDoc = async (docName) => {
    // Dynamically point to any JSON file in the documents folder
    const url = `${DOMAIN_URL}/documents/${docName}.json`;
    return fetchHelper(url, {
        method: 'GET'
    });
};

export default {
    create,
    uploadCover,
    removeCover,
    getCoverUrl,
    uploadDescription,
    getDescriptionUrl,
    getDescriptionText,
    list,
    deleteAll,
    read,
    update,
    remove,
    getConfigDoc
};