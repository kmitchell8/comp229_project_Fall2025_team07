import React, { useState, useMemo, useEffect, useRef } from 'react';
//import { useNavigate } from 'react-router-dom'; // Added for navigation
import { useAuth } from '../StateProvider/authState/useAuth.jsx';
import { ROUTES } from '../Api/routingConfig.js';
import userApi from '../Api/userApi.jsx';
import './Profile.css';

export const Profile = ({ managedUserId = null }) => {

    // Standard React Router hook for navigation
    //const navigate = useNavigate();
    // Accessing core identity and account status
    // getToken and isAdmin are essential for the API and conditional UI logic
    const { userInfo, loading, availableRoles, isAdmin, getToken, updateUserInfo } = useAuth();
    //Reference state to hold original data for reversion logic
    const [originalData, setOriginalData] = useState(null);

    // Local state to toggle between "Display" and "Edit" modes
    const [isEditing, setIsEditing] = useState(false);

    // Track saving state to prevent double-submissions during API calls
    const [isSaving, setIsSaving] = useState(false);

    // Image Upload States - Mirroring CreateMedia logic for binary handling
    const [pendingAvatar, setPendingAvatar] = useState(null); // Holds the actual File object
    const [avatarPreview, setAvatarPreview] = useState(null); // Holds local blob URL for instant UI feedback

    // Cover Image Upload States
    const [pendingCover, setPendingCover] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);

    // References to trigger hidden file inputs via the image clicks
    const avatarInputRef = useRef(null);
    const coverInputRef = useRef(null);

    // Logic to determine if user is on the admin route (e.g., #admin/user/ID)
    //const isAdminView = window.location.hash.includes(ROUTES.ADMIN);

    // State for dynamically loaded country and regional data from API
    const [countryData, setCountryData] = useState({
        countries: [],
        regionalOptions: {}
    });

    // Local state for the "Activity" data - placeholder for library stats
    const [userActivity] = useState({
        mediaInventory: [],
        ratings: [],
        libraryCard: 'Standard'
    });

    // Form state - Initialized with empty defaults to avoid 'undefined' errors during first render
    const [contactData, setContactData] = useState({
        name: '',
        username: 'N/A',
        email: '',
        altEmail: '',
        phone: '',
        dob: '',
        address: {
            streetAddress: '',
            addressLine2: '',
            city: '',
            stateProvince: '',
            postalCode: '',
            country: 'Canada',
        },
        preferredContact: 'email',
        role: 'user'
    });

    // Load User
    //Form state synchronisation
    // Load User - Consolidated to handle both Fetching and Snapshotting
    useEffect(() => {
        const loadUserData = async () => {
            try {
                // Determine if we are an Admin looking at someone else or a user looking at ourselves
                const targetId = managedUserId || userInfo?._id;

                if (targetId) {
                    // Use .read to match your userApi.jsx
                    const data = await userApi.read(targetId, getToken);

                    if (data) {
                        // Normalize the data immediately for the form inputs
                        const normalizedData = {
                            name: data.name || '',
                            username: data.username || 'N/A',
                            email: data.email || '',
                            altEmail: data.altEmail || '',
                            phone: data.phone || '',
                            // Ensure date is formatted for <input type="date">
                            dob: data.dob && typeof data.dob === 'string'
                                ? data.dob.split('T')[0]
                                : '',
                            address: {
                                streetAddress: data.address?.streetAddress || '',
                                addressLine2: data.address?.addressLine2 || '',
                                city: data.address?.city || '',
                                stateProvince: data.address?.stateProvince || '',
                                postalCode: data.address?.postalCode || '',
                                country: data.address?.country || 'Canada',
                            },
                            preferredContact: data.preferredContact || 'email',
                            role: data.role || 'user',
                            _id: data._id
                        };

                        // Update both states at once to keep them in sync
                        setContactData(normalizedData);
                        setOriginalData(JSON.parse(JSON.stringify(normalizedData)));
                    }
                }
            } catch (err) {
                console.error("Error loading profile:", err);
            }
        };

        // Only load if Auth has finished or if we have an explicit managedUserId
        if (!loading || managedUserId) {
            loadUserData();
        }
        // We only depend on the IDs and the Token, NOT the state we are setting
    }, [managedUserId, userInfo?._id, getToken, loading]);


    // Determine if the person logged in is looking at their own profile
    const isOwnProfile = useMemo(() => {
        const targetId = managedUserId || userInfo?._id;
        return targetId === userInfo?._id;
    }, [managedUserId, userInfo?._id]);
    // Logic for Profile Image
    // Logic for Profile Image
    const profilePath = useMemo(() => {
        if (avatarPreview) return avatarPreview;

        // Use contactData (the loaded user) instead of userInfo (the admin)
        const imageIdentifier = contactData?.profileImage || 'profileimage';

        // Use contactData._id for the path construction
        return userApi.getImages(imageIdentifier, contactData?._id);
    }, [contactData, avatarPreview]); // Update dependency to contactData

    // Logic for Cover Image
    const coverPath = useMemo(() => {
        if (coverPreview) return coverPreview;

        // Use contactData (the loaded user)
        const imageIdentifier = contactData?.coverImage || 'coverimage';

        return userApi.getImages(imageIdentifier, contactData?._id);
    }, [contactData, coverPreview]); // Update dependency to contactData


    const handleImgError = (e, fallbackType) => {
        // Determine which placeholder to ask the API for
        const placeholder = fallbackType === 'cover' ? 'coverimage' : 'profileimage';

        // Get the temporary image URL from your API logic
        const fallbackUrl = userApi.getImages(placeholder);

        if (e.target.src !== fallbackUrl) {
            e.target.onerror = null; // Prevents infinite loop if placeholder is also missing
            e.target.src = fallbackUrl;
        }
    };

    // Fetch country and regional data from API on component mount
    useEffect(() => {
        const fetchLocationData = async () => {
            try {
                const data = await userApi.getCountries();
                setCountryData(data);
            } catch (error) {
                console.error("Failed to load country data:", error);
            }
        };
        fetchLocationData();
    }, []);



    useEffect(() => {
        // Cleanup function to revoke the data URLs
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            if (coverPreview) URL.revokeObjectURL(coverPreview);
        };
    }, [avatarPreview, coverPreview]);

    // Check for actual changes to enable/style the save button
    const hasChanges = useMemo(() => {
        if (!originalData) return false;
        const textChanged = JSON.stringify(contactData) !== JSON.stringify(originalData);
        const imagesChanged = !!pendingAvatar || !!pendingCover;
        return textChanged || imagesChanged;
    }, [contactData, originalData, pendingAvatar, pendingCover]);

    // Reusable reset logic to return form to original Auth state
    const resetForm = () => {
        setIsEditing(false);
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setPendingAvatar(null);
        setAvatarPreview(null);
        setPendingCover(null);
        setCoverPreview(null);
        if (originalData) {
            setContactData(JSON.parse(JSON.stringify(originalData)));
        }
    };

    // Triggered when clicking on the avatar or cover while in Edit mode
    const handleAvatarClick = (e) => {
        if (isEditing) {
            e.preventDefault();
            e.stopPropagation();
            if (avatarInputRef.current) avatarInputRef.current.click();
        }
    };

    const handleCoverClick = (e) => {
        if (isEditing) {
            e.preventDefault();
            e.stopPropagation();
            if (coverInputRef.current) coverInputRef.current.click();
        }
    };

    // Handles the file selection from the hidden inputs
    const onAvatarSelected = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            setPendingAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
            e.target.value = ''; // Reset input to allow re-selection of same file
        }
    };

    const onCoverSelected = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (coverPreview) URL.revokeObjectURL(coverPreview);
            setPendingCover(file);
            setCoverPreview(URL.createObjectURL(file));
            e.target.value = ''; // Reset input to allow re-selection of same file
        }
    };

    // Logic to handle the API update when 'Submit Changes' is clicked
    const prepareUpload = (file, prefix, targetId) => {
        const lastDot = file.name.lastIndexOf('.');
        const extension = file.name.substring(lastDot);
        const fileName = `${prefix}_${Date.now()}`;

        return {
            payload: {
                _id: targetId,
                file: file,
                fileName: fileName,
                extension: extension
            },
            fullName: `${fileName}${extension}`
        };
    };
    const handleUpdateSubmit = async () => {
        if (!hasChanges) {
            setIsEditing(false);
            return;
        }

        const isConfirmed = window.confirm("Are you sure you want to update this profile?");
        if (!isConfirmed) return;

        setIsSaving(true);
        try {
            // Always use the ID from contactData to ensure we edit the correct person
            const targetId = contactData._id;

            let finalAvatarFileName = contactData.profileImage;
            let finalCoverFileName = contactData.coverImage;

            // Process Avatar Upload
            if (pendingAvatar) {
                const { payload, fullName } = prepareUpload(pendingAvatar, ROUTES.PROFILE, targetId);
                await userApi.uploadPictures(payload, getToken);
                finalAvatarFileName = fullName;
            }

            // Process Cover Upload
            if (pendingCover) {
                const { payload, fullName } = prepareUpload(pendingCover, 'cover', targetId);
                await userApi.uploadPictures(payload, getToken);
                finalCoverFileName = fullName;
            }

            const finalProfileData = {
                ...contactData,
                profileImage: finalAvatarFileName,
                coverImage: finalCoverFileName
            };

            // Call the update method
            const updatedUser = await userApi.update(finalProfileData, targetId, getToken);

            // Only update the Top-Right Admin Header if the Admin edited THEMSELVES
            if (targetId === userInfo?._id && updateUserInfo) {
                updateUserInfo(updatedUser);
            }

            // Update local snapshot so the "Save" button disables after success
            setOriginalData(JSON.parse(JSON.stringify(finalProfileData)));
            setContactData(finalProfileData);

            setIsEditing(false);
            setPendingAvatar(null);
            setAvatarPreview(null);
            setPendingCover(null);
            setCoverPreview(null);
        } catch (error) {
            console.error("Failed to update profile:", error);
            alert("Update failed. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // handler to support the flatter structure used in the Contact form
    // supports nested 'address' updates and business logic for regional clearing
    const handleInputChange = (e, field, isAddress = false) => {
        const { value } = e.target;

        setContactData(prev => {
            if (isAddress) {
                const updatedAddress = { ...prev.address, [field]: value };

                // If the country changes, clear the state/province to avoid mismatched data
                if (field === 'country') {
                    updatedAddress.stateProvince = '';
                }

                return { ...prev, address: updatedAddress };
            }
            return { ...prev, [field]: value };
        });
    };

    if (loading) return null;

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
                    </aside>
                    {/* RIGHT PANE: Identity & Metadata */}
                    <section className="media-info-pane">
                        <div className="media-title-area">
                            <h1>{contactData.username || 'Guest User'}</h1>
                            <span className="media-badge">{userActivity.libraryCard} Access</span>
                        </div>

                        <div className="media-details-grid">

                            {/* User Name - Only editable if viewing OWN profile */}
                            <div className="detail-entry">
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
                            </div>

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
                                            <div className="detail-entry">
                                                <label>Security</label>
                                                <button className="media-back-btn security-reset-btn">Request Password Reset</button>
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
                            <div className="library-stats-container">
                                <div className="detail-entry">
                                    <label>Inventory Size</label>
                                    <p>{userActivity.mediaInventory.length} Items</p>
                                </div>
                                <div className="detail-entry">
                                    <label>Active Rentals</label>
                                    <p>0 Items</p>
                                </div>
                            </div>

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