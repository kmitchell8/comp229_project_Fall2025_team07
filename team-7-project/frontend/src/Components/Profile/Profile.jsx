import React, { useRef, useEffect, useMemo } from 'react';
import { useUser } from '../StateProvider/userState/useUser.jsx';
//import { useAuth } from '../StateProvider/authState/useAuth.jsx';
import { useMedia } from '../StateProvider/mediaState/useMedia.jsx';
import { useAuth } from '../StateProvider/authState/useAuth'; // Added for role filtering logic
import { useLibrary } from '../StateProvider/libraryState/useLibrary'; // Added for branch selection
import { ROUTES } from '../Api/routingConfig.js';
import userApi from '../Api/userApi.jsx';
import './Profile.css';

/**
 * CONFIGURATION: Single Source of Truth for Address Fields
 * To handle schema changes, simply update the 'id' to match your Mongoose model.
 */
const ADDRESS_FIELD_CONFIG = [
    { id: 'street', label: 'Street Address', fullWidth: true },
    { id: 'addressLineTwo', label: 'Address Line 2', fullWidth: false },
    { id: 'city', label: 'City', fullWidth: false },
    // Country and Province are handled separately due to their <select> logic
    { id: 'postalCode', label: 'Postal / Zip Code', fullWidth: false },
];

export const Profile = ({ managedUserId = null }) => {
    // Consume the context provided by UserProvider
    const {
        userData,
        isEditing,
        setIsEditing,
        isSaving,
        loading,
        avatarPreview,
        coverPreview,
        countryData,
        isOwnProfile,
        canEditPermissions,
        hasChanges,
        handleInputChange,
        submitUpdates,
        resetLocalStates,
        onAvatarSelected,
        onCoverSelected,
        handleImgError,
        userActivity,
        availableRoles: providerRoles,
        hasAdminPrivileges,
        setSelectedUserId,
        handlePasswordResetRequest
    } = useUser();

    // Use Auth and Library context for specialized management logic
    const { role: currentUserRole } = useAuth();
    const { branches: availableBranches } = useLibrary();

    // Logic: Filter available roles based on the logged-in administrator's rank
    const rolesToUse = useMemo(() => {
        if (!providerRoles) return [];
        const flatRoles = Object.values(providerRoles).flat();

        if (currentUserRole === 'admin') {
            return flatRoles.filter(r => r === 'admin' || r === 'user');
        }
        if (currentUserRole === 'libraryAdmin') {
            return flatRoles.filter(r => r === 'branchAdmin' || r === 'user');
        }
        return flatRoles; // Fallback
    }, [providerRoles, currentUserRole]);

    // Consume MediaContext
    const {
        media,
        shelfData,
        loading: mediaLoading
    } = useMedia();

    // Filter global media to only what this user owns
    const userOwnedItems = useMemo(() => {
        if (!userActivity?.mediaInventory || !media) return [];
        // Assuming mediaInventory is an array of IDs
        return media.filter(item => userActivity.mediaInventory.includes(item._id));
    }, [media, userActivity.mediaInventory]);

    // Get top genres for this specific user //this logic is necessary later for algorithmic based rendering
    const topGenres = useMemo(() => {
        const counts = userOwnedItems.reduce((acc, item) => {
            const g = item.genre || "Other";
            acc[g] = (acc[g] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2); // Get top 2 genres
    }, [userOwnedItems]);

    //  Use effect to tell the Context which ID to load. 
    // This is the specific logic switch needed to stop it from defaulting to the Admin's own profile.
    useEffect(() => {
        if (managedUserId && setSelectedUserId) {
            setSelectedUserId(managedUserId);
        }
        return () => {
            if (setSelectedUserId && !managedUserId) setSelectedUserId(null);
        };
    }, [managedUserId, setSelectedUserId]);

    // Refs for hidden file inputs
    const avatarInputRef = useRef(null);
    const coverInputRef = useRef(null);

    // Guard: Show loading state if data is still being fetched
    if (loading) {
        return <div className="loading-container">Loading Profile...</div>;
    }

    // Logic for image paths: Priority is Preview (Blob) > Database Image > Default Placeholder
    const profilePath = avatarPreview || userApi.getImages(userData.profileImage || 'profileimage');
    const coverPath = coverPreview || userApi.getImages(userData.coverImage || 'coverimage');

    // Click handlers for the frames
    const handleAvatarClick = () => {
        if (isEditing) avatarInputRef.current.click();
    };

    const handleCoverClick = () => {
        if (isEditing) coverInputRef.current.click();
    };

    // Form submission wrapper
    const handleUpdateSubmit = async () => {
        await submitUpdates();
    };

    // Reset wrapper
    const resetForm = () => {
        resetLocalStates();
    };
    
    const onRevert = () => {
        resetLocalStates();
        setIsEditing(true);
    };

    // Interceptor for Role Changes to handle branchId cleanup
    const onRoleChange = (e) => {
        const newRole = e.target.value;
        handleInputChange(e, 'role');
        
        // If switching AWAY from branchAdmin, clear the branch association
        if (newRole !== 'branchAdmin' && userData.branchId) {
            handleInputChange({ target: { value: null } }, 'branchId');
        }
    };

    return (
        <div className={`media ${isSaving ? 'processing-blur' : ''}`}>
            {/* Hidden Inputs for Picture Uploading */}
            <input type="file" ref={avatarInputRef} style={{ display: 'none' }} accept="image/*" onChange={onAvatarSelected} />
            <input type="file" ref={coverInputRef} style={{ display: 'none' }} accept="image/*" onChange={onCoverSelected} />

            <main className="media-type">
                <div className="media-split-container">

                    {/* LEFT PANE: Visuals (Cover & Avatar) */}
                    <aside className="media-visual-pane">
                        <div
                            className={`media-cover-frame ${isEditing ? 'clickable-edit' : ''}`}
                            onClick={handleCoverClick}
                        >
                            <img
                                src={coverPath}
                                alt="Cover"
                                onError={(e) => handleImgError(e, 'cover')}
                            />
                            {isEditing && <div className="edit-hint-overlay">Change Cover</div>}
                        </div>

                        {/* Avatar container with conditional class for cursor feedback and edit hint */}
                        <div
                            className={`profile-avatar-overlay ${isEditing ? 'clickable-edit' : ''}`}
                            onClick={handleAvatarClick}
                        >
                            <img
                                src={profilePath}
                                alt={userData?.name}
                                className="avatar-img"
                                onError={(e) => handleImgError(e, 'avatar')}
                            />
                            {isEditing && <div className="edit-hint-overlay">Change Photo</div>}
                        </div>

                        {/* Grouped Action Bar for UX consistency */}

                        <div className="media-action-bar">
                            {!isEditing ? (
                               <button className="media-back-btn" onClick={() => setIsEditing(true)}>
                                    Edit Profile
                                </button>
                            ) : (
                                <div className="edit-actions-group">
                                    <button
                                        className="media-back-btn cancel-btn"
                                        onClick={resetForm}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={`admin-edit-toggle save-btn ${hasChanges ? 'has-changes' : ''}`}
                                        onClick={handleUpdateSubmit}
                                        disabled={isSaving || !hasChanges}
                                    >
                                        {isSaving ? 'Saving...' : 'Submit Changes'}
                                    </button>
                                    <button
                                        className="button-group revert-btn"
                                        onClick={onRevert}
                                        disabled={!hasChanges || loading}
                                        title="Discard unsaved changes"
                                    >
                                        ↺
                                    </button>
                                </div>
                            )}
                        </div>
                        {/*Password Reset*/}
                        {isOwnProfile && (<div className="detail-entry">
                            <label>Security</label>
                            <button
                                className="media-back-btn security-reset-btn"
                                onClick={handlePasswordResetRequest}
                            >Reset Password</button>
                        </div>)}
                    </aside>

                    {/* RIGHT PANE: Identity & Metadata */}
                    <section className="media-info-pane">
                        <div className="media-title-area">
                            <h1>{userData.username || 'Guest User'}</h1>
                            <span className="media-badge">{userActivity.libraryCard} Access</span>
                        </div>

                        <div className="media-details-grid">
                            {/* USERNAME: Only visible when editing to reduce redundancy */}
                            {isEditing && isOwnProfile && (
                                <div className="detail-entry">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        value={userData.username}
                                        onChange={(e) => handleInputChange(e, 'username')}
                                        className="editable-input"
                                    />
                                </div>
                            )}

                            {/* Full Name - Only editable if viewing OWN profile */}
                            <div className="detail-entry">
                                <label>Full Name</label>
                                {isEditing && isOwnProfile ? (
                                    <input
                                        type="text"
                                        value={userData.name}
                                        onChange={(e) => handleInputChange(e, 'name')}
                                        className="editable-input"
                                    />
                                ) : (
                                    <p>{userData.name}</p>
                                )}
                            </div>

                            {/* PRIVACY WALL: Fields below are ONLY accessible to the Profile Owner  */}
                            {isOwnProfile && (
                                <>
                                    {/* Primary Email - Logic-based visibility */}
                                    {(isEditing || userData.preferredContact === 'email') && (
                                        <div className="detail-entry">
                                            <label>Primary Email</label>
                                            {isEditing ? (
                                                <input
                                                    type="email"
                                                    value={userData.email}
                                                    onChange={(e) => handleInputChange(e, 'email')}
                                                    className="editable-input"
                                                />
                                            ) : (
                                                <p>{userData.email}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Secondary Email */}
                                    {(isEditing || userData.preferredContact === 'altEmail') && (
                                        <div className="detail-entry">
                                            <label>Secondary Email</label>
                                            {isEditing ? (
                                                <input
                                                    type="email"
                                                    value={userData.altEmail}
                                                    onChange={(e) => handleInputChange(e, 'altEmail')}
                                                    className="editable-input"
                                                />
                                            ) : (
                                                <p>{userData.altEmail || "None Provided"}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Date of Birth */}
                                    <div className="detail-entry">
                                        <label>Date of Birth</label>
                                        {isEditing ? (
                                            <input
                                                type="date"
                                                value={userData.dob}
                                                onChange={(e) => handleInputChange(e, 'dob')}
                                                className="editable-input"
                                            />
                                        ) : (
                                            <p>{userData.dob || "Not Set"}</p>
                                        )}
                                    </div>

                                    {/* Phone Number */}
                                    {isEditing && (
                                        <div className="detail-entry">
                                            <label>Contact Phone</label>
                                            <input
                                                type="tel"
                                                value={userData.phone}
                                                onChange={(e) => handleInputChange(e, 'phone')}
                                                className="editable-input"
                                                placeholder="555-555-5555"
                                            />
                                        </div>
                                    )}

                                    {/* FULL ADDRESS SECTION - Only for Owner */}
                                    {isEditing && (
                                        <>
                                            {/* Dynamically generated address fields for schema-agnostic maintenance */}
                                            {ADDRESS_FIELD_CONFIG.map((field) => (
                                                <div key={field.id} className={`detail-entry ${field.fullWidth ? 'full-width' : ''}`}>
                                                    <label>{field.label}</label>
                                                    <input
                                                        type="text"
                                                        value={userData.address[field.id] || ''}
                                                        onChange={(e) => handleInputChange(e, field.id, true)}
                                                        className="editable-input"
                                                    />
                                                </div>
                                            ))}

                                            {/* Logic-based Address fields (Selects) */}
                                            <div className="detail-entry">
                                                <label>Country</label>
                                                <select
                                                    value={userData.address.Country}
                                                    onChange={(e) => handleInputChange(e, 'Country', true)}
                                                    className="editable-input"
                                                >
                                                    {countryData.countries.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="detail-entry">
                                                <label>State / Province</label>
                                                {countryData.regionalOptions[userData.address.Country] ? (
                                                    <select
                                                        value={userData.address.province}
                                                        onChange={(e) => handleInputChange(e, 'province', true)}
                                                        className="editable-input"
                                                    >
                                                        <option value="">Select...</option>
                                                        {countryData.regionalOptions[userData.address.Country].map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={userData.address.province}
                                                        onChange={(e) => handleInputChange(e, 'province', true)}
                                                        className="editable-input"
                                                    />
                                                )}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {/* ADMIN ROLE MANAGEMENT */}
                            {/* Strictly hidden from the user themselves. Only Admin can change roles for others. */}
                            {hasAdminPrivileges && !isOwnProfile && isEditing && (
                                <div className="detail-entry full-width">
                                    <label>User Role & Branch Assignment</label>
                                    <div className="role-management-container">
                                        <div className="role-radio-group-table" style={{ marginBottom: '15px' }}>
                                            {Array.isArray(rolesToUse) && rolesToUse.length > 0 ? (
                                              canEditPermissions && rolesToUse.map(role => (
                                                    <label key={role} className="role-radio-label-table" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                                                        <input
                                                            type="radio"
                                                            name="user-role-profile"
                                                            value={role}
                                                            checked={userData.role === role}
                                                            onChange={onRoleChange}
                                                            style={{ width: 'auto', marginRight: '10px', opacity: 1, visibility: 'visible', position: 'relative' }}
                                                        />
                                                        <span className="radio-text">{role.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim()}</span>
                                                    </label>
                                                ))
                                            ) : (
                                                <p>Loading roles from system...</p>
                                            )}
                                        </div>

                                        {/* BRANCH SELECTOR: Consistent with UpdateUser.jsx logic */}
                                        {userData.role === 'branchAdmin' && availableBranches?.length > 0 && (
                                            <div className="branch-selector-wrapper detail-entry full-width">
                                                <label>Assigned Branch</label>
                                                <select
                                                    className="editable-input"
                                                    value={userData.branchId || ''}
                                                    onChange={(e) => handleInputChange(e, 'branchId')}
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
                                </div>
                            )}
                        </div>

                        {/* LIBRARY SUMMARY SECTION */}
                        <div className="media-full-description">
                            <h2>Personal Library Summary</h2>
                            <div className="description-separator"></div>

                            {mediaLoading ? (
                                <p className="loading-text">Analyzing library data...</p>
                            ) : (
                                <div className="library-stats-container">
                                    <div className="detail-entry">
                                        <label>Inventory Size</label>
                                        <p><strong>{userOwnedItems.length}</strong> Items Total</p>
                                    </div>

                                    <div className="detail-entry">
                                        <label>Primary Interests</label>
                                        <p>
                                            {topGenres.length > 0
                                                ? topGenres.map(([name]) => name).join(' & ')
                                                : "No Data Yet"}
                                        </p>
                                    </div>

                                    <div className="detail-entry">
                                        <label>Active Rentals</label>
                                        <p>0 Items</p>
                                    </div>

                                    {/* Optional: Show a small "Diversity" stat based on shelf names */}
                                    <div className="detail-entry">
                                        <label>Collection Span</label>
                                        <p>{shelfData.sortedNames.length} Categories</p>
                                    </div>
                                </div>
                            )}

                            {!isEditing && (
                                <button
                                    onClick={() => window.location.href = "/library"}
                                    className="confirm-save-btn library-open-btn">
                                    Open Full Library
                                </button>
                            )}
                        </div>
                    </section>
                </div>
                {!isOwnProfile && isEditing && (
                    <div className="admin-notice">
                        <p>Managing permissions for <strong>{userData.username}</strong>. Personal contact details are restricted.</p>
                    </div>
                )}
                {/* DEBUG FOOTER */}
                <footer className="media-full-description debug-footer">
                    <h2>Debug Info</h2>
                    <div className="description-separator"></div>
                    <div className="text-content">
                        <p><strong>System Message:</strong> Profile Validation Mode.</p>
                        <p><strong>Role:</strong> {userData.role || 'N/A'}</p>
                        <p><strong>Context:</strong> {ROUTES.ADMIN ? 'Admin Route' : 'User Route'}</p>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default Profile;