import React, { useState, useEffect, useCallback, useMemo } from 'react';
import mediaApi from '../Api/mediaApi';
import { useAuth } from '../StateProvider/authState/useAuth';
import { useMedia } from '../StateProvider/mediaState/useMedia';
import { useLibrary } from '../StateProvider/libraryState/useLibrary';
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
    item, columns, genres, feedback, hasChanges, onCellChange, onView, onUpdate, onRevert, onDelete, loading
}) => {
    // MediaRow now only receives items the user is authorized to see/manage.
    const renderTableCell = (item, col) => {
        const dataKey = col.fieldKey.includes('.') ? col.fieldKey.split('.')[1] : col.fieldKey;
        const currentValue = item[dataKey];

        if (col.fieldKey === 'updated') return formatDate(currentValue);
        
        if (!col.editable) {
            return (Array.isArray(currentValue) ? currentValue.join(', ') : currentValue) || '—';
        }

        if (col.inputType === 'select' && col.fieldKey === 'genre') {
            return (
                <select className="editable-input" value={currentValue || ''} onChange={(e) => onCellChange(item._id, col.fieldKey, e.target.value, 'select')}>
                    {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
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
    const { role: userRole, getToken } = useAuth();
    const { branches = [] } = useLibrary();
    const { 
        genres = [], mediaTypeConfigs: mediaTypesConfig = {}, 
        loading: contextLoading, refreshMedia, formatValueForField,
        canManageMedia, checkHasChanges,
        handleDelete: providerDelete // Orchestrated delete from Provider
    } = useMedia();

    const [feedbackMessage, setFeedbackMessage] = useState({});
    const [media, setMedia] = useState([]);
    const [editedMedia, setEditedMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setErr] = useState(null); 
    const [typeFilter, setTypeFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState(""); 
    
    // UI state for managing which branch tables are open/closed
    const [collapsedBranches, setCollapsedBranches] = useState({});

    const adminRoute = ROLE_TO_ROUTE_MAP[userRole];

    const toggleBranch = (branchId) => {
        setCollapsedBranches(prev => ({
            ...prev,
            [branchId]: !prev[branchId]
        }));
    };

    const loadMediaList = useCallback(async () => {
        if (contextLoading) return;
        setLoading(true);
        setErr(null); 
        try {
            const data = await mediaApi.list(null, 'all', typeFilter, getToken);
            setMedia(data);
            setEditedMedia(JSON.parse(JSON.stringify(data)));
        } catch (err) { 
            setErr(err.message); 
        } finally { setLoading(false); }
    }, [getToken, typeFilter, contextLoading]);

    useEffect(() => { loadMediaList(); }, [loadMediaList]);

    const groupedMedia = useMemo(() => {
        // APPLY VISIBILITY RULES DURING FILTERING
        // Only items the user is authorized to manage appear in this Admin list.
        const filtered = editedMedia.filter(m => {
            const matchesSearch = (m.title || "").toLowerCase().includes(searchTerm.toLowerCase());
            const isAuthorized = canManageMedia(m);
            return matchesSearch && isAuthorized;
        });

        return filtered.reduce((acc, item) => {
            const bId = item.branchId || item.mediaBranchId || 'Master Catalog';
            if (!acc[bId]) acc[bId] = [];
            acc[bId].push(item);
            return acc;
        }, {});
    }, [editedMedia, searchTerm, canManageMedia]);

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

    const onDelete = async (mediaId, mediaTitle) => {
        const item = media.find(m => m._id === mediaId);
        if (!window.confirm(`DELETE: ${mediaTitle}?\nThis will remove the database record and associated storage files.`)) return;
        
        try {
            setLoading(true);
            // Calling the full orchestration moved to the Provider
            await providerDelete(item, getToken);
            
            // Clean up local UI state
            setMedia(prev => prev.filter(m => m._id !== mediaId));
            setEditedMedia(prev => prev.filter(m => m._id !== mediaId));
            setFeedbackMessage(prev => { const n = { ...prev }; delete n[mediaId]; return n; });
        } catch (e) { 
            setFeedbackMessage(prev => ({ ...prev, [mediaId]: { message: e.message, isError: true } })); 
        } finally {
            setLoading(false);
        }
    };

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

    if (contextLoading) return <div className="info-box"><h2>Loading Configuration...</h2></div>;
    if (pathId) return <Media mediaId={pathId} viewContext="admin" onUpdate={loadMediaList} />;

    const columns = getColumns();

    return (
        <div className="media-table-container user-table-container">
            <div className="table-header-controls">
                <h1>Media Directory</h1>
                <div className="filter-group">
                    <input 
                        type="text" 
                        className="search-filter-input" 
                        placeholder="Filter by title..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                    <select id="type-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="filter-select">
                        <option value="all">All Media</option>
                        {Object.keys(mediaTypesConfig).map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}s</option>
                        ))}
                    </select>
                    <button onClick={loadMediaList} className="button-group reload-button" disabled={loading}>{loading ? 'Loading...' : 'Reload List'}</button>
                </div>
            </div>

            {error && <div className="info-box error-box" style={{ marginBottom: '20px' }}>{error}</div>}

            {Object.entries(groupedMedia).map(([branchId, items]) => {
                const branchName = branches.find(b => b._id === branchId)?.name || (branchId === 'Master Catalog' ? 'Master Catalog' : `Branch: ${branchId}`);
                const isCollapsed = collapsedBranches[branchId];
                
                return (
                    <div key={branchId} className="branch-section">
                        <h2 
                            className="branch-group-header collapsible-header" 
                            onClick={() => toggleBranch(branchId)}
                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                            <span>{branchName} ({items.length})</span>
                            <span className="collapse-icon" style={{ fontSize: '0.8em' }}>
                                {isCollapsed ? '▶ Show' : '▼ Hide'}
                            </span>
                        </h2>
                        
                        {!isCollapsed && (
                            <table className="user-table media-table">
                                <thead>
                                    <tr>
                                        {columns.map(col => <th key={col.key}>{col.header}</th>)}
                                        <th className="action-col">Actions</th>
                                    </tr>
                                </thead>
                                {items.map(item => (
                                    <MediaRow
                                        key={item._id} 
                                        item={item} 
                                        columns={columns} 
                                        genres={genres}
                                        feedback={feedbackMessage[item._id]}
                                        hasChanges={checkHasChanges(media.find(m => m._id === item._id), item, item._originalDescriptionText || "")}
                                        onCellChange={handleCellChange}
                                        onView={(id) => window.location.hash = `${adminRoute}/updatemedia/${id}`}
                                        onUpdate={handleUpdate} 
                                        onRevert={handleRevertRow} 
                                        onDelete={onDelete}
                                        loading={loading}
                                    />
                                ))}
                            </table>
                        )}
                    </div>
                );
            })}
            
            {!loading && Object.keys(groupedMedia).length === 0 && !error && (
                <div className="info-box">No media records found for your access level.</div>
            )}
        </div>
    );
};

export default UpdateMedia;