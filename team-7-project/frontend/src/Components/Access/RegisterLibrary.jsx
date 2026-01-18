import React, { useState } from 'react';
import './Access.css';
import { useLibrary } from '../StateProvider/libraryState/useLibrary.jsx';
import libraryApi from '../Api/libraryApi.jsx';
import userApi from '../Api/userApi.jsx';
import { useAuth } from '../StateProvider/authState/useAuth.jsx';
//import { useAuth } from '../StateProvider/authState/useAuth.jsx';
import { ROUTES } from '../Api/routingConfig.js';

const RegisterLibrary = () => {
    const { libraryDetails, refreshLibrary } = useLibrary();
    const { getToken, login, userInfo } = useAuth();


    // Identity focus: The only strict requirement is the Library Name
    const [libName, setLibName] = useState(libraryDetails?.name || '');
    const [createMainNow, setCreateMainNow] = useState(true);
    const [status, setStatus] = useState({ loading: false, error: null });

    const handleInitialSubmit = async (e) => {
        e.preventDefault();
        if (!userInfo?._id) return;
        setStatus({ loading: true, error: null });

        try {
            // Register/Update the Library identity           
            const newLibInfo = {
                name: libName.trim()
            };

            // once Library is updated then user becomes admin
            const createdLibrary = await libraryApi.create(newLibInfo, getToken);

            const newLibraryId = createdLibrary?._id;

            if (!newLibraryId) {
                throw new Error("Failed to retrieve new Library ID.");
            }
            const targetId = userInfo._id;
            const newUserInfo = {
                ...userInfo,
                role: 'libraryAdmin',
                managementAccess: {
                    ...userInfo.managementAccess,
                    libraryId: newLibraryId
                }
            };
            // will check if successfull later and find different method
            const response = await userApi.update(newUserInfo, targetId, getToken);
            //ensures the Navbar and ProtectedRoutes see the new role immediately
            if (response.token && response.user) {
                // This 'jwt' is what libraryApi will use for the next call (e.g. listAllBranches)
                localStorage.setItem('jwt', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                // Sync the virtual state
                if (login) login(response.user);
            }

            // Refresh Library context to ensure the new name/ID is available globally
            if (refreshLibrary) {
                await refreshLibrary();
            }
            // Route based on the toggle selection
       
                const adminPath = ROUTES.LIBRARY_ADMIN.replace(/^\//, '');
                const actionPath = ROUTES.CREATE_BRANCH.replace(/^\//, '');
                const targetUrl = `./profile.html#/${adminPath}/${actionPath}`;
                console.log(`./profile.html#/${ROUTES.LIBRARY_ADMIN}/${ROUTES.CREATE_BRANCH}`);

                window.location.href = targetUrl;
       

        } catch (err) {
            setStatus({ loading: false, error: err.message || 'Registration failed.' });
        }
    };

    return (
        <div className="register-library-container"> {/* Container for centering */}

            {/* The Card View Wrapper */}
            <div className="register-library-card">
                <h2 className="register-library-header">Library Registration</h2>

                {status.error && <div className="register-error">{status.error}</div>}
                <form onSubmit={handleInitialSubmit}>
                    {/* Section Group matches the Admin style */}
                    <div className="form-section-group">


                        <div className="form-group">
                            <label htmlFor="libName" className="input-label">
                                Library Name <span className="required">*</span>
                            </label>
                            <input
                                id="libName"
                                type="text"
                                className="input-field"
                                value={libName}
                                onChange={(e) => setLibName(e.target.value)}
                                placeholder="e.g., Springvale Public Library"
                                required
                                disabled={status.loading}
                            />
                        </div>
                    </div>

                    <div className="form-section-group">
                        <div className="form-group checkbox-inline-group">
                            <div className="checkbox-wrapper">
                                <input
                                    type="checkbox"
                                    id="createMainToggle"
                                    checked={createMainNow}
                                    onChange={(e) => setCreateMainNow(e.target.checked)}
                                    className="form-checkbox"
                                    disabled={status.loading}
                                />
                                <label htmlFor="createMainToggle" className="checkbox-label-text">
                                    Register Main Branch
                                </label>
                            </div>
                            <p className="field-info">
                                <em>Note: Upon registration, you will be authorized as a
                                    <strong> Library Administrator</strong>.  You cannot manage media
                                    content until at least one branch is active. Also, </em>
                            </p>
                        </div>
                    </div>

                    <div className="form-action-group">
                        <button
                            type="submit"
                            className="register-btn"
                            disabled={status.loading || !libName.trim()}
                        >
                            {status.loading ? 'Processing...' : 'Complete Registration'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegisterLibrary;