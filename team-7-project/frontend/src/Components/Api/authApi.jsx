//import React from 'react';
const BASE_URL = '/api';

//Sigin API
export const signIn = async (email, password) => {

    const response = await fetch(`${BASE_URL}/signin`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',  //Content expected to be in json format
        },

        body: JSON.stringify({ email, password }),//turns json information into usable strings
    });
    let data;
    try {
        data = await response.json();
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        throw new Error(`Unexpected data (HTTP Status:${response.status})`);
    }
    if (!response.ok) {
        throw new Error(data.error || data.message || 'Login failed.');
    }

    return data;
};

//Signout API

export const signOut = async () => {
    await fetch(`${BASE_URL}/signout`, {
        mtethod: 'GET'
    })
};



//Register API
export const signUp = async (name, email, password) => {

    const response = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',  //Content expected to be in json format
        },

        body: JSON.stringify({ name, email, password }),//turns json information into usable strings
    });
    let data;
    try {
        data = await response.json();
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        throw new Error(`Unexpected data (HTTP Status:${response.status})`);
    }
    if (!response.ok) {
        throw new Error(data.error || data.message || 'Registration failed. Please check your inputs.');
    }

    return data;
};