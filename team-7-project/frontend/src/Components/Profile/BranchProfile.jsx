import React, { useRef, useEffect, useMemo } from 'react';
import { useLibrary } from '../StateProvider/libraryState/useLibrary.jsx';
import libraryApi from '../Api/libraryApi.jsx';
import './Profile.css'; // Reusing your existing Profile styles for consistency

/**
 * CONFIGURATION: Single Source of Truth for Branch Address Fields
 * Matches the structure of the branch object in database.
 */
const ADDRESS_FIELD_CONFIG = [
    { id: 'street', label: 'Street Address', fullWidth: true },
    { id: 'addressLineTwo', label: 'Address Line 2', fullWidth: false },
    { id: 'city', label: 'City', fullWidth: false },
    { id: 'postalCode', label: 'Postal / Zip Code', fullWidth: false },
];

const BranchProfile = ({ branchId = null }) => {
    // Consume context from LibraryProvider
    const {
        libraryDetails,
        isEditing,
        setIsEditing,
        isSaving,
        loading,
        coverPreview,
        countryData,
        hasChanges,
        handleInputChange, // Assuming LibraryProvider handles nested branch updates
        submitBranchUpdates,
        resetLocalStates,
        onCoverSelected,
        handleImgError
    } = useLibrary();


    /**
     * 1. Resets editing states when switching between branches.
     * 2. Cleans up any blob previews or unsaved data on unmount.
     */
    useEffect(() => {
        // The LibraryProvider handles the data reset when branchId changes.
        // Calling it here creates the infinite loop.
        
        setIsEditing(false); // Default to view-only mode when first opening

        return () => {
            // Only clean up the UI toggle on unmount
            setIsEditing(false);
        };
    }, [branchId, setIsEditing]); // Removed resetLocalStates from dependencies

    // Find the specific branch data from the library details
    const branchData = useMemo(() => {
        return libraryDetails?.branches?.find(b => b._id === branchId) || {};
    }, [libraryDetails, branchId]);

    const coverInputRef = useRef(null);

    // Guard: Loading state
    if (loading) {
        return <div className="loading-container">Loading Branch Details...</div>;
    }

    // Visual Logic: Preview > DB Image > Default
    const coverPath = coverPreview || libraryApi.getImages(branchData.coverImage || 'branch_default_cover');

    const handleCoverClick = () => {
        if (isEditing) coverInputRef.current.click();
    };

    const handleUpdateSubmit = async () => {
        await submitBranchUpdates(branchId);
    };

    const onRevert = () => {
        resetLocalStates();
        setIsEditing(true);
    };

    return (
        <div className={`media ${isSaving ? 'processing-blur' : ''}`}>
            {/* Hidden Input for Cover Upload */}
            <input 
                type="file" 
                ref={coverInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={(e) => onCoverSelected(e, branchId)} 
            />

            <main className="media-type">
                <div className="media-split-container">

                    {/* LEFT PANE: Visuals (Cover Only) */}
                    <aside className="media-visual-pane">
                        <div
                            className={`media-cover-frame ${isEditing ? 'clickable-edit' : ''}`}
                            onClick={handleCoverClick}
                            //style={{ marginBottom: '20px' }} // Spacing since avatar is gone
                        >
                            <img
                                src={coverPath}
                                alt="Branch Cover"
                                onError={(e) => handleImgError(e, 'cover')}
                            />
                            {isEditing && <div className="edit-hint-overlay">Change Branch Photo</div>}
                        </div>

                        <div className="media-action-bar">
                            {!isEditing ? (
                                <button className="media-back-btn" onClick={() => setIsEditing(true)}>
                                    Edit Branch
                                </button>
                            ) : (
                                <div className="edit-actions-group">
                                    <button
                                        className="media-back-btn cancel-btn"
                                        onClick={resetLocalStates}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className={`admin-edit-toggle save-btn ${hasChanges ? 'has-changes' : ''}`}
                                        onClick={handleUpdateSubmit}
                                        disabled={isSaving || !hasChanges}
                                    >
                                        {isSaving ? 'Saving...' : 'Save Branch'}
                                    </button>
                                    <button
                                        className="button-group revert-btn"
                                        onClick={onRevert}
                                        disabled={!hasChanges || loading}
                                        title="Discard unsaved changes"
                                    >
                                        ↺
                                    </button>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* RIGHT PANE: Branch Identity & Address */}
                    <section className="media-info-pane">
                        <div className="media-title-area">
                            <h1>{branchData.branchName || 'New Branch'}</h1>
                            <span className="media-badge">Branch Status: {branchData.status || 'Active'}</span>
                        </div>

                        <div className="media-details-grid">
                            {/* Branch Name Input */}
                            <div className="detail-entry full-width">
                                <label>Branch Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={branchData.branchName || ''}
                                        onChange={(e) => handleInputChange(e, 'branchName', false, branchId)}
                                        className="editable-input"
                                    />
                                ) : (
                                    <p>{branchData.branchName}</p>
                                )}
                            </div>

                            {/* Branch Email/Contact */}
                            <div className="detail-entry">
                                <label>Branch Contact Email</label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        value={branchData.email || ''}
                                        onChange={(e) => handleInputChange(e, 'email', false, branchId)}
                                        className="editable-input"
                                    />
                                ) : (
                                    <p>{branchData.email || "No email assigned"}</p>
                                )}
                            </div>

                            {/* ADDRESS SECTION */}
                            {ADDRESS_FIELD_CONFIG.map((field) => (
                                <div key={field.id} className={`detail-entry ${field.fullWidth ? 'full-width' : ''}`}>
                                    <label>{field.label}</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={branchData.address?.[field.id] || ''}
                                            onChange={(e) => handleInputChange(e, field.id, true, branchId)}
                                            className="editable-input"
                                        />
                                    ) : (
                                        <p>{branchData.address?.[field.id] || '---'}</p>
                                    )}
                                </div>
                            ))}

                            {/* Country & Province Selects */}
                            <div className="detail-entry">
                                <label>Country</label>
                                {isEditing ? (
                                    <select
                                        value={branchData.address?.Country || 'Canada'}
                                        onChange={(e) => handleInputChange(e, 'Country', true, branchId)}
                                        className="editable-input"
                                    >
                                        {countryData.countries.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                ) : (
                                    <p>{branchData.address?.Country}</p>
                                )}
                            </div>

                            <div className="detail-entry">
                                <label>State / Province</label>
                                {isEditing ? (
                                    <select
                                        value={branchData.address?.province || ''}
                                        onChange={(e) => handleInputChange(e, 'province', true, branchId)}
                                        className="editable-input"
                                    >
                                        <option value="">Select...</option>
                                        {countryData.regionalOptions[branchData.address?.Country || 'Canada']?.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <p>{branchData.address?.province}</p>
                                )}
                            </div>
                        </div>

                        {/* BRANCH INVENTORY SUMMARY */}
                        <div className="media-full-description">
                            <h2>Branch Inventory Summary</h2>
                            <div className="description-separator"></div>
                            <div className="library-stats-container">
                                <div className="detail-entry">
                                    <label>Total Media</label>
                                    <p><strong>{branchData.inventory?.length || 0}</strong> Items</p>
                                </div>
                                <div className="detail-entry">
                                    <label>Manager</label>
                                    <p>{branchData.managerName || 'Unassigned'}</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* DEBUG FOOTER */}
                <footer className="media-full-description debug-footer">
                    <h2>Branch Debug Info</h2>
                    <div className="description-separator"></div>
                    <div className="text-content">
                        <p><strong>Branch ID:</strong> {branchId}</p>
                        <p><strong>Parent Library:</strong> {libraryDetails?.name}</p>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default BranchProfile;