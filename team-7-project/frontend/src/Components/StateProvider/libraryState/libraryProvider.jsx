import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LibraryContext } from './libraryContext';
import libraryApi from '../../Api/libraryApi';
//import mediaApi from '../../Api/mediaApi';
import { useAuth } from '../authState/useAuth';
//import { getHash } from '../../Api/getPage';
import { ROUTES, ADMIN_SUB_VIEWS, LIBRARY_VIEWS } from '../../Api/routingConfig';


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
    const [currentBranch, setCurrentBranch] = useState([]);
    const [branchData, setBranchData] = useState({});
    const [branchesList, setBranchesList] = useState({});
    const [originalData, setOriginalData] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    //const [selectedBranchId, setSelectedBranchId] = useState('all');
    const [loading, setLoading] = useState(false);
    /*const [activeIds, setActiveIds] = useState({
        tenantId: null,
        branchId: null
    });*/
    // State for dynamically loaded country and regional data from API
    const [countryData, setCountryData] = useState({
        countries: [],
        regionalOptions: {}
    });
    // Cover Image Upload States
    const [pendingLibraryCover, setPendingLibraryCover] = useState(null); // Holds the actual File object
    const [libraryCoverPreview, setLibraryCoverPreview] = useState(null); // Holds local blob URL for instant UI feedback
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
        if (tenantId) {
            // Strict guard against the string "undefined" coming from Auth context
            const hasValidBranchId = branchId && 
                                     branchId !== 'undefined' && 
                                     branchId !== 'null' && 
                                     branchId.length > 5;

            console.log("LibraryProvider: Fetching context for Tenant:", tenantId, "BranchID:", branchId);

            const [libData, branchesListResult, branchInfo] = await Promise.all([
                libraryApi.read(tenantId, getToken),
                libraryApi.listBranchesByLibrary(tenantId, getToken),
                hasValidBranchId 
                    ? libraryApi.readBranch(tenantId, branchId, getToken) 
                    : Promise.resolve(null)
            ]);

            // 1. Set Primary Reference States
            setCurrentLibrary(libData);
            setBranches(branchesListResult); // For the sidebar/general lists
            setCurrentBranch(branchInfo);

            // 2. Initialize Editable Library State
            setLibraryData(libData);
            
            // 3. Handle Branch-Specific State Logic
            // We ALWAYS set branchesList to the array for your UpdateBranch table
            setBranchesList(branchesListResult || []);

            if (branchInfo) {
                // If we are looking at a specific branch (e.g., Update/Edit view)
                setBranchData(branchInfo);
            } else if (libData?.mainBranchId && branchesListResult?.length > 0) {
                // Fallback to Main Branch if no specific ID is provided
                const main = branchesListResult.find(b => b._id === libData.mainBranchId);
                setBranchData(main || {}); 
            } else {
                // Default to empty object to prevent "controlled/uncontrolled" input errors
                setBranchData({});
            }

            // 4. Create Snapshot for "Reset" functionality
            setOriginalData(JSON.parse(JSON.stringify({ 
                library: libData, 
                branch: branchInfo || (libData?.mainBranchId ? branchesListResult.find(b => b._id === libData.mainBranchId) : {}) 
            })));

        } else {
            // Master Admin / Public View
            console.log("LibraryProvider: No Tenant ID, loading Master context");
            setCurrentLibrary({ name: "Master Library", _id: null, isMaster: true });
            const allBranches = await libraryApi.listAllBranches(getToken);
            setBranches(allBranches || []);
            setBranchesList(allBranches || []);
        }
    } catch (err) {
        console.error("LibraryProvider Error:", err);
    } finally {
        setLoading(false);
    }
}, [getToken, tenantId, branchId, authLoading]);
    // Fetch country and regional data from API on component mount
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

    // Cleanup function to revoke the data URLs
    useEffect(() => {
        return () => {
            if (libraryCoverPreview) URL.revokeObjectURL(libraryCoverPreview);
            if (branchCoverPreview) URL.revokeObjectURL(branchCoverPreview);
        };
    }, [libraryCoverPreview, branchCoverPreview]);

    // Derived Logic: Determine if the person logged in is looking at their own profile
    const isLibraryProfile = useMemo(() => {
        return !tenantId || tenantId
    }, [tenantId]);

    const isBranchProfile = useMemo(() => {
        return !branchId || branchId
    }, [branchId]);

    // Check for actual changes to enable/style the save button
    const hasChanges = useMemo(() => {
        if (!originalData) return false;
        const libraryChanged = JSON.stringify(libraryData) !== JSON.stringify(originalData.library);
        const branchChanged = JSON.stringify(branchData) !== JSON.stringify(originalData.branch);

        return libraryChanged || branchChanged || !!pendingLibraryCover || !!pendingBranchCover;
    }, [originalData, pendingLibraryCover, pendingBranchCover, libraryData, branchData]);


useEffect(() => {
    // Only fetch if auth is finished and we have a user
    if (!authLoading && user) {
        loadLibraryData();
    }

    const handleHashChange = () => {
        loadLibraryData();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
    
    // Remove 'user' from dependencies if it causes re-runs on every auth refresh
}, [loadLibraryData, authLoading, user]);
    const handleInputChange = (e, field, isAddress = false, target = 'branch') => {
        const { value, type, checked } = e.target;
        // Handle both checkboxes (mainBranch) and text inputs
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

    // Handles the file selection from the hidden inputs
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

    // Standard Error Handler for images
    const handleImgError = (e, type) => {

        const placeholder = type === 'cover' ? 'branchcover' : 'librarycover';
        const fallbackUrl = libraryApi.getImages(placeholder, branchId, tenantId);
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
            let finalLibraryCover = libraryData.libraryCover;
            let finalBranchCover = branchData.branchCover;

            if (pendingLibraryCover) {
                const { payload, fullName } = prepareUpload(pendingLibraryCover, 'user', tenantId);
                await libraryApi.uploadPictures(payload, getToken);
                finalLibraryCover = fullName;
            }

            if (pendingBranchCover) {
                const { payload, fullName } = prepareUpload(pendingBranchCover, 'cover', branchId);
                await libraryApi.uploadPictures(payload, getToken);
                finalBranchCover = fullName;
            }

            const finalLibraryData = {
                ...libraryData,
                libraryImage: finalLibraryCover
            };

            const finalBranchData = {
                ...branchData,
                branchImage: finalBranchCover
            };

            // Execute Library Update only if isLibraryProfile is true
            if (isLibraryProfile && tenantId) {
                await libraryApi.update(finalLibraryData, tenantId, getToken);
            }

            // Execute Branch Update only if isBranchProfile is true
            if (isBranchProfile && tenantId && branchId && branchId !== 'all') {
                await libraryApi.updateBranch(tenantId, branchId, finalBranchData, getToken);
            }

            // Refresh data to sync any changes made by the Mongoose middleware
            await loadLibraryData();

            // Clear the file previews/pending objects
            if (libraryCoverPreview) URL.revokeObjectURL(libraryCoverPreview);
            if (branchCoverPreview) URL.revokeObjectURL(branchCoverPreview);
            setPendingLibraryCover(null);
            setPendingBranchCover(null);
            setLibraryCoverPreview(null);
            setBranchCoverPreview(null);
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
            branchId: 'all' // You can expand this logic later if needed
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