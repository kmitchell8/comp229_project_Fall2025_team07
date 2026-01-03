import React, { useState, useMemo, useEffect } from 'react';
// Following the MediaProvider pattern: importing Context from a separate file
import { UserContext } from './userContext.jsx';
import { useAuth } from '../authState/useAuth';
import { ROUTES } from '../../Api/routingConfig.js';
import userApi from '../../Api/userApi.jsx';

export const UserProvider = ({ children }) => {
    // userInfo and getToken come from your Auth logic
    const { userInfo, loading: authLoading, getToken, updateUserInfo, availableRoles, isAdmin } = useAuth();

    // Core States
    const [contactData, setContactData] = useState({
        name: '',
        username: 'N/A',
        email: '',
        altEmail: '',
        phone: '',
        dob: '',
        address: {
            street: '',          // Updated to schema name
            addressLineTwo: '',   // Updated to schema name
            city: '',
            province: '',        // Updated to schema name
            postalCode: '',
            Country: 'Canada'    // Updated to schema name (Capital C)
        },
        preferredContact: 'email',
        role: 'user'
    });

    // FIX: Moving managedUserId to state so the Provider can react to changes 
    // when the Admin clicks different users.
    const [selectedUserId, setSelectedUserId] = useState(null);

    const [originalData, setOriginalData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Added loading state to be consumed by Profile.jsx guard
    const [loading, setLoading] = useState(true);

    // Image Upload States - Mirroring CreateMedia logic for binary handling
    const [pendingAvatar, setPendingAvatar] = useState(null); // Holds the actual File object
    const [avatarPreview, setAvatarPreview] = useState(null); // Holds local blob URL for instant UI feedback

    // Cover Image Upload States
    const [pendingCover, setPendingCover] = useState(null);
    const [coverPreview, setCoverPreview] = useState(null);

    // State for dynamically loaded country and regional data from API
    const [countryData, setCountryData] = useState({
        countries: [],
        regionalOptions: {}
    });

    // Load User Data - Consolidated to handle both Fetching and Snapshotting
    useEffect(() => {
        const loadUserData = async () => {
            try {
                setLoading(true); // Ensure loading is true when starting

                // FIX: Use the selectedUserId (set by Profile.jsx) or fallback to logged-in user
                const targetId = selectedUserId || userInfo?._id;

                if (targetId) {
                    // Use .read to match your userApi.jsx
                    const data = await userApi.read(targetId, getToken);

                    if (data) {
                        // Normalize the data immediately for the form inputs
                        const normalizedData = {
                            ...data,
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
                                street: data.address?.street || '',
                                addressLineTwo: data.address?.addressLineTwo || '',
                                city: data.address?.city || '',
                                province: data.address?.province || '',
                                postalCode: data.address?.postalCode || '',
                                Country: data.address?.Country || 'Canada',
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
                console.error("Error loading user into Context:", err);
            } finally {
                setLoading(false); // End loading state
            }
        };

        // Only load if Auth has finished or if we have an explicit selectedUserId
        if (!authLoading || selectedUserId) {
            loadUserData();
        }
        // FIX: Dependency array now watches selectedUserId
    }, [selectedUserId, userInfo?._id, getToken, authLoading]);

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

    // Cleanup function to revoke the data URLs
    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            if (coverPreview) URL.revokeObjectURL(coverPreview);
        };
    }, [avatarPreview, coverPreview]);

    // Derived Logic: Determine if the person logged in is looking at their own profile
    const isOwnProfile = useMemo(() => {
        // If selectedUserId is null, we are viewing ourselves.
        // If it exists, it must match userInfo._id to be "own profile"
        return !selectedUserId || selectedUserId === userInfo?._id;
    }, [selectedUserId, userInfo?._id]);

    // Check for actual changes to enable/style the save button
    const hasChanges = useMemo(() => {
        if (!originalData) return false;
        const textChanged = JSON.stringify(contactData) !== JSON.stringify(originalData);
        return textChanged || !!pendingAvatar || !!pendingCover;
    }, [contactData, originalData, pendingAvatar, pendingCover]);

    // Local state for the "Activity" data - placeholder for library stats
    const userActivity = useMemo(() => ({
        libraryCard: contactData.role || 'Standard',
        mediaInventory: contactData.mediaInventory || [],
        ratings: contactData.ratings || []
    }), [contactData.role, contactData.mediaInventory, contactData.ratings]);

    // Reusable handler to support the flatter structure used in the Contact form
    const handleInputChange = (e, field, isAddress = false) => {
        const { value } = e.target;
        setContactData(prev => {
            if (isAddress) {
                const updatedAddress = { ...prev.address, [field]: value };
                // If the country changes, clear the state/province to avoid mismatched data
                if (field === 'Country') updatedAddress.province = '';
                return { ...prev, address: updatedAddress };
            }
            return { ...prev, [field]: value };
        });
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

    // Standard Error Handler for images
    const handleImgError = (e, type) => {
        const placeholder = type === 'cover' ? 'coverimage' : 'profileimage';
        const fallbackUrl = userApi.getImages(placeholder);
        if (e.target.src !== fallbackUrl) {
            e.target.onerror = null;
            e.target.src = fallbackUrl;
        }
    };

    // Logic to prepare the binary data for the API
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

    // Save Logic: Logic to handle the API update when 'Submit Changes' is clicked
    const submitUpdates = async () => {
        if (!hasChanges) { setIsEditing(false); return; }

        const isConfirmed = window.confirm("Are you sure you want to update this profile?");
        if (!isConfirmed) return;

        setIsSaving(true);
        try {
            // Always use the ID from contactData to ensure we edit the correct person
            const targetId = contactData._id;

            let finalAvatar = contactData.profileImage;
            let finalCover = contactData.coverImage;

            // Process Avatar Upload
            if (pendingAvatar) {
                const { payload, fullName } = prepareUpload(pendingAvatar, 'user', targetId);
                await userApi.uploadPictures(payload, getToken);
                finalAvatar = fullName;
            }

            // Process Cover Upload
            if (pendingCover) {
                const { payload, fullName } = prepareUpload(pendingCover, 'cover', targetId);
                await userApi.uploadPictures(payload, getToken);
                finalCover = fullName;
            }

            const finalUserData = {
                ...contactData,
                profileImage: finalAvatar,
                coverImage: finalCover
            };

            // Call the update method
            const updatedUser = await userApi.update(finalUserData, targetId, getToken);

            // Only update the Top-Right Admin Header if the Admin edited THEMSELVES
            if (isOwnProfile && updateUserInfo) {
                updateUserInfo(updatedUser);
            }

            // Update local snapshot so the "Save" button disables after success
            setOriginalData(JSON.parse(JSON.stringify(finalUserData)));
            setContactData(finalUserData);
            resetLocalStates();
        } catch (error) {
            console.error("Failed to update profile:", error);
            alert("Update failed. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // Resets UI states back to original data
    const resetLocalStates = () => {
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
    // Safe navigation to bypass the "Aggressive" UserProvider lock
    const handlePasswordResetRequest = () => {
        // Lower the gates in the UserProvider state first
        //setIsEditing(false);
        //!hasChanges;
        // Then navigate using the hash AccessView expects
        // setTimeout(() => {
            window.location.href = `./access.html#${ROUTES.RESET}`;
        //}, 10);
    };
    const value = {
        contactData, setContactData,
        originalData,
        isEditing, setIsEditing,
        isSaving,
        loading,
        pendingAvatar, setPendingAvatar,
        avatarPreview, setAvatarPreview,
        pendingCover, setPendingCover,
        coverPreview, setCoverPreview,
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
        availableRoles, isAdmin,
        setSelectedUserId,
        handlePasswordResetRequest
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};