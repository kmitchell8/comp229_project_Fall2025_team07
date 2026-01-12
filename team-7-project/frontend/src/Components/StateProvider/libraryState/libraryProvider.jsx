import React, { useState, useEffect, useCallback } from 'react';
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
    const { getToken, user, loading: authLoading, tenantId } = useAuth();
    const [currentLibrary, setCurrentLibrary] = useState(null);
    const [branches, setBranches] = useState([]);
    //const [selectedBranchId, setSelectedBranchId] = useState('all');
    const [loading, setLoading] = useState(false);
    /*const [activeIds, setActiveIds] = useState({
        tenantId: null,
        branchId: null
    });*/

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

  const loadLibraryContext = useCallback(async () => {
        // Wait for Auth to finish its initial check
        if (authLoading) return;
        setLoading(true);

        try {
            if (tenantId) {
                // If the Auth context says we have a Library ID, fetch THAT specific library
                console.log("LibraryProvider: Fetching context for Tenant:", tenantId);
                const [libData, branchData] = await Promise.all([
                    libraryApi.read(tenantId, getToken),
                    libraryApi.listBranchesByLibrary(tenantId, getToken)
                ]);
                setCurrentLibrary(libData);
                setBranches(branchData);
            } else {
                // Public/Master fallback
                console.log("LibraryProvider: No Tenant ID, loading Master context");
                setCurrentLibrary({ name: "Master Library", _id: null, isMaster: true });
                const allBranches = await libraryApi.listAllBranches(getToken);
                setBranches(allBranches || []);
            }
        } catch (err) {
            console.error("LibraryProvider Error:", err);
            setCurrentLibrary({ name: "Error Loading Library", _id: null });
        } finally {
            setLoading(false);
        }
    }, [getToken, tenantId, authLoading]);

    useEffect(() => {
        loadLibraryContext();
    }, [loadLibraryContext]);

    useEffect(() => {
        loadLibraryContext();
        window.addEventListener('hashchange', loadLibraryContext);
        return () => window.removeEventListener('hashchange', loadLibraryContext);
    }, [loadLibraryContext, user]);

    const value = {
        currentLibrary,
        branches,
        tenantId,
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
        refreshLibrary: loadLibraryContext
    };

    return (
        <LibraryContext.Provider value={value}>
            {children}
        </LibraryContext.Provider>
    );
};