import React, { useState, useEffect, useCallback } from 'react';
import mediaApi from '../Api/mediaApi';
import { useAuth } from '../authState/useAuth';
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

const UpdateMedia = (/*{pathId}/*{parentSegment}*/) => {

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

    // Added specific discriminator fields to ensure they are sent in the update payload
    const updatableMediaKeys = [
        'title', 'creator', 'publisher', 'ISBN_10', 'ISBN_13',
        'quantity', 'genre', 'rated', 'type', 'platform', 'year',
        'author', 'director', 'developer', 'rating', 'releaseYear',
        'platforms', 'multiplayer'
    ];

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

    const handleCellChange = useCallback((mediaId, key, value, inputType) => {
        setEditedMedia(prevMedia => {
            return prevMedia.map(item => {
                if (item._id === mediaId) {
                    let finalValue = value;
                    if (inputType === 'list') {
                        finalValue = value.split(',').map(v => v.trim());
                    } else if (inputType === 'number') {
                        finalValue = Number(value);
                    } else if (inputType === 'checkbox') {
                        finalValue = value; 
                    }
                    return { ...item, [key]: finalValue };
                }
                return item;
            });
        });
        setErr(null);
    }, []);

    const hasChanges = (originalMedia, editedItem) => {
        return updatableMediaKeys.some(key => {
            if (Array.isArray(originalMedia[key]) || Array.isArray(editedItem[key])) {
                return JSON.stringify(originalMedia[key] || []) !== JSON.stringify(editedItem[key] || []);
            }
            return String(originalMedia[key] || '') !== String(editedItem[key] || '');
        });
    };

    const handleUpdate = async (mediaId, mediaTitle) => {
        const originalItem = media.find(m => m._id === mediaId);
        const editedItem = editedMedia.find(m => m._id === mediaId);

        if (!originalItem || !editedItem || !hasChanges(originalItem, editedItem)) {
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `No changes detected for media: ${mediaTitle}.`, isError: false } }));
            return;
        }

        if (!canUpdateMedia) {
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Authorization error: Must be an Admin to update media.`, isError: true } }));
            return;
        }

        const isConfirmed = window.confirm(`Are you sure you want to update media: ${mediaTitle}?`);
        if (!isConfirmed) return;

        const updateData = updatableMediaKeys.reduce((acc, key) => {
            if (editedItem[key] !== undefined) acc[key] = editedItem[key];
            return acc;
        }, {});

        try {
            await mediaApi.update(updateData, mediaId, getToken);
            setMedia(prev => prev.map(m => m._id === mediaId ? editedItem : m));
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Media ${mediaTitle} updated successfully!`, isError: false } }));
        } catch (error) {
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Update Failed: ${error.message}`, isError: true } }));
        }
    };

    const handleDelete = async (mediaId, mediaTitle) => {
        if (!canDeleteMedia) {
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Authorization error: Must be an Admin to delete media.`, isError: true } }));
            return;
        }

        const mediaToDelete = media.find(m => m._id === mediaId);
        const isConfirmed = window.confirm(`WARNING: Are you absolutely sure you want to DELETE media: "${mediaTitle}"?`);
        if (!isConfirmed) return;

        try {
            if (mediaToDelete.cover) await mediaApi.removeCover(mediaToDelete.cover, getToken);
            await mediaApi.remove(mediaId, getToken);

            setMedia(prev => prev.filter(m => m._id !== mediaId));
            setEditedMedia(prev => prev.filter(m => m._id !== mediaId));
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Media "${mediaTitle}" DELETED.`, isError: false } }));
        } catch (error) {
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: `Deletion Failed: ${error.message}`, isError: true } }));
        }
    };

    const renderTableCell = (item, col) => {
        const currentValue = item[col.fieldKey];
        if (col.fieldKey === 'updated') return formatDate(currentValue);
        if (!col.editable || !canUpdateMedia) return (Array.isArray(currentValue) ? currentValue.join(', ') : currentValue) || '—';

        if (col.inputType === 'select' && col.fieldKey === 'genre') {
            return (
                <select className="editable-input" value={currentValue || ''} onChange={(e) => handleCellChange(item._id, col.fieldKey, e.target.value, 'select')}>
                    {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            );
        }

        if (col.inputType === 'checkbox') {
            return <input type="checkbox" checked={!!currentValue} onChange={(e) => handleCellChange(item._id, col.fieldKey, e.target.checked, 'checkbox')} />;
        }

        const displayValue = Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue || '');
        return (
            <input type="text" className="editable-input" value={displayValue} onChange={(e) => handleCellChange(item._id, col.fieldKey, e.target.value, col.inputType)} />
        );
    };

    if (!canUpdateMedia) {
        return <div className="info-box error-box"><h2>Unauthorized Access</h2><p>Admin login required.</p></div>;
    }

    return (
        <div className="media-table-container user-table-container">
            <div className="table-header-controls">
                <h1>Media Directory</h1>
                <div className="filter-group">
                    <label htmlFor="type-filter">Filter By: </label>
                    <select id="type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-select">
                        <option value="all">All Media</option>
                        {Object.keys(mediaTypesConfig).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}s</option>)}
                    </select>
                    <button onClick={loadMedia} className="button-group reload-button" disabled={loading}>{loading ? 'Loading...' : 'Reload List'}</button>
                </div>
            </div>

            {error && <div className="info-box error-box"><p><strong>Error:</strong> {error}</p></div>}

            <table className="user-table">
                <thead>
                    <tr>
                        {columns.map(col => <th key={col.key}>{col.header}</th>)}
                        <th className="action-col">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {editedMedia.map((item, index) => {
                        const feedback = feedbackMessage[item._id];
                        const mediaHasChanges = hasChanges(media.find(m => m._id === item._id) || {}, item);
                        return (
                            <React.Fragment key={item._id || index}>
                                {feedback && (
                                    <tr className={`feedback-base ${feedback.isError ? 'feedback-error' : 'feedback-success'}`}>
                                        <td colSpan={columns.length + 1}>{feedback.message}</td>
                                    </tr>
                                )}
                                <tr>
                                    {columns.map(col => <td key={col.key}>{renderTableCell(item, col)}</td>)}
                                    <td className="action-button-group-cell">
                                        <button className={`button-group update-button ${mediaHasChanges ? 'has-changes' : ''}`} disabled={!mediaHasChanges || loading} onClick={() => handleUpdate(item._id, item.title)}>Update</button>
                                        <button className="delete-button" onClick={() => handleDelete(item._id, item.title)} disabled={loading}>Delete</button>
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default UpdateMedia;