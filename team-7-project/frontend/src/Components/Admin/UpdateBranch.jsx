import React, { useState, useEffect, useCallback } from 'react';
import libraryApi from '../Api/libraryApi'; // Assuming this contains branch listing/update logic
import { useAuth } from '../StateProvider/authState/useAuth';
import { useLibrary } from '../StateProvider/libraryState/useLibrary';
import BranchProfile from '../Profile/BranchProfile'; // The detailed view component
import { ROUTES, ROLE_TO_ROUTE_MAP } from '../Api/routingConfig';
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
                    // Because we flattened the data in the parent, we access values directly
                    const currentValue = branch[col.fieldKey] || '';
                    const isEditable = col.editable;

                    return (
                        <td key={col.key}>
                            {/* Logic for the Main Branch Toggle in the column */}
                            {col.fieldKey === 'mainBranch' ? (
                                <div className="checkbox-wrapper">
                                    <input
                                        type="checkbox"
                                        checked={!!currentValue}
                                        onChange={(e) => onCellChange(branch._id, col.fieldKey, e.target.checked)}
                                        className="form-checkbox"
                                        disabled={loading}
                                    />
                                    <label className="checkbox-label-text">
                                        {currentValue ? 'Main' : 'Standard'}
                                    </label>
                                </div>
                            ) : isEditable ? (
                                // Editable text inputs for Branch Details (Flattened Keys)
                                <input
                                    type="text"
                                    value={currentValue}
                                    onChange={(e) => onCellChange(branch._id, col.fieldKey, e.target.value)}
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
    const { getToken, role: userRole } = useAuth();
    const { currentLibrary, branches: contextBranches, loading: libraryLoading, refreshLibrary, setSelectedBranchId } = useLibrary();

    // Dynamic Route Logic
    const adminBaseRoute = ROLE_TO_ROUTE_MAP[userRole] || ROUTES.ADMIN;

    const [feedbackMessage, setFeedbackMessage] = useState({});
    const [branches, setBranches] = useState([]); // Master flattened state
    const [editedBranches, setEditedBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setErr] = useState(null);

    const [showOnlyMain, setShowOnlyMain] = useState(false);

    // Columns defined against flattened keys
    const columns = [
        { header: 'Branch Name', key: 'name', fieldKey: 'name', editable: true },
        { header: 'Street', key: 'street', fieldKey: 'street', editable: true },
        { header: 'City', key: 'city', fieldKey: 'city', editable: true },
        { header: 'Province', key: 'province', fieldKey: 'province', editable: true },
        { header: 'Postal Code', key: 'postalCode', fieldKey: 'postalCode', editable: true },
        { header: 'Main Status', key: 'main', fieldKey: 'mainBranch', editable: true },
        { header: 'Created', key: 'created', fieldKey: 'created', editable: false, format: formatDate },
    ];

    // Helper: Move nested address fields to top level
    const flattenBranch = useCallback((branch) => {
        return {
            ...branch,
            street: branch.address?.street || '',
            addressLineTwo: branch.address?.addressLineTwo || '',
            city: branch.address?.city || '',
            province: branch.address?.province || '',
            postalCode: branch.address?.postalCode || '',
            Country: branch.address?.Country || ''
        };
    }, []);

    // Helper: Reconstruct the address object for API calls
    const unflattenBranch = (flatBranch) => {
        const { street, addressLineTwo, city, province, postalCode, Country, ...rest } = flatBranch;
        return {
            ...rest,
            address: {
                street,
                addressLineTwo,
                city,
                province,
                postalCode,
                Country
            }
        };
    };

    // Synchronize local state and flatten on arrival
    useEffect(() => {

        if (contextBranches && contextBranches.length > 0) {
            const flattened = contextBranches.map(flattenBranch);
            setBranches(flattened);
            setEditedBranches(JSON.parse(JSON.stringify(flattened)));
            setErr(null);
        } else {
            console.warn("[POF 1-Alt] ContextBranches is empty or undefined.");
        }
    }, [contextBranches, flattenBranch]);

    const handleCellChange = useCallback((branchId, key, value) => {
        setEditedBranches(prev => prev.map(branch => {

            // Check if toggling the 'mainBranch' property to 'true'
            if (key === 'mainBranch' && value === true) {
                // If this is the branch the user clicked, set it to true
                if (branch._id === branchId) {
                    return { ...branch, [key]: true };
                }
                // For ALL other branches, force mainBranch to false (Single Source of Truth)
                return { ...branch, mainBranch: false };
            }
            if (branch._id === branchId) {
                return { ...branch, [key]: value };
            }
            return branch;
        }));
        setErr(null);
    }, []);


    const handleRevertRow = useCallback((branchId) => {
        // Get the original version of the branch reverting
        const originalVersion = branches.find(b => b._id === branchId);
        if (!originalVersion) return;

        // Identify which branch was originally the 'Main' in the master data
        const originalMainBranch = branches.find(b => b.mainBranch === true);

        setEditedBranches(prev => {
            return prev.map(currentEditedBranch => {
                // CASE A: This is the row the user actually clicked 'Revert' on
                if (currentEditedBranch._id === branchId) {
                    return JSON.parse(JSON.stringify(originalVersion));
                }
                // CASE B: AUTOMATION
                // If the user is reverting the row that they had TEMPORARILY set to 'Main',
                // automatically restore the 'Main' status to the original owner.
                if (originalVersion.mainBranch === false) {
                    //  reverting a 'False -> True' change.
                    // Therefore, we must restore the 'True' status to the original master main.
                    if (originalMainBranch && currentEditedBranch._id === originalMainBranch._id) {
                        return { ...currentEditedBranch, mainBranch: true };
                    }
                }
                // CASE C: CLEANUP
                // If the user is reverting the 'Original Main' (which they had unchecked),
                // ensure no other row in the list is still acting as 'Main'.
                if (originalVersion.mainBranch === true && currentEditedBranch._id !== branchId) {
                    return { ...currentEditedBranch, mainBranch: false };
                }

                return currentEditedBranch;
            });
        });
        setFeedbackMessage(prev => {
            const newFeedback = { ...prev };
            delete newFeedback[branchId];
            return newFeedback;
        });
    }, [branches]);

    const hasChanges = (original, edited) => {
        if (!original || !edited) return false;
        // Simple top-level comparison because everything is flat
        return columns.some(col => {
            if (!col.editable) return false;
            if (original.mainBranch === true && col.fieldKey === 'mainBranch') {
                return false;
            }
            return original[col.fieldKey] !== edited[col.fieldKey];
        });
    };

    const handleUpdate = async (branchId, branchName) => {
        const flatEdited = editedBranches.find(b => b._id === branchId);

        // DEBUG LOG 4: Check payload structure before API call
        const payload = unflattenBranch(flatEdited);

        const isConfirmed = window.confirm(`Are you sure you want to update branch: ${branchName}?`);
        if (!isConfirmed) return;

        setLoading(true);
        try {
            await libraryApi.updateBranch(branchId, payload, getToken);
            if (refreshLibrary) await refreshLibrary();

            setFeedbackMessage(prev => ({
                ...prev,
                [branchId]: { message: `Branch ${branchName} updated successfully!`, isError: false }
            }));
        } catch (err) {
            console.error("[POF 5] API Update failed:", err);
            setFeedbackMessage(prev => ({
                ...prev,
                [branchId]: { message: `Update Failed: ${err.message}`, isError: true }
            }));
            setErr(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Dynamically builds hash using adminBaseRoute + updatebranch key
    const handleViewBranch = (branchId) => {
        if (setSelectedBranchId) setSelectedBranchId(branchId);
        window.location.hash = `${adminBaseRoute}/${ROUTES.UPDATE_BRANCH}/${branchId}`;
    };

    const filteredBranches = editedBranches.filter(b => showOnlyMain ? b.mainBranch === true : true);
    if ((loading || libraryLoading) && branches.length === 0) {
        return <div className="loading-container"><p>Loading Branch Data...</p></div>;
    }

    if (error && branches.length === 0) {
        return (
            <div className="info-box error-box">
                <h2>Data Fetch Error</h2>
                <p>{error}</p>
                <button onClick={refreshLibrary} className="admin-nav-btn">Retry Load</button>
            </div>
        );
    }

    if (pathId) {
        return (
            <div className="admin-subview-container">
                <div className="admin-subview-header">
                    <button
                        onClick={() => {
                            if (setSelectedBranchId) setSelectedBranchId(null);
                            window.location.hash = `${adminBaseRoute}/${ROUTES.UPDATE_BRANCH}`;
                        }}
                        className="media-back-btn"
                    >
                        ← Back to Branch Directory
                    </button>
                </div>
                <BranchProfile branchId={pathId} />
            </div>
        );
    }

    return (
        <div className="user-table-container">
            <div className="table-header-controls">
                <div>
                    <h1>Branch Directory</h1>
                    <p className="admin-context-label">Managing: <strong>{currentLibrary?.name}</strong></p>
                </div>
                <div className="form-section-group" style={{ marginBottom: '0', border: 'none', background: 'transparent' }}>
                    <div className="form-group checkbox-inline-group" style={{ padding: '0' }}>
                        <div className="checkbox-wrapper">
                            <input
                                type="checkbox"
                                id="mainBranchToggle"
                                checked={showOnlyMain}
                                onChange={(e) => setShowOnlyMain(e.target.checked)}
                                className="form-checkbox"
                            />
                            <label htmlFor="mainBranchToggle" className="checkbox-label-text">Show Main Branch Only</label>
                        </div>
                    </div>
                </div>
                <button onClick={refreshLibrary} className="button-group reload-button" disabled={loading || libraryLoading}>
                    {(loading || libraryLoading) ? 'Syncing...' : 'Reload List'}
                </button>
            </div>

            <table className="user-table">
                <thead>
                    <tr>
                        {columns.map((col) => <th key={col.key} scope="col">{col.header}</th>)}
                        <th className="action-col">Actions</th>
                    </tr>
                </thead>
                {filteredBranches.map((branch) => {
                    const original = branches.find(b => b._id === branch._id) || {};
                    return (
                        <BranchRow
                            key={branch._id}
                            branch={branch}
                            columns={columns}
                            feedback={feedbackMessage[branch._id]}
                            hasChanges={hasChanges(original, branch)}
                            onCellChange={handleCellChange}
                            onView={handleViewBranch}
                            onUpdate={handleUpdate}
                            onRevert={handleRevertRow}
                            loading={loading || libraryLoading}
                        />
                    );
                })}
            </table>
        </div>
    );
};

export default UpdateBranch;