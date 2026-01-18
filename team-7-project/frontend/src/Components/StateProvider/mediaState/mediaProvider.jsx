import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MediaContext } from './mediaContext.jsx';
import { useLibrary } from '../libraryState/useLibrary.jsx';
import mediaApi from '../../Api/mediaApi';

export const MediaProvider = ({ children }) => {
    const { currentLibrary, branchId } = useLibrary();

    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mediaTypeConfigs, setMediaTypeConfigs] = useState({});
    const [genres, setGenres] = useState([]); 
    const [configStrings, setConfigStrings] = useState({ ignoredSuffixes: [], ignoredPrefixes: [] });
    const [mediaTypes, setMediaTypes] = useState([]);

    // UI Filter State
    const [viewMode, setViewMode] = useState('genre');
    const [sortBy, setSortBy] = useState('title');
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState('all');

    const loadGlobalConfigs = useCallback(async () => {
        try {
            const [typeConfigs, genreList, prefixSuffixData] = await Promise.all([
                mediaApi.getConfigDoc('mediaTypes'),
                mediaApi.getConfigDoc('genres'),
                mediaApi.getConfigDoc('prefixSuffix')
            ]);

            setMediaTypeConfigs(typeConfigs || {});
            setMediaTypes(Object.keys(typeConfigs || {}));
            setGenres(Array.isArray(genreList) ? genreList : []);
            if (prefixSuffixData) setConfigStrings(prefixSuffixData);
        } catch (error) {
            console.error('Error fetching global configurations:', error);
        }
    }, []);

    const loadData = useCallback(async () => {
        const libraryId = currentLibrary?._id || null;
        setLoading(true);
        try {
            const mediaData = await mediaApi.list(libraryId, branchId);
            setMedia(Array.isArray(mediaData) ? mediaData : []);
        } catch (error) {
            console.error('Error fetching media list:', error);
            setMedia([]);
        } finally {
            setLoading(false);
        }
    }, [currentLibrary, branchId]);

    // MOVED FROM MEDIA.JSX: Fetches full single-item details and the associated .txt description
    const fetchFullDetails = useCallback(async (mediaId) => {
        if (!mediaId) return null;
        const data = await mediaApi.read(mediaId);
        let text = data.description ? await mediaApi.getDescriptionText(data.description) : "";
        
        // Return structured data for the local component state
        return {
            media: { ...data, _originalDescriptionText: text },
            description: text
        };
    }, []);

    // PRESERVED LOGIC: Centralized formatting/mapping for Dynamic Changes
    const formatValueForField = useCallback((value, inputType) => {
        if (inputType === 'list' || inputType === 'array') {
            return (typeof value === 'string' && value.trim() === '')
                ? []
                : (typeof value === 'string' ? value.split(',').map(v => v.trim()) : value);
        }
        if (inputType === 'number' || inputType === 'integer') {
            return value === '' ? 0 : Number(value);
        }
        if (inputType === 'checkbox' || inputType === 'boolean') {
            return Boolean(value);
        }
        return value;
    }, []);

    // MOVED FROM MEDIA.JSX: Extracts creator info based on dynamic config
    const getCreatorInfo = useCallback((item) => {
        if (!item) return { label: "", value: "" };
        const config = mediaTypeConfigs[item.mediaType];
        const field = config?.find(f => f.name.startsWith('creator'));
        if (!field) return { label: "", value: "" };
        const key = field.name.split('.')[1] || field.name;
        const label = field.label.split('.')[1] || field.label;
        return { label: label.charAt(0).toUpperCase() + label.slice(1), value: item[key] || "" };
    }, [mediaTypeConfigs]);
  // State Comparison Logic 
  /*const hasChanges = () => {
    if (!media || !editData) return false;

    // Check if the description text has changed
    // compare current 'description' state vs what we initially loaded
    // Note: 'media.description' is just the filename, so check against the 
    // text stored during fetchFullDetails (might want a 'originalDescription' state for 100% accuracy)
    // For now, compare against the text content.
    const descChanged = description !== (media._originalDescriptionText || "");
    if (descChanged) return true;

    // Check dynamic fields
    const currentConfig = mediaTypeConfigs[media.mediaType] || [];
    const keysToCheck = [
      'title',
      'genre',
      ...currentConfig.map(f => f.name.includes('.') ? f.name.split('.')[1] : f.name)
    ];

    return keysToCheck.some(key => {
      const orig = media[key];
      const edit = editData[key];
      if (Array.isArray(orig) || Array.isArray(edit)) {
        return JSON.stringify(orig || []) !== JSON.stringify(edit || []);
      }
      return String(orig ?? '') !== String(edit ?? '');
    });
  };
*/
const handleRevert = useCallback((media) => {
    if (!media) return null;
    return {
        // Returns a fresh deep copy of the original data
        editData: JSON.parse(JSON.stringify(media)),
        // Returns the original description text we stored earlier
        description: media._originalDescriptionText || ""
    };
}, []);

  const handleCancel = () => { handleRevert();  };
    // MOVED FROM MEDIA.JSX: Centralized dirty-checking
    const checkHasChanges = useCallback((media, editData, description) => {
        if (!media || !editData) return false;
        if (description !== (media._originalDescriptionText || "")) return true;
        const currentConfig = mediaTypeConfigs[media.mediaType] || [];
        const keys = ['title', 'genre', ...currentConfig.map(f => f.name.includes('.') ? f.name.split('.')[1] : f.name)];
        return keys.some(key => JSON.stringify(media[key] || "") !== JSON.stringify(editData[key] || ""));
    }, [mediaTypeConfigs]);

    // MOVED FROM MEDIA.JSX: Centralized update logic
    const handleSave = useCallback(async (media, editData, description, getToken) => {
        const config = mediaTypeConfigs[media.mediaType] || [];
        const allowed = ['title', 'genre', ...config.map(f => f.name.includes('.') ? f.name.split('.')[1] : f.name)];
        const payload = allowed.reduce((acc, k) => { if (editData[k] !== undefined) acc[k] = editData[k]; return acc; }, {});
        payload.descriptionText = description;

        await mediaApi.update(payload, media._id, getToken);
        await loadData(); // Refresh the provider's list state
    }, [mediaTypeConfigs, loadData]);

    useEffect(() => { loadGlobalConfigs(); }, [loadGlobalConfigs]);
    useEffect(() => { loadData(); }, [loadData]);

    const getSortLabel = useCallback(() => {
        if (filterType === 'all' || !mediaTypeConfigs[filterType]) return "Creator";
        const config = mediaTypeConfigs[filterType];
        const creatorField = config.find(f => f.name.startsWith('creator'));
        if (creatorField?.label) {
            const labelParts = creatorField.label.split('.');
            const cleanLabel = labelParts.length > 1 ? labelParts[1] : labelParts[0];
            return cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
        }
        return "Creator";
    }, [filterType, mediaTypeConfigs]);

    const shelfData = useMemo(() => {
        const currentMedia = Array.isArray(media) ? media : [];

        const getCreatorKey = (item) => {
            const config = mediaTypeConfigs[item.mediaType];
            const fieldObj = config?.find(f => f.name.startsWith('creator'));
            if (!fieldObj || !fieldObj.name) return null;
            const nameParts = fieldObj.name.split('.');
            return nameParts.length > 1 ? nameParts[1] : nameParts[0];
        };

        const getLastName = (fullName) => {
            if (!fullName) return "";
            const suffixes = (configStrings.ignoredSuffixes || []).map(s => s.toLowerCase());
            const parts = fullName.trim().split(/\s+/);
            if (parts.length <= 1) return parts[0].toLowerCase();
            let lastIndex = parts.length - 1;
            if (suffixes.includes(parts[lastIndex].toLowerCase()) && parts.length > 1) lastIndex--;
            return parts[lastIndex].toLowerCase();
        };

        const filteredMedia = currentMedia.filter(item => {
            const title = (item.title || "").toLowerCase();
            const creatorKey = getCreatorKey(item);
            const creatorValue = (creatorKey && item[creatorKey] ? item[creatorKey] : "").toLowerCase();
            const matchesSearch = title.includes(searchTerm.toLowerCase()) || creatorValue.includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'all' || item.mediaType === filterType;
            return matchesSearch && matchesType;
        });

        const grouped = filteredMedia.reduce((acc, item) => {
            let key;
            if (viewMode === 'genre') {
                key = item.genre || "Other";
            } else {
                let sortValue = (item[sortBy] || item.title || "#").toString().trim();
                if (sortBy === 'author') {
                    const creatorKey = getCreatorKey(item);
                    if (creatorKey && item[creatorKey]) sortValue = getLastName(item[creatorKey]);
                }
                key = sortValue.charAt(0).toUpperCase();
                if (!/[A-Z]/.test(key)) key = "#";
            }
            if (!acc[key]) acc[key] = [];
            acc[key].push({ ...item, id: item._id });
            return acc;
        }, {});

        const ignorePrefixes = (configStrings.ignoredPrefixes || []).map(p => p.toLowerCase());
        const stripPrefix = (str) => {
            if (!str) return "";
            const parts = str.trim().split(/\s+/);
            if (parts.length > 1 && ignorePrefixes.includes(parts[0].toLowerCase())) return parts.slice(1).join(' ');
            return str;
        };

        Object.keys(grouped).forEach(shelf => {
            grouped[shelf].sort((a, b) => {
                if (sortBy === 'author') {
                    const keyA = getCreatorKey(a);
                    const keyB = getCreatorKey(b);
                    const valA = keyA ? a[keyA] : "";
                    const valB = keyB ? b[keyB] : "";
                    const lastA = getLastName(valA);
                    const lastB = getLastName(valB);
                    if (lastA === lastB) return (valA || "").localeCompare(valB || "");
                    return lastA.localeCompare(lastB);
                }
                const titleA = stripPrefix(a.title || '').toLowerCase();
                const titleB = stripPrefix(b.title || '').toLowerCase();
                return titleA.localeCompare(titleB);
            });
        });

        const sortedNames = Object.keys(grouped).sort((a, b) => {
            if (a === "#") return -1;
            if (b === "#") return 1;
            return a.localeCompare(b);
        });

        return { grouped, sortedNames };
    }, [media, viewMode, sortBy, searchTerm, filterType, mediaTypeConfigs, configStrings]);

    const value = {
        media,
        loading,
        shelfData,
        mediaTypeConfigs,
        configStrings,
        genres,
        mediaTypes,
        viewMode, setViewMode,
        sortBy, setSortBy,
        searchTerm, setSearchTerm,
        filterType, setFilterType,
        getSortLabel,
        getCreatorInfo,
        fetchFullDetails,
        checkHasChanges,
        handleSave,
        formatValueForField, 
        handleCancel,
        handleRevert,
        refreshMedia: loadData
    };

    return (
        <MediaContext.Provider value={value}>
            {children}
        </MediaContext.Provider>
    );
};