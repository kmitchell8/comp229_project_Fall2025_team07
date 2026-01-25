import React, { useState, useMemo, useEffect } from 'react';
// Following the MediaProvider pattern: importing Context from a separate file
import { UserContext } from './userContext.jsx';
import { useAuth } from '../authState/useAuth';
import { ROUTES } from '../../Api/routingConfig.js';
import userApi from '../../Api/userApi.jsx';

export const UserProvider = ({ children }) => {
    // userInfo and getToken come from your Auth logic
    // Note: ensure userInfo in useAuth is the user object, and maybe you have a setUser setter?
    const { userInfo, loading: authLoading, getToken, availableRoles,
        hasAdminPrivileges, login, setUser,
        isAdmin, isLibraryAdmin, isBranchAdmin } = useAuth();

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
    const [selectedUserRole, setSelectedUserRole] = useState(null);
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

    // Helper: Normalize Date for HTML inputs
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
    };

    // Load User Data - Consolidated to handle both Fetching and Snapshotting
    useEffect(() => {
        let isMounted = true;

        const loadUserData = async () => {
            // Determine who we are looking at: an explicitly selected user (Admin view) or ourselves
            const targetId = selectedUserId || userInfo?._id;
            if (!targetId) return;

            setLoading(true);
            try {
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
                        dob: formatDateForInput(data.dob),
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

                    setUserData(normalizedData);
                    // Deep copy to ensure originalData stays pure for change detection
                    setOriginalData(JSON.parse(JSON.stringify(normalizedData)));
                    setIsEditing(false);
                }
            } catch (err) {
                console.error("Error loading user into Context:", err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (!authLoading) {
            loadUserData();
        }

        return () => { isMounted = false; };
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

    // Cleanup function to revoke the data URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            if (coverPreview) URL.revokeObjectURL(coverPreview);
        };
    }, [avatarPreview, coverPreview]);

    // Derived Logic: Determine if the person logged in is looking at their own profile
    const isOwnProfile = useMemo(() => {
        return !!userInfo?._id && (selectedUserId === userInfo._id || !selectedUserId);
    }, [selectedUserId, userInfo?._id]);



    const isSameTenant = useMemo(() => {
        if (!userInfo || !userData) return false;

        // Global Admins (isAdmin) have jurisdiction over everyone
        if (isAdmin) return true;

        const myLibraryId = userInfo.managementAccess?.libraryId;
        const targetLibraryId = userData.managementAccess?.libraryId;

        // Unaffiliated Check: If target has no library, any admin can manage them
        if (!targetLibraryId) return true;

        // Tenant Match: Otherwise, library IDs must match
        return myLibraryId === targetLibraryId;
    }, [userInfo, userData, isAdmin]);

    // Can this admin change this user's role?
    const canEditPermissions = useMemo(() => {
        // Helper to turn auth flags into a numeric rank for comparison
        const getRank = (user, flags = null) => {
            // If checking the Logged-in Admin (using flags from AuthProvider)
            if (flags) {
                if (flags.isAdmin) return 3;
                if (flags.isLibraryAdmin) return 2;
                if (flags.isBranchAdmin) return 1;
            }
            // If checking the Target User (using the userData.role string)
            if (user?.role === 'admin') return 3;
            if (user?.role === 'libraryAdmin') return 2;
            if (user?.role === 'branchAdmin') return 1;
            return 0; // Standard User
        };

        if (isOwnProfile) return false;
        if (!userInfo || !userData) return false;

        const myLevel = getRank(userInfo, { isAdmin, isLibraryAdmin, isBranchAdmin });
        const targetLevel = getRank(userData);

        // RULE: JURISDICTION BLOCK
        // System Admins (level 3) should not manage roles that are assigned to a specific Library hierarchy (level 2 or 1).
        // This forces Library Admins to be the ones managing their own staff.
        if (isAdmin && targetLevel >= 1 && targetLevel < 3) {
            return false;
        }

        // RULE: HIERARCHY PROTECTION
        // cannot edit someone of the same rank (prevents peer-conflicts) 
        // or a higher rank than yourself.
        const hasHierarchyAuthority = myLevel > targetLevel;

        // RULE: TENANT LOCK
        // Even if higher rank, you must belong to the same library 
        // (unless you are a global admin editing a standard user).
        const canAccessTenant = isAdmin ? true : isSameTenant;

        return hasHierarchyAuthority && canAccessTenant;
    }, [userInfo, userData, isOwnProfile, isSameTenant, isAdmin, isLibraryAdmin, isBranchAdmin]);


    // Check for actual changes to enable/style the save button
    const hasChanges = useMemo(() => {
        if (!originalData) return false;
        const textChanged = JSON.stringify(userData) !== JSON.stringify(originalData);
        return textChanged || !!pendingAvatar || !!pendingCover;
    }, [userData, originalData, pendingAvatar, pendingCover]);

    const userActivity = useMemo(() => ({
        libraryCard: userData.role || 'Standard',
        mediaInventory: userData.mediaInventory || [],
        ratings: userData.ratings || []
    }), [userData.role, userData.mediaInventory, userData.ratings]);

    const handleInputChange = (e, field, isAddress = false) => {
        const { value } = e.target;
        setUserData(prev => {
            if (isAddress) {
                const updatedAddress = { ...prev.address, [field]: value };
                // Reset province if country changes to avoid invalid combinations
                if (field === 'Country') updatedAddress.province = '';
                return { ...prev, address: updatedAddress };
            }
            return { ...prev, [field]: value };
        });
    };

    const onAvatarSelected = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            setPendingAvatar(file);
            setAvatarPreview(URL.createObjectURL(file));
            e.target.value = ''; // Reset input so same file can be re-selected
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

    const handleImgError = (e, type) => {
        const targetId = userData._id;
        const placeholder = type === 'cover' ? 'coverimage' : 'profileimage';
        const fallbackUrl = userApi.getImages(placeholder, targetId);
        if (e.target.src !== fallbackUrl) {
            e.target.onerror = null;
            e.target.src = fallbackUrl;
        }
    };

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

    const submitUpdates = async () => {
        if (!hasChanges) { setIsEditing(false); return; }

        const isConfirmed = window.confirm("Are you sure you want to update this profile?");
        if (!isConfirmed) return;

        setIsSaving(true);
        try {
            const targetId = userData._id;
            let finalAvatar = userData.profileImage;
            let finalCover = userData.coverImage;

            // Handle Image Uploads first if they exist
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

            const payload = {
                ...userData,
                profileImage: finalAvatar,
                coverImage: finalCover
            };

            const updatedUser = await userApi.update(payload, targetId, getToken);

            // CRITICAL: Only update Auth context if the user is editing THEMSELVES
            // Otherwise, an Admin updating a user would log themselves in as that user.
            if (isOwnProfile && setUser) {
                setUser(updatedUser);
            }

            // Sync states
            const syncData = { ...payload, dob: formatDateForInput(payload.dob) };
            setUserData(syncData);
            setOriginalData(JSON.parse(JSON.stringify(syncData)));

            // Clear pending states
            if (avatarPreview) URL.revokeObjectURL(avatarPreview);
            if (coverPreview) URL.revokeObjectURL(coverPreview);
            setPendingAvatar(null);
            setPendingCover(null);
            setAvatarPreview(null);
            setCoverPreview(null);

            setIsEditing(false);
            alert("Profile updated successfully!");
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
        canEditPermissions,
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
        selectedUserId, setSelectedUserId,
        selectedUserRole, setSelectedUserRole,
        handlePasswordResetRequest
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};