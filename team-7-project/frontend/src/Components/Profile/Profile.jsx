import React, { useRef, useEffect, useMemo } from 'react';
import { useUser } from '../StateProvider/userState/useUser.jsx';
import { useMedia } from '../StateProvider/mediaState/useMedia.jsx';
import { ROUTES } from '../Api/routingConfig.js';
import userApi from '../Api/userApi.jsx';
import './Profile.css';

export const Profile = ({ managedUserId = null }) => {
    // Consume the context provided by UserProvider
    const {
        contactData,
        isEditing,
        setIsEditing,
        isSaving,
        loading,
        avatarPreview,
        coverPreview,
        countryData,
        isOwnProfile,
        hasChanges,
        handleInputChange,
        submitUpdates,
        resetLocalStates,
        onAvatarSelected,
        onCoverSelected,
        handleImgError,
        userActivity,
        availableRoles,
        isAdmin,
        setSelectedUserId,
        handlePasswordResetRequest
    } = useUser();

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
        if (setSelectedUserId) {
            setSelectedUserId(managedUserId);
        }
        return () => {
            if (setSelectedUserId) setSelectedUserId(null);
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
    const profilePath = avatarPreview || userApi.getImages(contactData.profileImage || 'profileimage');
    const coverPath = coverPreview || userApi.getImages(contactData.coverImage || 'coverimage');

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
                                alt={contactData?.name}
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
                                </div>
                            )}
                        </div>
                        {/*Password Reset*/}
                        <div className="detail-entry">
                            <label>Security</label>
                            <button
                                //type="button"
                                className="media-back-btn security-reset-btn"
                                onClick={handlePasswordResetRequest}
                            >Reset Password</button>
                        </div>
                    </aside>

                    {/* RIGHT PANE: Identity & Metadata */}
                    <section className="media-info-pane">
                        <div className="media-title-area">
                            <h1>{contactData.username || 'Guest User'}</h1>
                            <span className="media-badge">{userActivity.libraryCard} Access</span>
                        </div>

                        <div className="media-details-grid">
                            {/* USERNAME: Only visible when editing to reduce redundancy */}
                            {isEditing && isOwnProfile && (
                                <div className="detail-entry">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        value={contactData.username}
                                        onChange={(e) => handleInputChange(e, 'username')}
                                        className="editable-input"
                                    />
                                </div>
                            )}
                            {/* User Name - Only editable if viewing OWN profile */}
                            {/* <div className="detail-entry">
                                <label>User Name</label>
                                {isEditing && isOwnProfile ? (
                                    <input
                                        type="text"
                                        value={contactData.username}
                                        onChange={(e) => handleInputChange(e, 'username')}
                                        className="editable-input"
                                    />
                                ) : (
                                    <p>{contactData.username}</p>
                                )}
                            </div>*/}

                            {/* Full Name - Only editable if viewing OWN profile */}
                            <div className="detail-entry">
                                <label>Full Name</label>
                                {isEditing && isOwnProfile ? (
                                    <input
                                        type="text"
                                        value={contactData.name}
                                        onChange={(e) => handleInputChange(e, 'name')}
                                        className="editable-input"
                                    />
                                ) : (
                                    <p>{contactData.name}</p>
                                )}
                            </div>

                            {/* PRIVACY WALL: Fields below are ONLY accessible to the Profile Owner  */}
                            {isOwnProfile && (
                                <>
                                    {/* Primary Email - Logic-based visibility */}
                                    {(isEditing || contactData.preferredContact === 'email') && (
                                        <div className="detail-entry">
                                            <label>Primary Email</label>
                                            {isEditing ? (
                                                <input
                                                    type="email"
                                                    value={contactData.email}
                                                    onChange={(e) => handleInputChange(e, 'email')}
                                                    className="editable-input"
                                                />
                                            ) : (
                                                <p>{contactData.email}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Secondary Email */}
                                    {(isEditing || contactData.preferredContact === 'altEmail') && (
                                        <div className="detail-entry">
                                            <label>Secondary Email</label>
                                            {isEditing ? (
                                                <input
                                                    type="email"
                                                    value={contactData.altEmail}
                                                    onChange={(e) => handleInputChange(e, 'altEmail')}
                                                    className="editable-input"
                                                />
                                            ) : (
                                                <p>{contactData.altEmail || "None Provided"}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Date of Birth */}
                                    <div className="detail-entry">
                                        <label>Date of Birth</label>
                                        {isEditing ? (
                                            <input
                                                type="date"
                                                value={contactData.dob}
                                                onChange={(e) => handleInputChange(e, 'dob')}
                                                className="editable-input"
                                            />
                                        ) : (
                                            <p>{contactData.dob || "Not Set"}</p>
                                        )}
                                    </div>

                                    {/* Phone Number */}
                                    {isEditing && (
                                        <div className="detail-entry">
                                            <label>Contact Phone</label>
                                            <input
                                                type="tel"
                                                value={contactData.phone}
                                                onChange={(e) => handleInputChange(e, 'phone')}
                                                className="editable-input"
                                                placeholder="555-555-5555"
                                            />
                                        </div>
                                    )}

                                    {/* FULL ADDRESS SECTION - Only for Owner */}
                                    {isEditing && (
                                        <>
                                            <div className="detail-entry full-width">
                                                <label>Street Address</label>
                                                <input
                                                    type="text"
                                                    value={contactData.address.streetAddress}
                                                    onChange={(e) => handleInputChange(e, 'streetAddress', true)}
                                                    className="editable-input"
                                                />
                                            </div>
                                            <div className="detail-entry">
                                                <label>Address Line 2</label>
                                                <input
                                                    type="text"
                                                    value={contactData.address.addressLine2}
                                                    onChange={(e) => handleInputChange(e, 'addressLine2', true)}
                                                    className="editable-input"
                                                />
                                            </div>
                                            <div className="detail-entry">
                                                <label>City</label>
                                                <input
                                                    type="text"
                                                    value={contactData.address.city}
                                                    onChange={(e) => handleInputChange(e, 'city', true)}
                                                    className="editable-input"
                                                />
                                            </div>
                                            <div className="detail-entry">
                                                <label>Country</label>
                                                <select
                                                    value={contactData.address.country}
                                                    onChange={(e) => handleInputChange(e, 'country', true)}
                                                    className="editable-input"
                                                >
                                                    {countryData.countries.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            <div className="detail-entry">
                                                <label>State / Province</label>
                                                {countryData.regionalOptions[contactData.address.country] ? (
                                                    <select
                                                        value={contactData.address.stateProvince}
                                                        onChange={(e) => handleInputChange(e, 'stateProvince', true)}
                                                        className="editable-input"
                                                    >
                                                        <option value="">Select...</option>
                                                        {countryData.regionalOptions[contactData.address.country].map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={contactData.address.stateProvince}
                                                        onChange={(e) => handleInputChange(e, 'stateProvince', true)}
                                                        className="editable-input"
                                                    />
                                                )}
                                            </div>
                                            <div className="detail-entry">
                                                <label>Postal / Zip Code</label>
                                                <input
                                                    type="text"
                                                    value={contactData.address.postalCode}
                                                    onChange={(e) => handleInputChange(e, 'postalCode', true)}
                                                    className="editable-input"
                                                />
                                            </div>

                                        </>
                                    )}
                                </>
                            )}

                            {/* ADMIN ROLE MANAGEMENT */}
                            {/* Strictly hidden from the user themselves. Only Admin can change roles for others. */}
                            {isAdmin && !isOwnProfile && isEditing && (
                                <div className="detail-entry full-width">
                                    <label>User Role (Administrative Access Only)</label>
                                    <div className="role-radio-group-table">
                                        {Array.isArray(availableRoles) && availableRoles.length > 0 ? (
                                            availableRoles.map(role => (
                                                <label key={role} className="role-radio-label-table" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
                                                    <input
                                                        type="radio"
                                                        name="user-role-profile"
                                                        value={role}
                                                        checked={contactData.role === role}
                                                        onChange={(e) => handleInputChange(e, 'role')}
                                                        style={{ width: 'auto', marginRight: '10px', opacity: 1, visibility: 'visible', position: 'relative' }}
                                                    />
                                                    <span className="radio-text">{role}</span>
                                                </label>
                                            ))
                                        ) : (
                                            <p>Loading roles from system...</p>
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
                        <p>Managing permissions for <strong>{contactData.username}</strong>. Personal contact details are restricted.</p>
                    </div>
                )}
                {/* DEBUG FOOTER */}
                <footer className="media-full-description debug-footer">
                    <h2>Debug Info</h2>
                    <div className="description-separator"></div>
                    <div className="text-content">
                        <p><strong>System Message:</strong> Profile Validation Mode.</p>
                        <p><strong>Role:</strong> {contactData.role || 'N/A'}</p>
                        <p><strong>Context:</strong> {ROUTES.ADMIN ? 'Admin Route' : 'User Route'}</p>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default Profile;