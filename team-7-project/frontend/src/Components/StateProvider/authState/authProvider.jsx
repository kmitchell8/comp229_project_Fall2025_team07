import React, { /*createContext, */useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContext';
import { getUserRoles, signOut, forgotPassword, resetPassword } from '../../Api/authApi';
import { ROUTES } from '../../Api/routingConfig';

// AuthProvider component handles the state and logic,

export const AuthProvider = ({ children }) => {
    const [userInfo, setUserInfo] = useState(null);
    const [view, setView] = useState('login'); // view state for the main app (Navbar)
    const [availableRoles, setAvailableRoles] = useState([]); // State for your JSON roles
    const [loading, setLoading] = useState(true); // New state for initial loading

    // Derived state: the simplified role
    // 1. Fetch the roles from the backend on mount
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const data = await getUserRoles();
                // If JSON is roles: { user: [...], admin: [...] }
                setAvailableRoles(data);
            } catch (err) {
                console.error("Error loading user roles from backend:", err);
                // Optional: Fallback roles if the file is missing
                setAvailableRoles({
                    user: ['user'],
                    admin: ['admin', 'libraryAdmin', 'branchAdmin']
                });
            }
        };
        fetchRoles();
    }, []);
    //const role = userInfo ? (userInfo.role || 'user') : 'signedOut';//state based on user role

    //Authentication Logic 

    // Reads token/user from localStorage on app load
    const checkAuthState = useCallback(() => {
        const storedUser = localStorage.getItem('user'); //check and see if all user data is stored in StoredUser
        //const storedToken = localStorage.getItem('jwt');
        if (storedUser /*&& storedToken*/) {
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
        // Sync the new user data (with the libraryId) to storage
        //localStorage.setItem('user', JSON.stringify(user));
        setUserInfo(user);
        setView('authenticated');
        //window.location.replace('./profile.html');
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

    //PASSWORD RESET HANDLERS

    const handleForgotPassword = async (email) => {
        return await forgotPassword(email);
    };

    const handleResetPassword = async (token, newPassword) => {
        return await resetPassword(token, newPassword);
    };

    const userRole = userInfo?.role || 'signedOut';
    const hasAdminPrivileges = (availableRoles?.admin || []).includes(userRole);
    // Context Value
    const value = {
        availableRoles,
        userInfo,
        role: userRole,
        isAuthenticated: !!userInfo,
        loading,

        // SaaS & Permission Helpers (Now Dynamic!)
        hasAdminPrivileges,
        isAdmin: userRole === 'admin',
        isLibraryAdmin: userRole === 'libraryAdmin',
        isBranchAdmin: userRole === 'branchAdmin',

        // Tenant context
        tenantId: userInfo?.managementAccess?.libraryId || null,
        branchId: userInfo?.managementAccess?.branchId || null,

        // Actions
        login,
        logout,
        setView,
        view,
        handleForgotPassword,
        handleResetPassword,
        getToken: () => {
            const raw = localStorage.getItem('jwt');
            if (!raw) return null;
            try {
                const obj = JSON.parse(raw);
                return obj.token;
            } catch {
                return raw;
            }
        },
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

