import React, { useState, useEffect, useCallback } from 'react';
import mediaApi from '../Api/mediaApi';
import { useAuth } from '../authState/useAuth';
import Media from '../Media/Media';
import './Admin.css';

//For full code explanation see UpdateUser.jsx
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        return dateString;
    }
};

// React.memo ensures this row ONLY re-renders if its specific props change.
// This prevents the "typing lag" in large tables.
const MediaRow = React.memo(({
    item,
    columns,
    genres,
    feedback,
    hasChanges,
    onCellChange, // This is handleCellChange from the parent
    onView,
    onUpdate,
    onRevert,
    onDelete,
    canUpdateMedia,
    loading
}) => {

    // Internal helper to handle specific field rendering logic
    const renderTableCell = (item, col) => {
        const currentValue = item[col.fieldKey];

        // Handle non-editable fields (Dates and Read-only)
        if (col.fieldKey === 'updated') return formatDate(currentValue);

        if (!col.editable || !canUpdateMedia) {
            return (Array.isArray(currentValue) ? currentValue.join(', ') : currentValue) || '—';
        }

        // Handle Dropdown (Select) fields
        if (col.inputType === 'select' && col.fieldKey === 'genre') {
            return (
                <select
                    className="editable-input"
                    value={currentValue || ''}
                    // We pass item._id back up so the parent knows WHICH row to update
                    onChange={(e) => onCellChange(item._id, col.fieldKey, e.target.value, 'select')}
                >
                    {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            );
        }

        // Handle Boolean (Checkbox) fields
        if (col.inputType === 'checkbox') {
            return (
                <input
                    type="checkbox"
                    checked={!!currentValue}
                    onChange={(e) => onCellChange(item._id, col.fieldKey, e.target.checked, 'checkbox')}
                />
            );
        }

        // Default: Handle Text and Array-based fields (Title, Creator, etc.)
        // Note: ISBNs remain strings here because inputType is 'text'
        const displayValue = Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue || '');
        return (
            <input
                type="text"
                className="editable-input"
                value={displayValue}
                onChange={(e) => onCellChange(item._id, col.fieldKey, e.target.value, col.inputType)}
            />
        );
    };

    return (
        /* Replaced Fragment with tbody to allow the CSS 'display: block' to center the whole card group on mobile */
        <tbody className="media-row-group">
            {/* Conditional feedback row - shows success/error messages for this specific item */}
            {feedback && (
                <tr className={`feedback-base ${feedback.isError ? 'feedback-error' : 'feedback-success'}`}>
                    <td colSpan={columns.length + 1}>{feedback.message}</td>
                </tr>
            )}

            {/* The actual data row */}
            <tr>
                {/* Added data-label attribute to provide context in the mobile card view */}
                {columns.map(col => <td key={col.key} data-label={col.header}>{renderTableCell(item, col)}</td>)}

                <td className="action-button-group-cell">
                    <button
                        className="button-group view-button"
                        onClick={() => onView(item._id, item.title)}
                        disabled={loading}
                    >View</button>

                    <button
                        className={`button-group update-button ${hasChanges ? 'has-changes' : ''}`}
                        disabled={!hasChanges || loading}
                        onClick={() => onUpdate(item._id, item.title)}
                    >Update</button>
                    {/*Revert Button - Only visible/enabled when there are unsaved changes */}
                    <button
                        className="button-group revert-button"
                        onClick={() => onRevert(item._id)}
                        disabled={!hasChanges || loading}
                        title="Discard unsaved changes"
                    >↺</button>
                    <button
                        className="delete-button"
                        onClick={() => onDelete(item._id, item.title)}
                        disabled={loading}
                    >Delete</button>
                </td>
            </tr>
        </tbody>
    );
});

const UpdateMedia = ({ pathId }) => { // Extract pathId passed from AdminView (parentSegments[2])

    const { role: userRole, getToken } = useAuth();
    const canUpdateMedia = userRole === 'admin';
    const canDeleteMedia = userRole === 'admin';

    const [feedbackMessage, setFeedbackMessage] = useState({});
    const [media, setMedia] = useState([]);
    const [editedMedia, setEditedMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setErr] = useState(null);

    // New State for Filtering
    const [typeFilter, setTypeFilter] = useState('all');
    const [genres, setGenres] = useState([]); // State to store genres from server
    const [mediaTypesConfig, setMediaTypesConfig] = useState({}); // DYNAMIC CONFIG

    // Load Genres and Dynamic Config on Mount
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [genreList, config] = await Promise.all([
                    mediaApi.getGenres(),
                    mediaApi.getMediaTypes()
                ]);

                const gList = Array.isArray(genreList) ? genreList : [];
                setGenres(gList);
                setMediaTypesConfig(config || {});
                // eslint-disable-next-line no-unused-vars
            } catch (err) {
                setErr("Could not load server configuration.");
            }
        };
        loadInitialData();
    }, []);

    // DYNAMIC COLUMN DEFINITION
    const getColumns = () => {
        const cols = [
            { header: 'Title', key: 'title', fieldKey: 'title', editable: true, inputType: 'text' },
            { header: 'Genre', key: 'genre', fieldKey: 'genre', editable: true, inputType: 'select' },
            { header: 'Last Updated', key: 'updated', fieldKey: 'updated', editable: false }
        ];

        if (typeFilter !== 'all' && mediaTypesConfig[typeFilter]) {
            mediaTypesConfig[typeFilter].forEach(field => {
                cols.push({
                    header: field.label,
                    key: field.name,
                    fieldKey: field.name,
                    editable: true,
                    inputType: field.type
                });
            });
        }

        cols.push({ header: 'Type', key: 'mediaType', fieldKey: 'mediaType', editable: false });
        return cols;
    };

    const columns = getColumns();

    const loadMedia = useCallback(async () => {
        setLoading(true);
        setErr(null);
        setFeedbackMessage({});

        if (!canUpdateMedia) {
            setErr("Access Denied: Only administrators can view and update media data.");
            setLoading(false);
            return;
        }

        try {
            const data = await mediaApi.list(typeFilter, getToken);
            setMedia(data);
            setEditedMedia(JSON.parse(JSON.stringify(data)));
        } catch (error) {
            setErr(error.message || "An unknown error occurred while listing media.");
        } finally {
            setLoading(false);
        }
    }, [getToken, canUpdateMedia, typeFilter]);

    useEffect(() => {
        loadMedia();
    }, [loadMedia]);

    // Dynamic data handling for Arrays, Numbers, and Strings
    //accepts both 'list' and 'array' for backend flexibility
    const handleCellChange = useCallback((mediaId, key, value, inputType) => {
        setEditedMedia(prevMedia => {
            return prevMedia.map(item => {
                if (item._id === mediaId) {
                    let finalValue = value;

                    // Handle Arrays: Prevents [""] when clearing input
                    if (inputType === 'list' || inputType === 'array') {
                        finalValue = (typeof value === 'string' && value.trim() === '')
                            ? []
                            : (typeof value === 'string' ? value.split(',').map(v => v.trim()) : value);
                    }
                    // Handle Numbers: Ensures ISBN strings aren't touched
                    else if (inputType === 'number' || inputType === 'integer') {
                        finalValue = value === '' ? 0 : Number(value);
                    }
                    else if (inputType === 'checkbox' || inputType === 'boolean') {
                        finalValue = Boolean(value);
                    }

                    return { ...item, [key]: finalValue };
                }
                return item;
            });
        });
    }, []);


    // finds the original data for a specific ID and resets the edited state for just that row.
    const handleRevertRow = useCallback((mediaId) => {
        const originalItem = media.find(m => m._id === mediaId);
        if (!originalItem) return;

        setEditedMedia(prevMedia =>
            prevMedia.map(item => item._id === mediaId ? JSON.parse(JSON.stringify(originalItem)) : item)
        );

        // Clear any feedback messages for this row
        setFeedbackMessage(prev => {
            const newFeedback = { ...prev };
            delete newFeedback[mediaId];
            return newFeedback;
        });
    }, [media]);

    // Dynamic Change Detection based on config fields
    // Optimized to handle edge cases where mediaType might be missing
    //strictly uses the dynamic config to define what counts as a "change"
    const hasChanges = (originalMedia, editedItem) => {
        if (!originalMedia || !editedItem) return false;

        const mediaType = editedItem.mediaType || originalMedia.mediaType;
        const baseFields = ['title', 'genre'];
        const typeFields = mediaTypesConfig[mediaType]?.map(f => f.name) || [];
        const keysToCheck = [...new Set([...baseFields, ...typeFields])];

        return keysToCheck.some(key => {
            const orig = originalMedia[key];
            const edit = editedItem[key];

            if (Array.isArray(orig) || Array.isArray(edit)) {
                return JSON.stringify(orig || []) !== JSON.stringify(edit || []);
            }
            return String(orig ?? '') !== String(edit ?? '');
        });
    };
    // Dynamic Update Payload Construction
    const handleUpdate = async (mediaId, mediaTitle) => {
        const originalItem = media.find(m => m._id === mediaId);
        const editedItem = editedMedia.find(m => m._id === mediaId);

        // Detect changes dynamically
        if (!originalItem || !editedItem || !hasChanges(originalItem, editedItem)) {
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `No changes detected for: ${mediaTitle}.`, isError: false } }));
            return;
        }

        if (!canUpdateMedia) {
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Authorization error: Admin required.`, isError: true } }));
            return;
        }

        const isConfirmed = window.confirm(`Are you sure you want to update: ${mediaTitle}?`);
        if (!isConfirmed) return;

        // Build Whitelist: Only send keys defined in the config + base fields
        const allowedKeys = ['title', 'genre', ...(mediaTypesConfig[editedItem.mediaType]?.map(f => f.name) || [])];

        const updateData = allowedKeys.reduce((acc, key) => {
            if (editedItem[key] !== undefined) acc[key] = editedItem[key];
            return acc;
        }, {});

        try {
            await mediaApi.update(updateData, mediaId, getToken);
            // Update original 'media' state to match new saved data
            setMedia(prev => prev.map(m => m._id === mediaId ? { ...editedItem } : m));
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Updated successfully!`, isError: false } }));
        } catch (error) {
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Update Failed: ${error.message}`, isError: true } }));
        }
    };

    const handleDelete = async (mediaId, mediaTitle) => {
        if (!canDeleteMedia) {
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Authorization error: Admin required.`, isError: true } }));
            return;
        }

        const mediaToDelete = media.find(m => m._id === mediaId);
        const isConfirmed = window.confirm(`WARNING: Are you absolutely sure you want to DELETE: "${mediaTitle}"?`);
        if (!isConfirmed) return;

        try {
            if (mediaToDelete.cover) await mediaApi.removeCover(mediaToDelete.cover, getToken);
            await mediaApi.remove(mediaId, getToken);

            setMedia(prev => prev.filter(m => m._id !== mediaId));
            setEditedMedia(prev => prev.filter(m => m._id !== mediaId));
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Deleted.`, isError: false } }));
        } catch (error) {
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Deletion Failed: ${error.message}`, isError: true } }));
        }
    };

    const handleViewMedia = (mediaId) => {
        window.location.hash = `admin/updatemedia/${mediaId}`;
    };


    if (!canUpdateMedia) {
        return <div className="info-box error-box"><h2>Unauthorized Access</h2><p>Admin login required.</p></div>;
    }

    if (pathId) {
        return (
            <Media
                mediaId={pathId}
                viewContext="admin"
                onUpdate={loadMedia}
            />
        );
    }

    return (
        <div className="media-table-container user-table-container">
            <div className="table-header-controls">
                <h1>Media Directory</h1>
                <div className="filter-group">
                    <label htmlFor="type-filter">Filter By: </label>
                    <select id="type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-select">
                        <option value="all">All Media</option>
                        {Object.keys(mediaTypesConfig).map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}s</option>
                        ))}
                    </select>
                    <button onClick={loadMedia} className="button-group reload-button" disabled={loading}>{loading ? 'Loading...' : 'Reload List'}</button>
                </div>
            </div>

            {error && <div className="info-box error-box"><p><strong>Error:</strong> {error}</p></div>}

            <table className="user-table media-table">
                <thead>
                    <tr>
                        {columns.map(col => <th key={col.key}>{col.header}</th>)}
                        <th className="action-col">Actions</th>
                    </tr>
                </thead>
                {editedMedia.map((item, index) => {
                    const originalItem = media.find(m => m._id === item._id) || {};
                    return (
                        <MediaRow
                            key={item._id || index}
                            item={item}
                            columns={columns}
                            genres={genres}
                            feedback={feedbackMessage[item._id]}
                            hasChanges={hasChanges(originalItem, item)}
                            onCellChange={handleCellChange}
                            onView={handleViewMedia}
                            onUpdate={handleUpdate}
                            onRevert={handleRevertRow}
                            onDelete={handleDelete}
                            canUpdateMedia={canUpdateMedia}
                            loading={loading}
                        />
                    );
                })}
            </table>
        </div>
    );
};

export default UpdateMedia;