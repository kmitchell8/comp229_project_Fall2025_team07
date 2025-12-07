import React, { useState, useEffect, useCallback } from 'react';
import userApi from '../Api/userApi'; // Your provided API module
import { useAuth } from '../authState/useAuth'; // Authentication context
import './Admin.css';

const ROLES = ['user', 'admin'];
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
        return dateString;
    }
};


const UpdateUser = (/*{pathId}/*{parentSegment}*/) => {//pass the _id path to be able to create an Id subview

    // const userId = pathId; // Extracts _Id to create a _Id subview (pathId can  also be parentSegment[2])
    //This information is passed down from the profileView segment anytime 
    //anything in the profile.html# path is invoked at any point in the routing   
    //see profileView and Adminview to understand the routing

const { getToken } = useAuth();
    const [feedbackMessage, setFeedbackMessage] = useState({}); 
    const [users, setUsers] = useState([]); // Original Source of Truth (oiringal data used for reference)
    const [editedUsers, setEditedUsers] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setErr] = useState(null);

    // Role uses radio buttons.
    const columns = [
        //{ header: 'ID', key: '_id', fieldKey: '_id', editable: false }, 
        { header: 'Name', key: 'name', fieldKey: 'name', editable: false, inputType: 'text' },
        { header: 'Email', key: 'email', fieldKey: 'email', editable: false, inputType: 'email' },
        { header: 'Role', key: 'role', fieldKey: 'role', editable: true, inputType: 'radio' }, // Set inputType to 'radio' for specific rendering
        { header: 'Created On', key: 'createdAt', fieldKey: 'createdAt', editable: false, format: formatDate },
    ];

    // Function to load user data from the API

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setErr(null);
        setFeedbackMessage({}); 

        try {
            const data = await userApi.list(getToken);
            setUsers(data);
            setEditedUsers(JSON.parse(JSON.stringify(data))); 
        } catch (error) {
            setErr(error.message || "An unknown error occurred while listing users.");
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const handleCellChange = useCallback((userId, key, value) => {
        setEditedUsers(prevUsers => {
            return prevUsers.map(user => {
                if (user._id === userId) {
                    return { ...user, [key]: value };
                }
                return user;
            });
        });
        setErr(null);
    }, []);
    
    const hasChanges = (originalUser, editedUser) => {
        const updatableKeys = ['name', 'email', 'role']; 
        return updatableKeys.some(key => {
            return originalUser[key] !== editedUser[key];
        });
    };

    const handleUpdate = async (userId, userName) => {
        const originalUser = users.find(u => u._id === userId);
        const editedUser = editedUsers.find(u => u._id === userId);

        if (!originalUser || !editedUser || !hasChanges(originalUser, editedUser)) {
             setFeedbackMessage(prev => ({ ...prev, [userId]: { message: `No changes detected for user: ${userName}.`, isError: false } }));
             return;
        }
        
        const updateData = {
            name: editedUser.name,
            email: editedUser.email,
            role: editedUser.role,
        };

        setFeedbackMessage(prev => {
            const newState = { ...prev };
            delete newState[userId];
            return newState;
        });

        try {
            await userApi.update(updateData, userId, getToken); 

            setUsers(prevUsers => prevUsers.map(u => u._id === userId ? editedUser : u));

            setFeedbackMessage(prev => ({
                ...prev,
                [userId]: { message: `User ${userName} updated successfully!`, isError: false }
            }));

        } catch (error) {
            console.error("Update failed", error);
            const detailedMessage = `Update Failed: ${error.message || 'Unknown Error'}`;

            setFeedbackMessage(prev => ({
                ...prev,
                [userId]: { message: detailedMessage, isError: true }
            }));
        }
    };
    
    //Placeholder handler for View action (will be replaced with navigation)
    const handleViewUser = (userId, userName) => {
        console.log(`[NAVIGATION PLACEHOLDER] Navigating to detail page for User ID: ${userId} (${userName})`);
        // use React Router here:
        // navigate(`admin/updateuser/${userId}`);
    };

    const ReloadListButton = () => {
        return (
            <button 
                onClick={loadUsers} 
                className="button-group reload-button"
                disabled={loading}
            >
                {loading ? 'Loading...' : 'Reload List'}
            </button>
        );
    };

    // RENDER STATES 
if (loading && users.length === 0) {
        return (
            <div className="loading-container">
                <p>Loading User Data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="info-box error-box">
                <h2>Data Fetch Error</h2>
                <p>{error}</p>
                <p>Check your API status and network connection.</p>
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="info-box empty-box">
                <p>No users found in the directory.</p>
                <ReloadListButton />
            </div>
        );
    }
    // MAIN TABLE RENDER
    return (
        <div className="user-table-container">
            <div className="table-header-controls">
                <h1>User Directory</h1>
                <ReloadListButton />
            </div>
            
            <table className="user-table">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} scope="col">
                                {col.header}
                            </th>
                        ))}
                        <th className="action-col">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {editedUsers.map((user, index) => { 
                        const feedback = feedbackMessage[user._id];
                        const originalUser = users.find(u => u._id === user._id) || {};
                        const userHasChanges = hasChanges(originalUser, user);
                        
                        return (
                            <React.Fragment key={`user-${user._id || index}`}>
                                {/* Feedback Row */}
                                {feedback && (
                                    <tr className={`feedback-base ${feedback.isError ? 'feedback-error' : 'feedback-success'}`}>
                                        <td colSpan={columns.length + 1}>
                                            <div role="alert">
                                                {feedback.message}
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                <tr>
                                    {columns.map((col) => {
                                        const currentValue = user[col.fieldKey] || '';
                                        const isEditable = col.editable;

                                        return (
                                            <td key={col.key}>
                                                {isEditable ? (
                                                    //Radio buttons
                                                    col.inputType === 'radio' && col.fieldKey === 'role' ? (
                                                        <div className="role-radio-group-table">
                                                            {ROLES.map(roleOption => (
                                                                <label key={roleOption} className="role-radio-label-table">
                                                                    <input
                                                                        type="radio"
                                                                        name={`role-${user._id}`} 
                                                                        value={roleOption}
                                                                        checked={currentValue === roleOption}
                                                                        onChange={(e) => handleCellChange(user._id, col.fieldKey, e.target.value)}
                                                                        disabled={loading}
                                                                    />
                                                                    <span className="radio-custom-indicator-table"></span>
                                                                    <span className="radio-text">{roleOption}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        //editable inputs
                                                        <input
                                                            type={col.inputType || 'text'}
                                                            value={currentValue}
                                                            onChange={(e) => handleCellChange(user._id, col.fieldKey, e.target.value)}
                                                            className="editable-input" 
                                                            disabled={loading}
                                                        />
                                                    )
                                                ) : (
                                                    //Read-Only field
                                                    col.format ? col.format(currentValue) : currentValue
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="action-button-group-cell"> 
                                        <button
                                            className="button-group view-button"
                                            onClick={() => handleViewUser(user._id, user.name)}
                                            disabled={loading}
                                        >
                                            View
                                        </button>
                                        <button
                                            className={`button-group update-button ${userHasChanges ? 'has-changes' : ''}`}
                                            onClick={() => handleUpdate(user._id, user.name)}
                                            disabled={loading || !userHasChanges} 
                                        >
                                            Update
                                        </button>
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default UpdateUser