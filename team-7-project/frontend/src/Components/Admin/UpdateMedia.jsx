import React, { useState, useEffect, useCallback } from 'react';
import mediaApi from '../Api/mediaApi';
import { useAuth } from '../StateProvider/authState/useAuth';
import { useMedia } from '../StateProvider/mediaState/useMedia'; // Provider Integration
import Media from '../Media/Media';
import './Admin.css';

// For full code explanation see UpdateUser.jsx
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

const MediaRow = React.memo(({
    item,
    columns,
    genres,
    feedback,
    hasChanges,
    onCellChange, 
    onView,
    onUpdate,
    onRevert,
    onDelete,
    canUpdateMedia,
    loading
}) => {

    const renderTableCell = (item, col) => {
        // Use the actual data key for lookups
        const dataKey = col.fieldKey.includes('.') ? col.fieldKey.split('.')[1] : col.fieldKey;
        const currentValue = item[dataKey];

        if (col.fieldKey === 'updated') return formatDate(currentValue);

        if (!col.editable || !canUpdateMedia) {
            return (Array.isArray(currentValue) ? currentValue.join(', ') : currentValue) || '—';
        }

        if (col.inputType === 'select' && col.fieldKey === 'genre') {
            return (
                <select
                    className="editable-input"
                    value={currentValue || ''}
                    onChange={(e) => onCellChange(item._id, col.fieldKey, e.target.value, 'select')}
                >
                    {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            );
        }

        if (col.inputType === 'checkbox' || col.inputType === 'boolean') {
            return (
                <input
                    type="checkbox"
                    checked={!!currentValue}
                    onChange={(e) => onCellChange(item._id, col.fieldKey, e.target.checked, 'checkbox')}
                />
            );
        }

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
        <tbody className="media-row-group">
            {feedback && (
                <tr className={`feedback-base ${feedback.isError ? 'feedback-error' : 'feedback-success'}`}>
                    <td colSpan={columns.length + 1}>{feedback.message}</td>
                </tr>
            )}

            <tr>
                {columns.map(col => (
                    <td key={col.key} data-label={col.header}>
                        {renderTableCell(item, col)}
                    </td>
                ))}

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

const UpdateMedia = ({ pathId }) => { 

    const { role: userRole, getToken } = useAuth();
    const canUpdateMedia = userRole === 'admin';
    const canDeleteMedia = userRole === 'admin';

    // Deliberately using contextLoading to ensure data synchronization.
    // We alias mediaTypeConfigs to your original variable name and provide empty fallbacks.
    const { 
        genres = [], 
        mediaTypeConfigs: mediaTypesConfig = {}, 
        loading: contextLoading,
        refreshMedia 
    } = useMedia();

    const [feedbackMessage, setFeedbackMessage] = useState({});
    const [media, setMedia] = useState([]);
    const [editedMedia, setEditedMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setErr] = useState(null);

    const [typeFilter, setTypeFilter] = useState('all');

    // ORIGINAL LOGIC: getColumns now relies on the Provider's mediaTypesConfig
    const getColumns = () => {
        const cols = [
            { header: 'Title', key: 'title', fieldKey: 'title', editable: true, inputType: 'text' },
            { header: 'Genre', key: 'genre', fieldKey: 'genre', editable: true, inputType: 'select' },
            { header: 'Last Updated', key: 'updated', fieldKey: 'updated', editable: false }
        ];

        if (typeFilter !== 'all' && mediaTypesConfig[typeFilter]) {
            mediaTypesConfig[typeFilter].forEach(field => {
                // Clean up "creator.xxx" for the table header
                const displayHeader = field.label.includes('.') ? field.label.split('.')[1] : field.label;
                cols.push({
                    header: displayHeader.charAt(0).toUpperCase() + displayHeader.slice(1),
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
        // Guard: Prevent API calls until the configuration context is ready
        if (contextLoading) return;

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
    }, [getToken, canUpdateMedia, typeFilter, contextLoading]);

    useEffect(() => {
        loadMedia();
    }, [loadMedia]);

    const handleCellChange = useCallback((mediaId, key, value, inputType) => {
        // Extract property name from "creator.xxx"
        const dataKey = key.includes('.') ? key.split('.')[1] : key;

        setEditedMedia(prevMedia => {
            return prevMedia.map(item => {
                if (item._id === mediaId) {
                    let finalValue = value;

                    if (inputType === 'list' || inputType === 'array') {
                        finalValue = (typeof value === 'string' && value.trim() === '')
                            ? []
                            : (typeof value === 'string' ? value.split(',').map(v => v.trim()) : value);
                    }
                    else if (inputType === 'number' || inputType === 'integer') {
                        finalValue = value === '' ? 0 : Number(value);
                    }
                    else if (inputType === 'checkbox' || inputType === 'boolean') {
                        finalValue = Boolean(value);
                    }

                    return { ...item, [dataKey]: finalValue };
                }
                return item;
            });
        });
    }, []);


    const handleRevertRow = useCallback((mediaId) => {
        const originalItem = media.find(m => m._id === mediaId);
        if (!originalItem) return;

        setEditedMedia(prevMedia =>
            prevMedia.map(item => item._id === mediaId ? JSON.parse(JSON.stringify(originalItem)) : item)
        );

        setFeedbackMessage(prev => {
            const newFeedback = { ...prev };
            delete newFeedback[mediaId];
            return newFeedback;
        });
    }, [media]);

    const hasChanges = (originalMedia, editedItem) => {
        if (!originalMedia || !editedItem) return false;

        const mediaType = editedItem.mediaType || originalMedia.mediaType;
        const baseFields = ['title', 'genre'];
        
        // Flatten the config field names to match state
        const typeFields = mediaTypesConfig[mediaType]?.map(f => f.name.includes('.') ? f.name.split('.')[1] : f.name) || [];
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

    const handleUpdate = async (mediaId, mediaTitle) => {
        const originalItem = media.find(m => m._id === mediaId);
        const editedItem = editedMedia.find(m => m._id === mediaId);

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

        // Build Whitelist: Map config names to flat keys
        const typeFields = mediaTypesConfig[editedItem.mediaType]?.map(f => f.name.includes('.') ? f.name.split('.')[1] : f.name) || [];
        const allowedKeys = ['title', 'genre', ...typeFields];

        const updateData = allowedKeys.reduce((acc, key) => {
            if (editedItem[key] !== undefined) acc[key] = editedItem[key];
            return acc;
        }, {});

        try {
            await mediaApi.update(updateData, mediaId, getToken);
            setMedia(prev => prev.map(m => m._id === mediaId ? { ...editedItem } : m));
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Updated successfully!`, isError: false } }));
            
            // Sync global context if necessary
            refreshMedia();
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
            
            // Sync global context
            refreshMedia();
        } catch (error) {
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Deletion Failed: ${error.message}`, isError: true } }));
        }
    };

    const handleViewMedia = (mediaId) => {
        window.location.hash = `admin/updatemedia/${mediaId}`;
    };

    // Deliberate use of contextLoading: Ensures we don't render a broken UI if config is missing.
    if (contextLoading) {
        return <div className="info-box"><h2>Loading Configuration...</h2></div>;
    }

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
                    {/*<label htmlFor="type-filter">Filter By: </label>*/}
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