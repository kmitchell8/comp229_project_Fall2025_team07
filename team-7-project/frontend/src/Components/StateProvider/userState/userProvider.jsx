import React, { useState, useMemo, useEffect } from 'react';
// Following the MediaProvider pattern: importing Context from a separate file
import { UserContext } from './userContext.jsx';
import { useAuth } from '../authState/useAuth';
import { ROUTES } from '../../Api/routingConfig.js';
import userApi from '../../Api/userApi.jsx';

export const UserProvider = ({ children }) => {
    // userInfo and getToken come from your Auth logic
    const { userInfo, loading: authLoading, getToken, availableRoles, hasAdminPrivileges, login } = useAuth();

    // Core States
    const [userData, setUserData] = useState({
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


    // Moving managedUserId to state so the Provider can react to changes 
    // when the Admin clicks different users in UpdateUser.
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

        let isMounted = true; // Prevents state updates on unmounted components

        const loadUserData = async () => {
            const targetId = selectedUserId || userInfo?._id;
            if (!targetId) return;

            // MediaProvider Pattern: We set loading to true which the UI uses to 
            // unmount/hide the old data before the new data arrives.
            setLoading(true);
            try {
                if (targetId) {
                    // Use .read to match userApi.jsx
                    const data = await userApi.read(targetId, getToken);

                    if (data && isMounted) {
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
                            _id: data._id,
                            managementAccess: data.managementAccess || { libraryId: null, branchId: null }
                        };

                        // Update both states at once to keep them in sync
                        setUserData(normalizedData);
                        setOriginalData(JSON.parse(JSON.stringify(normalizedData)));
                        setIsEditing(false); // Reset editing mode automatically on data switch
                    }
                }
            } catch (err) {
                console.error("Error loading user into Context:", err);
            } finally {
                if (isMounted) setLoading(false); // End loading state
            }
        };

        // Only load if Auth has finished or if we have an explicit selectedUserId
        if (!authLoading || selectedUserId) {
            loadUserData();
        }
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
        return !selectedUserId || selectedUserId === userInfo?._id;
    }, [selectedUserId, userInfo?._id]);

    // Check for actual changes to enable/style the save button
    const hasChanges = useMemo(() => {
        if (!originalData) return false;
        const textChanged = JSON.stringify(userData) !== JSON.stringify(originalData);
        return textChanged || !!pendingAvatar || !!pendingCover;
    }, [userData, originalData, pendingAvatar, pendingCover]);

    // Local state for the "Activity" data - placeholder for library stats
    const userActivity = useMemo(() => ({
        libraryCard: userData.role || 'Standard',
        mediaInventory: userData.mediaInventory || [],
        ratings: userData.ratings || []
    }), [userData.role, userData.mediaInventory, userData.ratings]);

    // Reusable handler to support the flatter structure used in the Contact form
    const handleInputChange = (e, field, isAddress = false) => {
        const { value } = e.target;
        setUserData(prev => {
            if (isAddress) {
                const updatedAddress = { ...prev.address, [field]: value };
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
            e.target.value = '';
        }
    };

    const onCoverSelected = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (coverPreview) URL.revokeObjectURL(coverPreview);
            setPendingCover(file);
            setCoverPreview(URL.createObjectURL(file));
            e.target.value = '';
        }
    };

    // Standard Error Handler for images
    const handleImgError = (e, type) => {
        const targetId = userData._id;
        const placeholder = type === 'cover' ? 'coverimage' : 'profileimage';
        const fallbackUrl = userApi.getImages(placeholder, targetId);
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

    // Save Logic: Logic to handle the API update when 'Submit Changes' is clicked // 

    //logic is questionable ==future troubleshooting
    const submitUpdates = async () => {
        if (!hasChanges) { setIsEditing(false); return; }

        const isConfirmed = window.confirm("Are you sure you want to update this profile?");
        if (!isConfirmed) return;

        setIsSaving(true);
        try {
            const targetId = userData._id;

            let finalAvatar = userData.profileImage;
            let finalCover = userData.coverImage;

            if (pendingAvatar) {
                const { payload, fullName } = prepareUpload(pendingAvatar, 'user', targetId);
                await userApi.uploadPictures(payload, getToken);
                finalAvatar = fullName;
            }

            if (pendingCover) {
                const { payload, fullName } = prepareUpload(pendingCover, 'cover', targetId);
                await userApi.uploadPictures(payload, getToken);
                finalCover = fullName;
            }

            const finalUserData = {
                ...userData,
                profileImage: finalAvatar,
                coverImage: finalCover
            };

            const updatedUser = await userApi.update(finalUserData, targetId, getToken);

            if (isOwnProfile && userInfo) {
                userInfo(updatedUser);
            }

            setOriginalData(JSON.parse(JSON.stringify(finalUserData)));
            setUserData(finalUserData);
            // resetLocalStates();

            // Clear the file previews/pending objects
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            if (coverPreview) URL.revokeObjectURL(coverPreview);
            setPendingAvatar(null);
            setPendingCover(null);
            setAvatarPreview(null);
            setCoverPreview(null);
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update profile:", error);
            alert("Update failed. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const resetLocalStates = () => {
        setIsEditing(false);
        if (avatarPreview) URL.revokeObjectURL(avatarPreview);
        if (coverPreview) URL.revokeObjectURL(coverPreview);
        setPendingAvatar(null);
        setAvatarPreview(null);
        setPendingCover(null);
        setCoverPreview(null);
        if (originalData) {
            setUserData(JSON.parse(JSON.stringify(originalData)));
        }
    };

    const handlePasswordResetRequest = () => {
        window.location.href = `./access.html#${ROUTES.RESET}`;
    };

    const value = {
        login,
        userInfo,
        userData, setUserData,
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
        availableRoles,
        hasAdminPrivileges,
        selectedUserId, setSelectedUserId, // Explicitly exposed for UpdateUser list
        handlePasswordResetRequest
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};