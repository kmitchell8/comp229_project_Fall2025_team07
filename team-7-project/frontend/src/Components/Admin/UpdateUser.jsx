import React, { useState, useEffect, useCallback, useMemo } from 'react';
import userApi from '../Api/userApi';
import { useAuth } from '../StateProvider/authState/useAuth'; // Authentication context
import { useUser } from '../StateProvider/userState/useUser'; // Import the Context
import { useLibrary } from '../StateProvider/libraryState/useLibrary';
import Profile from '../Profile/Profile'; // Ensure this is imported
import './Admin.css';

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

// Memoized Row Component aligned with MediaRow style
const UserRow = React.memo(({
    user,
    columns,
    feedback,
    hasChanges,
    onCellChange,
    onView,
    onUpdate,
    onRevert,
    canChangeRole,
    currentUserId,
    loading,
    availableRoles, // Passed down from main component
    availableBranches // New prop from LibraryProvider
}) => {
    return (
        <tbody className="user-row-group">
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
                                //Radio buttons for Role
                                col.inputType === 'radio' && col.fieldKey === 'role' ? (
                                    <div className="role-management-container">
                                        <div className="role-radio-group-table">
                                            {availableRoles.map(roleOption => (
                                                <label key={roleOption} className="role-radio-label-table">
                                                    <input
                                                        type="radio"
                                                        name={`role-${user._id}`}
                                                        value={roleOption}
                                                        checked={currentValue === roleOption}
                                                        onChange={(e) => onCellChange(user._id, col.fieldKey, e.target.value)}
                                                        // Logic: Admins can't change their own role to prevent lockout
                                                        disabled={loading || !canChangeRole || user._id === currentUserId}
                                                    />
                                                    <span className="radio-custom-indicator-table"></span>
                                                    <span className="radio-text">{roleOption}</span>
                                                </label>
                                            ))}
                                        </div>

                                        {/* BRANCH SELECTOR: Only visible if the selected role is branchAdmin */}
                                        {user.role === 'branchAdmin' && availableBranches?.length > 0 && (
                                            <div className="branch-selector-wrapper" style={{ marginTop: '8px' }}>
                                                <select
                                                    className="branch-dropdown"
                                                    value={user.branchId || ''}
                                                    onChange={(e) => onCellChange(user._id, 'branchId', e.target.value)}
                                                    disabled={loading || !canChangeRole}
                                                >
                                                    <option value="">-- Assign Branch --</option>
                                                    {availableBranches.map(branch => (
                                                        <option key={branch._id} value={branch._id}>
                                                            {branch.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    // Editable text inputs for Name/Email
                                    <input
                                        type={col.inputType || 'text'}
                                        value={currentValue}
                                        onChange={(e) => onCellChange(user._id, col.fieldKey, e.target.value)}
                                        className="editable-input"
                                        disabled={loading}
                                    />
                                )
                            ) : (
                                //Read-Only fields (like Date)
                                col.format ? col.format(currentValue) : currentValue
                            )}
                        </td>
                    );
                })}
                <td className="action-button-group-cell">
                    <button
                        className="button-group view-button"
                        onClick={() => onView(user._id)}
                        disabled={loading}
                    >
                        View
                    </button>
                    <button
                        className={`button-group update-button ${hasChanges ? 'has-changes' : ''}`}
                        onClick={() => onUpdate(user._id, user.name)}
                        disabled={loading || !hasChanges}
                    >
                        Update
                    </button>
                    <button
                        className="button-group revert-button"
                        onClick={() => onRevert(user._id)}
                        disabled={!hasChanges || loading}
                        title="Discard unsaved changes"
                    >
                        ↺
                    </button>
                </td>
            </tr>
        </tbody>
    );
});

const UpdateUser = ({ pathId }/*{parentSegment}*/) => { //pass the _id path to be able to create an Id subview

    // Use Context to access UserProvider states and actions
    const {
        setSelectedUserId,
        availableRoles: providerRoles,
        resetSelectedUser
    } = useUser();

    const { role: userRole, getToken, userInfo } = useAuth();
    const { branches: availableBranches } = useLibrary();

    // Logic: Favor roles from Provider, fallback to Auth, fallback to empty array
    const rolesToUse = useMemo(() => {
        const flatRoles = Object.values(providerRoles || {}).flat();

        if (userRole === 'admin') {
            // Admin only sees high-level 'admin' and 'user'
            return flatRoles.filter(r => r === 'admin' || r === 'user');
        }
        if (userRole === 'libraryAdmin') {
            // Library Admin only sees 'branchAdmin' and 'user'
            return flatRoles.filter(r => r === 'branchAdmin' || r === 'user');
        }
        return [];

    }, [providerRoles, userRole]);

    const [feedbackMessage, setFeedbackMessage] = useState({});
    const [users, setUsers] = useState([]); // Original Source of Truth
    const [editedUsers, setEditedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setErr] = useState(null);

    // New: Search Filter State
    const [searchEmail, setSearchEmail] = useState('');

    const currentUserId = userInfo ? userInfo._id : null;

    // Refined Guard: Admin or LibraryAdmin can edit roles (within the filtered constraints of rolesToUse)
    const canChangeRole = userRole === 'admin' || userRole === 'libraryAdmin';

    const columns = [
        { header: 'Name', key: 'name', fieldKey: 'name', editable: true, inputType: 'text' },
        { header: 'Email', key: 'email', fieldKey: 'email', editable: true, inputType: 'email' },
        { header: 'Role', key: 'role', fieldKey: 'role', editable: true, inputType: 'radio' },
        { header: 'Created On', key: 'created', fieldKey: 'created', editable: false, format: formatDate },
    ];

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
        setEditedUsers(prevUsers => prevUsers.map(user => {
            if (user._id === userId) {
                const updatedUser = { ...user, [key]: value };

                // If role is changed away from branchAdmin, clear the branchId
                if (key === 'role' && value !== 'branchAdmin') {
                    updatedUser.branchId = null;
                }

                return updatedUser;
            }
            return user;
        }));
        setErr(null);
    }, []);

    const handleRevertRow = useCallback((userId) => {
        const originalUser = users.find(u => u._id === userId);
        if (!originalUser) return;

        setEditedUsers(prevUsers =>
            prevUsers.map(u => u._id === userId ? JSON.parse(JSON.stringify(originalUser)) : u)
        );

        setFeedbackMessage(prev => {
            const newFeedback = { ...prev };
            delete newFeedback[userId];
            return newFeedback;
        });
    }, [users]);

    const hasChanges = (originalUser, editedUser) => {
        const updatableKeys = ['name', 'email', 'role', 'branchId'];
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

        const isConfirmed = window.confirm(
            `Are you sure you want to update user: ${userName}? \n\nThis will save the detected changes (including any role changes).`
        );

        if (!isConfirmed) {
            setFeedbackMessage(prev => ({
                ...prev,
                [userId]: { message: `Update for ${userName} cancelled by admin.`, isError: false }
            }));
            return;
        }

        // Send the editedUser directly as it contains the updated keys (including branchId if set)
        const updateData = {
            name: editedUser.name,
            email: editedUser.email,
            role: editedUser.role,
            branchId: editedUser.branchId
        };

        try {
            await userApi.update(updateData, userId, getToken);
            setUsers(prevUsers => prevUsers.map(u => u._id === userId ? { ...editedUser } : u));
            setFeedbackMessage(prev => ({
                ...prev,
                [userId]: { message: `User ${userName} updated successfully!`, isError: false }
            }));
        } catch (error) {
            console.error("Update failed", error);
            setFeedbackMessage(prev => ({
                ...prev,
                [userId]: { message: `Update Failed: ${error.message || 'Unknown Error'}`, isError: true }
            }));
        }
    };

    const handleViewUser = (userId) => {
        // Prime the UserProvider with the ID before navigating
        setSelectedUserId(userId);
        window.location.hash = `admin/updateuser/${userId}`;
    };

    // Filter Logic: Filters the edited list based on email input
    const filteredUsers = useMemo(() => {
        if (!searchEmail) return editedUsers;
        return editedUsers.filter(u => 
            u.email?.toLowerCase().includes(searchEmail.toLowerCase())
        );
    }, [editedUsers, searchEmail]);

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

    if (pathId) {
        return (
            <div className="admin-subview-container">
                <div className="admin-subview-header">
                    <button
                        onClick={() => {
                            resetSelectedUser(); // Clear Provider state when returning to list
                            window.location.hash = 'admin/updateuser';
                        }}
                        className="media-back-btn"
                    >
                        ← Back to User Directory
                    </button>
                </div>
                {/* Profile.jsx consumes context, so it will automatically 
                    react to the selectedUserId we set in handleViewUser 
                */}
                <Profile managedUserId={pathId} />
            </div>
        );
    }

    return (
        <div className="user-table-container">
            <div className="table-header-controls">
                {/* RETURN TO ADMIN BUTTON 
                <button onClick={() => window.location.hash = 'admin'} className="admin-nav-btn">
                    Return to Admin
                </button>*/}
                <h1>User Directory</h1>
                <div className="admin-actions-bar">
                    <input 
                        type="text" 
                        placeholder="Search by email..." 
                        className="user-search-input"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                    />
                    <button
                        onClick={loadUsers}
                        className="button-group reload-button"
                        disabled={loading}
                    >
                        {loading ? 'Loading...' : 'Reload List'}
                    </button>
                </div>
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
                {filteredUsers.map((user, index) => {
                    const originalUser = users.find(u => u._id === user._id) || {};
                    return (
                        <UserRow
                            key={user._id || index}
                            user={user}
                            columns={columns}
                            feedback={feedbackMessage[user._id]}
                            hasChanges={hasChanges(originalUser, user)}
                            onCellChange={handleCellChange}
                            onView={handleViewUser}
                            onUpdate={handleUpdate}
                            onRevert={handleRevertRow}
                            canChangeRole={canChangeRole}
                            currentUserId={currentUserId}
                            loading={loading}
                            availableRoles={rolesToUse}
                            availableBranches={availableBranches}
                        />
                    );
                })}
            </table>
            {filteredUsers.length === 0 && (
                <div className="no-results-msg">No users found matching your search.</div>
            )}
        </div>
    );
};

export default UpdateUser;