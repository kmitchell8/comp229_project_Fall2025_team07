//import React from 'react';
import { API_URL } from "../../../config";
const BASE_URL = `${API_URL}/medias`;


//getting the header and making it global for all modules
const getAuthHeaders = async (getToken) => {
    const jwt = await getToken();
    if (!jwt) {
        // If the token is missing, throw an error immediately before fetching
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

        const contentType = response.headers.get("content-type");
        // try parse JSON data / other data regardless of response status for detailed error messages
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

const uploadCover = async (coverFile, getToken) => {
    const headers = await getAuthHeadersNoJson(getToken);

    const formData = new FormData();
    formData.append('coverImage', coverFile);

    return fetchHelper(`${BASE_URL}/cover`, {
        method: 'POST',
        headers: headers,
        body: formData,
    });
};

const removeCover = async (filename, getToken) => {
    const headers = await getAuthHeaders(getToken);

    return fetchHelper(`${BASE_URL}/cover`, {
        method: 'DELETE',
        headers: headers,
        body: JSON.stringify({ cover: filename }),
    });
};

const getCoverUrl = (filename) => {
    if (!filename) return '../../assets/default_cover.png';
    const domainName = BASE_URL.replace('/api/medias', '');

    return `${domainName}/images/cover/${filename}`;
};


//DESCRIPTION

const uploadDescription = async (data, getToken) => {
    const headers = await getAuthHeaders(getToken);

    return fetchHelper(`${BASE_URL}/description`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            descriptionContent: data.descriptionContent,
            coverBaseName: data.coverBaseName
        })
    });

};

const getDescriptionUrl = (descriptionPath) => {
    if (!descriptionPath) return null;

    const domainName = BASE_URL.replace('/api/medias', '');
    return `${domainName}${descriptionPath}`;

}

const getDescriptionText = async (descriptionPath) => {
    const url = getDescriptionUrl(descriptionPath);
    if (!url) return "No description available.";

    return await fetchHelper(url, {
        method: 'GET'
    })


}
//List all medias
const list = async (type = null, getToken=null) => {
    // Handle 'all' or null to return the base URL
    const isFiltered = type && type !== 'all';
    const url = isFiltered ? `${BASE_URL}?type=${type}` : BASE_URL;
    const headers = getToken ? await getAuthHeaders(getToken) : {};
    return fetchHelper(url, {
        method: 'GET',
        headers: headers
    });
};

//Delete all medias
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

const getGenres = async () => {
    const domainName = BASE_URL.replace('/api/medias', '');
    const url = `${domainName}/documents/genres.json`;

    return fetchHelper(url, {
        method: 'GET'
    });
};

const getMediaTypes = async () => {
    const domainName = BASE_URL.replace('/api/medias', '');
    const url = `${domainName}/documents/mediaTypes.json`;

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
    getGenres,
    getMediaTypes
};