import React, { useState, useEffect, useCallback } from 'react';
import libraryApi from '../Api/libraryApi'; // Assuming this contains branch listing/update logic
import { useAuth } from '../StateProvider/authState/useAuth';
import { useLibrary } from '../StateProvider/libraryState/useLibrary';
import BranchProfile from '../Profile/BranchProfile'; // The detailed view component
import './Admin.css';

const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        return dateString;
    }
};

// Memoized Row Component aligned with UserRow style
const BranchRow = React.memo(({
    branch,
    columns,
    feedback,
    hasChanges,
    onCellChange,
    onView,
    onUpdate,
    onRevert,
    loading
}) => {
    return (
        <tbody className="user-row-group">
            {/* Feedback Row */}
            {feedback && (
                <tr className={`feedback-base ${feedback.isError ? 'feedback-error' : 'feedback-success'}`}>
                    <td colSpan={columns.length + 1}>
                        <div role="alert">
                            {feedback.message}
                        </div>
                    </td>
                </tr>
            )}

            <tr>
                {columns.map((col) => {
                    const currentValue = col.isAddress 
                        ? (branch.address?.[col.fieldKey] || '') 
                        : (branch[col.fieldKey] || '');
                    
                    const isEditable = col.editable;

                    return (
                        <td key={col.key}>
                            {isEditable ? (
                                // Editable text inputs for Branch Details
                                <input
                                    type="text"
                                    value={currentValue}
                                    onChange={(e) => onCellChange(branch._id, col.fieldKey, e.target.value, col.isAddress)}
                                    className="editable-input"
                                    disabled={loading}
                                />
                            ) : (
                                // Read-Only fields (like Date or Status)
                                col.format ? col.format(currentValue) : (currentValue.toString())
                            )}
                        </td>
                    );
                })}
                <td className="action-button-group-cell">
                    <button
                        className="button-group view-button"
                        onClick={() => onView(branch._id)}
                        disabled={loading}
                    >
                        View
                    </button>
                    <button
                        className={`button-group update-button ${hasChanges ? 'has-changes' : ''}`}
                        onClick={() => onUpdate(branch._id, branch.name)}
                        disabled={loading || !hasChanges}
                    >
                        Update
                    </button>
                    <button
                        className="button-group revert-button"
                        onClick={() => onRevert(branch._id)}
                        disabled={!hasChanges || loading}
                        title="Discard unsaved changes"
                    >
                        ↺
                    </button>
                </td>
            </tr>
        </tbody>
    );
});

const UpdateBranch = ({ pathId }) => {
    const { getToken } = useAuth();
    // Use Context to access LibraryProvider states
    const { currentLibrary, loading: libraryLoading } = useLibrary(); 

    const [feedbackMessage, setFeedbackMessage] = useState({});
    const [branches, setBranches] = useState([]); // Original Source of Truth
    const [editedBranches, setEditedBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setErr] = useState(null);

    const columns = [
        { header: 'Branch Name', key: 'name', fieldKey: 'name', editable: true },
        { header: 'City', key: 'city', fieldKey: 'city', editable: true, isAddress: true },
        { header: 'Main', key: 'main', fieldKey: 'mainBranch', editable: false, format: (val) => val ? '⭐ Yes' : 'No' },
        { header: 'Created', key: 'created', fieldKey: 'created', editable: false, format: formatDate },
    ];

    const loadBranches = useCallback(async () => {
        setLoading(true);
        setErr(null);
        setFeedbackMessage({});

        try {
            const data = await libraryApi.listBranches(getToken);
            setBranches(data);
            setEditedBranches(JSON.parse(JSON.stringify(data)));
        } catch (error) {
            setErr(error.message || "An unknown error occurred while listing branches.");
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        loadBranches();
    }, [loadBranches]);

    const handleCellChange = useCallback((branchId, key, value, isAddress) => {
        setEditedBranches(prev => prev.map(branch => {
            if (branch._id === branchId) {
                if (isAddress) {
                    return { ...branch, address: { ...branch.address, [key]: value } };
                }
                return { ...branch, [key]: value };
            }
            return branch;
        }));
        setErr(null);
    }, []);

    const handleRevertRow = useCallback((branchId) => {
        const original = branches.find(b => b._id === branchId);
        if (!original) return;

        setEditedBranches(prev => 
            prev.map(b => b._id === branchId ? JSON.parse(JSON.stringify(original)) : b)
        );

        setFeedbackMessage(prev => {
            const newFeedback = { ...prev };
            delete newFeedback[branchId];
            return newFeedback;
        });
    }, [branches]);

    const hasChanges = (original, edited) => {
        // Checking base fields and nested address fields
        return original.name !== edited.name || 
               original.address?.city !== edited.address?.city;
    };

    const handleUpdate = async (branchId, branchName) => {
        const edited = editedBranches.find(b => b._id === branchId);
        
        const isConfirmed = window.confirm(
            `Are you sure you want to update branch: ${branchName}?`
        );

        if (!isConfirmed) return;

        try {
            await libraryApi.updateBranch(branchId, edited, getToken);
            setBranches(prev => prev.map(b => b._id === branchId ? { ...edited } : b));
            setFeedbackMessage(prev => ({ 
                ...prev, 
                [branchId]: { message: `Branch ${branchName} updated successfully!`, isError: false } 
            }));
        } catch (err) {
            setFeedbackMessage(prev => ({ 
                ...prev, 
                [branchId]: { message: `Update Failed: ${err.message}`, isError: true } 
            }));
        }
    };

    // RENDER STATES 
    if ((loading || libraryLoading) && branches.length === 0) {
        return (
            <div className="loading-container">
                <p>Loading Branch Data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="info-box error-box">
                <h2>Data Fetch Error</h2>
                <p>{error}</p>
                <button onClick={loadBranches} className="admin-nav-btn">Retry Load</button>
            </div>
        );
    }

    if (pathId) {
        return (
            <div className="admin-subview-container">
                <div className="admin-subview-header">
                    <button 
                        onClick={() => window.location.hash = 'admin/update-branch'} 
                        className="media-back-btn"
                    >
                        ← Back to Branch Directory
                    </button>
                </div>
                {/* Profile consumes context and reacts to branchId */}
                <BranchProfile branchId={pathId} />
            </div>
        );
    }

    return (
        <div className="user-table-container">
            <div className="table-header-controls">
                <div>
                    <h1>Branch Directory</h1>
                    <p className="admin-context-label">
                        Managing: <strong>{currentLibrary?.name}</strong>
                    </p>
                </div>
                <button
                    onClick={loadBranches}
                    className="button-group reload-button"
                    disabled={loading}
                >
                    {loading ? 'Loading...' : 'Reload List'}
                </button>
            </div>

            <table className="user-table">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} scope="col">
                                {col.header}
                            </th>
                        ))}
                        <th className="action-col">Actions</th>
                    </tr>
                </thead>
                {editedBranches.map((branch) => {
                    const original = branches.find(b => b._id === branch._id) || {};
                    return (
                        <BranchRow
                            key={branch._id}
                            branch={branch}
                            columns={columns}
                            feedback={feedbackMessage[branch._id]}
                            hasChanges={hasChanges(original, branch)}
                            onCellChange={handleCellChange}
                            onView={(id) => window.location.hash = `admin/update-branch/${id}`}
                            onUpdate={handleUpdate}
                            onRevert={handleRevertRow}
                            loading={loading}
                        />
                    );
                })}
            </table>
        </div>
    );
};

export default UpdateBranch;