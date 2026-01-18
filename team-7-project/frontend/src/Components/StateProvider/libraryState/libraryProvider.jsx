import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LibraryContext } from './libraryContext';
import libraryApi from '../../Api/libraryApi';
import { useAuth } from '../authState/useAuth';
import { ROUTES } from '../../Api/routingConfig';

const ADDRESS_FIELDS = [
    { name: 'street', label: 'Street', type: 'text' },
    { name: 'addressLineTwo', label: 'Suite/Apt', type: 'text' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'province', label: 'Province/State', type: 'text' },
    { name: 'Country', label: 'Country', type: 'text' },
    { name: 'postalCode', label: 'Postal Code', type: 'text' }
];

export const LibraryProvider = ({ children }) => {
    const { getToken, user, loading: authLoading, tenantId, branchId } = useAuth();
    const [currentLibrary, setCurrentLibrary] = useState(null);
    const [branches, setBranches] = useState([]);
    const [libraryData, setLibraryData] = useState({});
    const [currentBranch, setCurrentBranch] = useState(null); // Changed to null as default
    const [branchData, setBranchData] = useState({});
    const [branchesList, setBranchesList] = useState([]);
    const [originalData, setOriginalData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(false);

    const [countryData, setCountryData] = useState({
        countries: [],
        regionalOptions: {}
    });

    const [pendingLibraryCover, setPendingLibraryCover] = useState(null);
    const [libraryCoverPreview, setLibraryCoverPreview] = useState(null);
    const [pendingBranchCover, setPendingBranchCover] = useState(null);
    const [branchCoverPreview, setBranchCoverPreview] = useState(null);

    const DETAILS = {
        BRANCH: {
            topLevel: [
                { name: 'name', label: 'Branch Name', type: 'text', required: true },
                { name: 'mainBranch', label: 'Set as Main Branch', type: 'checkbox' }
            ],
            address: ADDRESS_FIELDS
        },
        LIBRARY: {
            topLevel: [
                { name: 'name', label: 'Library System Name', type: 'text', required: true },
                { name: 'contactEmail', label: 'Admin Email', type: 'email', required: false }
            ],
            address: ADDRESS_FIELDS
        }
    };

   const loadLibraryData = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);

    try {
        const validBranchId = (branchId && !['all', 'null', 'undefined'].includes(String(branchId))) ? branchId : null;
        
        let branchInfo = null;

        // 1. Fetch Branch first (can now handle tenantId being null)
        if (validBranchId) {
            // This call will now hit /api/library/branch/:id if tenantId is null
            branchInfo = await libraryApi.readBranch(tenantId, validBranchId, getToken);
            setCurrentBranch(branchInfo);
            setBranchData(branchInfo || {});
        }

        // 2. Identify the Library ID from the branch we just fetched
        const effectiveTenantId = (tenantId && tenantId !== 'null') ? tenantId : branchInfo?.libraryId;

        // 3. Fetch Library details only if we now have a valid ID
        if (effectiveTenantId && effectiveTenantId !== 'undefined') {
            const [libData, branchesListResult] = await Promise.all([
                libraryApi.read(effectiveTenantId, getToken),
                libraryApi.listBranchesByLibrary(effectiveTenantId, getToken),
            ]);

            setCurrentLibrary(libData);
            setLibraryData(libData);
            setBranches(branchesListResult || []);
            setBranchesList(branchesListResult || []);
            
            // Keep comments: Change tracking sync
            setOriginalData(JSON.parse(JSON.stringify({
                library: libData,
                branch: branchInfo || {}
            })));
        }
    } catch (err) {
        console.error("LibraryProvider Error:", err);
    } finally {
        setLoading(false);
    }
}, [getToken, tenantId, branchId, authLoading]);

    useEffect(() => {
        const fetchLocationData = async () => {
            try {
                const data = await libraryApi.getCountries();
                setCountryData(data);
            } catch (error) {
                console.error("Failed to load country data:", error);
            }
        };
        fetchLocationData();
    }, []);

    useEffect(() => {
        return () => {
            if (libraryCoverPreview) URL.revokeObjectURL(libraryCoverPreview);
            if (branchCoverPreview) URL.revokeObjectURL(branchCoverPreview);
        };
    }, [libraryCoverPreview, branchCoverPreview]);

    const isLibraryProfile = useMemo(() => !tenantId || !!tenantId, [tenantId]);
    const isBranchProfile = useMemo(() => !branchId || !!branchId, [branchId]);

    const hasChanges = useMemo(() => {
        if (!originalData) return false;
        const libraryChanged = JSON.stringify(libraryData) !== JSON.stringify(originalData.library);
        const branchChanged = JSON.stringify(branchData) !== JSON.stringify(originalData.branch);
        return libraryChanged || branchChanged || !!pendingLibraryCover || !!pendingBranchCover;
    }, [originalData, pendingLibraryCover, pendingBranchCover, libraryData, branchData]);

    useEffect(() => {
        if (!authLoading && user) {
            loadLibraryData();
        }
        const handleHashChange = () => loadLibraryData();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [loadLibraryData, authLoading, user]);

    const handleInputChange = (e, field, isAddress = false, target = 'branch') => {
        const { value, type, checked } = e.target;
        const actualValue = type === 'checkbox' ? checked : value;

        const getUpdatedObject = (prevState) => {
            if (isAddress) {
                const updatedAddress = { ...prevState.address, [field]: actualValue };
                if (field === 'Country') updatedAddress.province = '';
                return { ...prevState, address: updatedAddress };
            }
            return { ...prevState, [field]: actualValue };
        };

        if (target === 'library') {
            setLibraryData(prev => getUpdatedObject(prev));
        } else {
            setBranchData(prev => getUpdatedObject(prev));
        }
    };

    const onLibraryCoverSelected = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (libraryCoverPreview) URL.revokeObjectURL(libraryCoverPreview);
            setPendingLibraryCover(file);
            setLibraryCoverPreview(URL.createObjectURL(file));
            e.target.value = '';
        }
    };

    const onBranchCoverSelected = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (branchCoverPreview) URL.revokeObjectURL(branchCoverPreview);
            setPendingBranchCover(file);
            setBranchCoverPreview(URL.createObjectURL(file));
            e.target.value = '';
        }
    };

    const handleImgError = (e, type) => {
        const placeholder = type === 'cover' ? 'branchcover' : 'librarycover';
        const fallbackUrl = libraryApi.getImages(placeholder, branchId, tenantId);
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
            payload: { _id: targetId, file, fileName, extension },
            fullName: `${fileName}${extension}`
        };
    };

    const submitUpdates = async () => {
        if (!hasChanges) { setIsEditing(false); return; }
        const isConfirmed = window.confirm("Are you sure you want to update this profile?");
        if (!isConfirmed) return;

        setIsSaving(true);
        try {
            let finalLibraryCover = libraryData.libraryCover;
            let finalBranchCover = branchData.branchCover;

            if (pendingLibraryCover) {
                const { payload, fullName } = prepareUpload(pendingLibraryCover, 'library', tenantId);
                await libraryApi.uploadPictures(payload, getToken);
                finalLibraryCover = fullName;
            }

            if (pendingBranchCover) {
                const { payload, fullName } = prepareUpload(pendingBranchCover, 'branch', branchId);
                await libraryApi.uploadPictures(payload, getToken);
                finalBranchCover = fullName;
            }

            if (isLibraryProfile && tenantId) {
                await libraryApi.update({ ...libraryData, libraryImage: finalLibraryCover }, tenantId, getToken);
            }

            if (isBranchProfile && tenantId && branchId && branchId !== 'all') {
                await libraryApi.updateBranch(tenantId, branchId, { ...branchData, branchImage: finalBranchCover }, getToken);
            }

            await loadLibraryData();
            resetLocalStates();
        } catch (error) {
            console.error("Failed to update profile:", error);
            alert("Update failed. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const resetLocalStates = () => {
        setIsEditing(false);
        if (libraryCoverPreview) URL.revokeObjectURL(libraryCoverPreview);
        if (branchCoverPreview) URL.revokeObjectURL(branchCoverPreview);
        setPendingLibraryCover(null);
        setLibraryCoverPreview(null);
        setPendingBranchCover(null);
        setBranchCoverPreview(null);
        if (originalData) {
            setLibraryData(JSON.parse(JSON.stringify(originalData.library)));
            setBranchData(JSON.parse(JSON.stringify(originalData.branch)));
        }
    };

    const value = {
        libraryData, setLibraryData,
        branchData, setBranchData,
        branchesList, setBranchesList,
        isEditing, setIsEditing,
        submitUpdates,
        resetLocalStates,
        handleImgError,
        onBranchCoverSelected,
        onLibraryCoverSelected,
        handleInputChange,
        isSaving,
        countryData,
        currentLibrary,
        branches,
        currentBranch,
        tenantId,
        branchId,
        loading,
        activeIds: {
            tenantId: tenantId || currentLibrary?._id || null,
            branchId: branchId || currentBranch?._id || 'all'
        },
        libraryDetails: DETAILS,
        getBranchName: (id) => {
            if (id === 'all') return "All Branches";
            return branches.find(b => b._id === id)?.name || "Unknown Branch";
        },
        refreshLibrary: loadLibraryData
    };

    return (
        <LibraryContext.Provider value={value}>
            {children}
        </LibraryContext.Provider>
    );
};