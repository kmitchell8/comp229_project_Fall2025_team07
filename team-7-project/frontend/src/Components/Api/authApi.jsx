//import React from 'react';
import { API_URL } from "../../../config";
const BASE_URL = `${API_URL}`;



//Sigin API
export const signIn = async (email, password) => {

    const response = await fetch(`${BASE_URL}/signin`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',  //Content expected to be in json format
        },

        body: JSON.stringify({ email, password }),//turns json information into usable strings
        //credentials: 'include'
    });
    let data;

    // Error status
    if (!response.ok) {
        let errorData = {};
        try {

            errorData = await response.json();
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            //generic message
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        //pecific error message from the backend
        throw new Error(errorData.error || errorData.message || 'Login failed.');
    }

    //successful status
    try {
        // 
        data = await response.json();
    } catch (e) {
        // If the status was 200 but parsing failed, the body was empty or corrupt.
        console.error("Login successful but data was unreadable:", e);
        throw new Error("Login failed: Server returned success but no user data.");
    }

    // Ensure the necessary data is present before returning
    if (!data.token || !data.user) {
        throw new Error("Login failed: Response is missing token or user data.");
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
      //  credentials: 'include'
    });
let data;

    // ERROR STATUS 
    if (!response.ok) {
        let errorData = {};
        try {
            //
            errorData = await response.json(); 
        // eslint-disable-next-line no-unused-vars
        } catch (e) {
            // generic error
            throw new Error(`Server error during registration: ${response.status} ${response.statusText}`);
        }
        // specific error message 
        throw new Error(errorData.error || errorData.message || 'Registration failed. Please check your inputs.');
    }

    // SUCCESSFUL STATUS
    try {
      
        data = await response.json(); 
    } catch (e) {        
        console.error("Registration successful but user data was unreadable:", e);        
        throw new Error("Registration successful, but server returned unreadable data.");
    }


    return data; 
};