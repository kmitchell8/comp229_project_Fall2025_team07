import React, { useState, useEffect, useCallback } from 'react';
import mediaApi from '../Api/mediaApi';
import { useAuth } from '../StateProvider/authState/useAuth';
import { useMedia } from '../StateProvider/mediaState/useMedia';
import { ROLE_TO_ROUTE_MAP } from '../Api/routingConfig';
import Media from '../Media/Media';
import './Admin.css';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    // eslint-disable-next-line no-unused-vars
    } catch (e) { return dateString; }
};

const MediaRow = React.memo(({
    item, columns, genres, feedback, hasChanges, onCellChange, onView, onUpdate, onRevert, onDelete, canUpdateMedia, loading
}) => {
    const renderTableCell = (item, col) => {
        const dataKey = col.fieldKey.includes('.') ? col.fieldKey.split('.')[1] : col.fieldKey;
        const currentValue = item[dataKey];

        if (col.fieldKey === 'updated') return formatDate(currentValue);
        if (!col.editable || !canUpdateMedia) return (Array.isArray(currentValue) ? currentValue.join(', ') : currentValue) || '—';

        if (col.inputType === 'select' && col.fieldKey === 'genre') {
            return (
                <select className="editable-input" value={currentValue || ''} onChange={(e) => onCellChange(item._id, col.fieldKey, e.target.value, 'select')}>
                    {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            );
        }

        if (col.inputType === 'checkbox' || col.inputType === 'boolean') {
            return (
                <input type="checkbox" checked={!!currentValue} onChange={(e) => onCellChange(item._id, col.fieldKey, e.target.checked, 'checkbox')} />
            );
        }

        const displayValue = Array.isArray(currentValue) ? currentValue.join(', ') : (currentValue || '');
        return (
            <input type="text" className="editable-input" value={displayValue} onChange={(e) => onCellChange(item._id, col.fieldKey, e.target.value, col.inputType)} />
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
                {columns.map(col => <td key={col.key} data-label={col.header}>{renderTableCell(item, col)}</td>)}
                <td className="action-button-group-cell">
                    <button className="button-group view-button" onClick={() => onView(item._id, item.title)} disabled={loading}>View</button>
                    <button className={`button-group update-button ${hasChanges ? 'has-changes' : ''}`} disabled={!hasChanges || loading} onClick={() => onUpdate(item._id, item.title)}>Update</button>
                    <button className="button-group revert-button" onClick={() => onRevert(item._id)} disabled={!hasChanges || loading} title="Discard unsaved changes">↺</button>
                    <button className="delete-button" onClick={() => onDelete(item._id, item.title)} disabled={loading}>Delete</button>
                </td>
            </tr>
        </tbody>
    );
});

const UpdateMedia = ({ pathId }) => {
    const { role: userRole, getToken, hasAdminPrivileges } = useAuth();
    const { genres = [], mediaTypeConfigs: mediaTypesConfig = {}, loading: contextLoading, refreshMedia, formatValueForField } = useMedia();

    const [feedbackMessage, setFeedbackMessage] = useState({});
    const [media, setMedia] = useState([]);
    const [editedMedia, setEditedMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setErr] = useState(null); // Used for top-level fetch errors
    const [typeFilter, setTypeFilter] = useState('all');
    const adminRoute = ROLE_TO_ROUTE_MAP[userRole];

    const getColumns = () => {
        const cols = [
            { header: 'Title', key: 'title', fieldKey: 'title', editable: true, inputType: 'text' },
            { header: 'Genre', key: 'genre', fieldKey: 'genre', editable: true, inputType: 'select' },
            { header: 'Last Updated', key: 'updated', fieldKey: 'updated', editable: false }
        ];

        if (typeFilter !== 'all' && mediaTypesConfig[typeFilter]) {
            mediaTypesConfig[typeFilter].forEach(field => {
                const displayHeader = field.label.includes('.') ? field.label.split('.')[1] : field.label;
                cols.push({
                    header: displayHeader.charAt(0).toUpperCase() + displayHeader.slice(1),
                    key: field.name, fieldKey: field.name, editable: true, inputType: field.type
                });
            });
        }
        cols.push({ header: 'Type', key: 'mediaType', fieldKey: 'mediaType', editable: false });
        return cols;
    };

    const columns = getColumns();

    const loadMediaList = useCallback(async () => {
        if (contextLoading) return;
        setLoading(true);
        setErr(null); // Reset global error on reload
        try {
            const data = await mediaApi.list(null, 'all', typeFilter, getToken);
            setMedia(data);
            setEditedMedia(JSON.parse(JSON.stringify(data)));
        } catch (err) { 
            setErr(err.message); // Setting global error if fetch fails
        }
        finally { setLoading(false); }
    }, [getToken, typeFilter, contextLoading]);

    useEffect(() => { loadMediaList(); }, [loadMediaList]);

    const handleCellChange = useCallback((mediaId, key, value, inputType) => {
        const dataKey = key.includes('.') ? key.split('.')[1] : key;
        const finalValue = formatValueForField(value, inputType);
        setEditedMedia(prev => prev.map(item => item._id === mediaId ? { ...item, [dataKey]: finalValue } : item));
    }, [formatValueForField]);

    const handleRevertRow = useCallback((mediaId) => {
        const originalItem = media.find(m => m._id === mediaId);
        if (!originalItem) return;
        setEditedMedia(prev => prev.map(item => item._id === mediaId ? JSON.parse(JSON.stringify(originalItem)) : item));
        setFeedbackMessage(prev => { const n = { ...prev }; delete n[mediaId]; return n; });
    }, [media]);

    const hasChangesCheck = (originalMedia, editedItem) => {
        if (!originalMedia || !editedItem) return false;
        const mediaType = editedItem.mediaType || originalMedia.mediaType;
        const typeFields = mediaTypesConfig[mediaType]?.map(f => f.name.includes('.') ? f.name.split('.')[1] : f.name) || [];
        const keysToCheck = [...new Set(['title', 'genre', ...typeFields])];
        return keysToCheck.some(key => JSON.stringify(originalMedia[key] || "") !== JSON.stringify(editedItem[key] || ""));
    };

    const handleUpdate = async (mediaId, mediaTitle) => {
        const editedItem = editedMedia.find(m => m._id === mediaId);
        if (!window.confirm(`Update: ${mediaTitle}?`)) return;

        const typeFields = mediaTypesConfig[editedItem.mediaType]?.map(f => f.name.includes('.') ? f.name.split('.')[1] : f.name) || [];
        const updateData = ['title', 'genre', ...typeFields].reduce((acc, key) => {
            if (editedItem[key] !== undefined) acc[key] = editedItem[key];
            return acc;
        }, {});

        try {
            await mediaApi.update(updateData, mediaId, getToken);
            setMedia(prev => prev.map(m => m._id === mediaId ? { ...editedItem } : m));
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: "Updated!", isError: false } }));
            refreshMedia();
        } catch (e) { setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: e.message, isError: true } })); }
    };

    const handleDelete = async (mediaId, mediaTitle) => {
        if (!window.confirm(`DELETE: ${mediaTitle}?`)) return;
        try {
            const m = media.find(i => i._id === mediaId);
            if (m.cover) await mediaApi.removeCover(m.cover, getToken);
            await mediaApi.remove(mediaId, getToken);
            setMedia(prev => prev.filter(m => m._id !== mediaId));
            setEditedMedia(prev => prev.filter(m => m._id !== mediaId));
            refreshMedia();
        } catch (e) { setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: e.message, isError: true } })); }
    };

    if (contextLoading) return <div className="info-box"><h2>Loading Configuration...</h2></div>;
    if (pathId) return <Media mediaId={pathId} viewContext="admin" onUpdate={loadMediaList} />;

    return (
        <div className="media-table-container user-table-container">
            <div className="table-header-controls">
                <h1>Media Directory</h1>
                <div className="filter-group">
                    <select id="type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-select">
                        <option value="all">All Media</option>
                        {Object.keys(mediaTypesConfig).map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}s</option>
                        ))}
                    </select>
                    <button onClick={loadMediaList} className="button-group reload-button" disabled={loading}>{loading ? 'Loading...' : 'Reload List'}</button>
                </div>
            </div>

            {/* Restored Global Error Message Display */}
            {error && <div className="info-box error-box" style={{ marginBottom: '20px' }}>{error}</div>}

            <table className="user-table media-table">
                <thead><tr>{columns.map(col => <th key={col.key}>{col.header}</th>)}<th className="action-col">Actions</th></tr></thead>
                {editedMedia.map(item => (
                    <MediaRow
                        key={item._id} item={item} columns={columns} genres={genres}
                        feedback={feedbackMessage[item._id]}
                        hasChanges={hasChangesCheck(media.find(m => m._id === item._id), item)}
                        onCellChange={handleCellChange}
                        onView={(id) => window.location.hash = `${adminRoute}/updatemedia/${id}`}
                        onUpdate={handleUpdate} onRevert={handleRevertRow} onDelete={handleDelete}
                        canUpdateMedia={hasAdminPrivileges} loading={loading}
                    />
                ))}
            </table>
            
            {/* Added empty state for better UX */}
            {!loading && editedMedia.length === 0 && !error && (
                <div className="info-box">No media found for this selection.</div>
            )}
        </div>
    );
};

export default UpdateMedia;