import React, { /*createContext,*/ useState, useEffect, useCallback, useMemo } from 'react';
import { MediaContext } from './mediaContext.jsx';
import mediaApi from '../../Api/mediaApi';

export const MediaProvider = ({ children }) => {
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mediaTypeConfigs, setMediaTypeConfigs] = useState({});
    const [genres, setGenres] = useState([]); // Master list of genres from API

    // UI State for Filters (Moved from Library.jsx)
    const [viewMode, setViewMode] = useState('genre');
    const [sortBy, setSortBy] = useState('title');
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState('all');
    const [configStrings, setConfigStrings] = useState({ ignoredSuffixes: [], ignoredPrefixes: [] });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetching all three critical configuration pieces in parallel
            const [mediaData, typeConfigs, genreList, prefixSuffixData] = await Promise.all([
                mediaApi.list(),
                mediaApi.getConfigDoc('mediaTypes'),  // Replaces getMediaTypes
                mediaApi.getConfigDoc('genres'),      // Replaces getGenres
                mediaApi.getConfigDoc('prefixSuffix')
            ]);

            if (Array.isArray(mediaData)) setMedia(mediaData);
            setMediaTypeConfigs(typeConfigs || {});
            setGenres(Array.isArray(genreList) ? genreList : []);
            if (prefixSuffixData) setConfigStrings(prefixSuffixData);

        } catch (error) {
            console.error('Error fetching media context:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const getSortLabel = useCallback(() => {
        if (filterType === 'all' || !mediaTypeConfigs[filterType]) {
            return "Creator";
        }

        const config = mediaTypeConfigs[filterType];
        const creatorField = config.find(f => f.name.startsWith('creator'));

        if (creatorField && creatorField.label) {
            const labelParts = creatorField.label.split('.');
            const cleanLabel = labelParts.length > 1 ? labelParts[1] : labelParts[0];
            return cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
        }
        return "Creator";
    }, [filterType, mediaTypeConfigs]);

    useEffect(() => { loadData(); }, [loadData]);

    // heavy-lifting "Shelf Engine" (Logic remains exactly as original)
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
            //const suffixes = ['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v', 'esq', 'phd'];
            const suffixes = (configStrings.ignoredSuffixes || []).map(s => s.toLowerCase());
            const parts = fullName.trim().split(/\s+/);
            if (parts.length <= 1) return parts[0].toLowerCase();
            let lastIndex = parts.length - 1;
            if (suffixes.includes(parts[lastIndex].toLowerCase()) && parts.length > 1) {
                lastIndex--;
            }
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
                const rawGenre = item.genre || "Other";
                key = rawGenre.charAt(0).toUpperCase() + rawGenre.slice(1).toLowerCase();
            } else {
                let sortValue = (item[sortBy] || item.title || "#").toString().trim();
                if (sortBy === 'author') {
                    const creatorKey = getCreatorKey(item);
                    if (creatorKey && item[creatorKey]) {
                        sortValue = getLastName(item[creatorKey]);
                    }
                }
                key = sortValue.charAt(0).toUpperCase();
                if (!/[A-Z]/.test(key)) key = "#";
            }
            if (!acc[key]) acc[key] = [];
            acc[key].push({ ...item, id: item._id });
            return acc;
        }, {});
        // Prepare the prefix list once (not every time the sort runs)
        const ignorePrefixes = (configStrings.ignoredPrefixes || []).map(p => p.toLowerCase());

        // Define the helper once
        const stripPrefix = (str) => {
            if (!str) return "";
            const parts = str.trim().split(/\s+/);
            if (parts.length > 1 && ignorePrefixes.includes(parts[0].toLowerCase())) {
                return parts.slice(1).join(' ');
            }
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
                    if (lastA === lastB) {
                        return (valA || "").localeCompare(valB || "");
                    }
                    return lastA.localeCompare(lastB);
                }
                //return (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase());

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
        genres, // Now strictly managed from the Master List
        viewMode, setViewMode,
        sortBy, setSortBy,
        searchTerm, setSearchTerm,
        filterType, setFilterType,
        getSortLabel,
        refreshMedia: loadData
    };

    return (
        <MediaContext.Provider value={value}>
            {children}
        </MediaContext.Provider>);
};