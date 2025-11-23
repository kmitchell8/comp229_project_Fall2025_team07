import React, { /*createContext, */useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContext';
import { signOut } from '../Api/authApi';


// AuthProvider component handles the state and logic,

export const AuthProvider = ({ children }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [view, setView] = useState('login'); // view state for the main app (Navbar)
    const [loading, setLoading] = useState(true); // New state for initial loading

    // Derived state: the simplified role

    const role = userInfo ? (userInfo.role || 'user') : 'signedOut';//state based on user role

    //Authentication Logic 

    // Reads token/user from localStorage on app load
    const checkAuthState = useCallback(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setUserInfo(user);
                setView('authenticated');
            } catch {
                // Handle corrupted storage
                localStorage.removeItem('user');
                localStorage.removeItem('jwt');
                setView('login');

            }
        } else {
            setView('login');
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        checkAuthState();
    }, [checkAuthState]);

    // Handler for successful Login (called by Login.jsx)
    const login = (user) => {
        // Assume JWT ('jwt') and user data ('user') are already stored in localStorage by the Login component
        setUserInfo(user);
        setView('authenticated');
        window.location.replace('./profile.html');
    };

    // Handler for Signout (called by Navbar.jsx)
    const logout = async () => {
        try {
            //call the server API to invalidate the session/cookie
           await signOut();
        } catch (err) {
            console.error(err);
        } finally {
            //clear local storage
            localStorage.removeItem('jwt');
            localStorage.removeItem('user');

            setUserInfo(null); // Clear user info
            setView('login'); // Switch to login view
            
            //window.location.hash = ''; // resets hash on signout on pages where needed
            window.location.replace('./');
        }
    };

    // Context Value

    const value = {
        userInfo,
        role, // Universal role state
        view, // Universal view state
        loading,
        login, // Universal login function
        logout, // Universal logout function
        setView, // Universal function to switch views ('login', 'register')
        isAuthenticated: !!userInfo,
        // Helper to get the token for authenticated API calls (using the new key 'jwt')
        getToken: () => localStorage.getItem('jwt'),
    };

    if (loading) {
        return <div className="loading"><p>Loading authentication...</p></div>;
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

