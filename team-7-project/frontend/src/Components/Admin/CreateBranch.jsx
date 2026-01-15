import React, { useState, useCallback } from 'react';
import { useLibrary } from '../StateProvider/libraryState/useLibrary.jsx';
import { useUser } from '../StateProvider/userState/useUser.jsx';
import libraryApi from '../Api/libraryApi.jsx';
import { useAuth } from '../StateProvider/authState/useAuth';

const CreateBranch = () => {
    // Consume dynamic data from providers (Uniformity with Contact.jsx)
    const { activeIds, libraryDetails, refreshLibrary, currentLibrary } = useLibrary();
    const { countryData } = useUser();
    const { getToken } = useAuth();
    const branchSchema = libraryDetails.BRANCH;
    const [status, setStatus] = useState({ loading: false, error: null, showSuccess: false });
    const [feedbackMessage, setFeedbackMessage] = useState({});
    const [loading, setLoading] = useState(false);
    const countries = countryData?.countries || [];
    const regionalOptions = countryData?.regionalOptions || {};


    const [branchData, setBranchData] = useState({
        name: '',
        mainBranch: false,
        address: branchSchema.address.reduce((acc, f) => {
            // Pre-fill Canada as default to match Contact.jsx behavior
            if (f.name === 'Country') return { ...acc, [f.name]: 'Canada' };
            return { ...acc, [f.name]: f.default || '' };
        }, {})
    });

    /**
    * hasChanges: Branch Version
    * Uses nested check for the address object and skips default 'Canada'.
    */
    const hasChanges = useCallback(() => {
        // Check Top-Level fields (Name, Main Branch toggle)
        const topLevelChanged = Object.keys(branchData).some(key => {
            if (key === 'address') return false; // Handle address separately
            const val = branchData[key];
            // If it's the mainBranch boolean, check if it's been toggled to true
            if (key === 'mainBranch') return val === true;
            // For strings, check if they are not empty
            return typeof val === 'string' ? val.trim() !== '' : !!val;
        });

        if (topLevelChanged) return true;

        // Check the Nested Address Object
        const addressChanged = Object.keys(branchData.address).some(key => {
            const val = branchData.address[key];

            // Check against default country to prevent false positives
            if (key === 'Country' && val === 'Canada') return false;

            // Return true if any address field is filled
            return typeof val === 'string' ? val.trim() !== '' : !!val;
        });

        return addressChanged;
    }, [branchData]); // Dependent on branchData state
    const handleReset = useCallback(() => {
        // 1. Reset the branch state to original schema values
        setBranchData({
            name: '',
            mainBranch: false,
            address: branchSchema.address.reduce((acc, f) => ({
                ...acc,
                [f.name]: f.name === 'Country' ? 'Canada' : (f.default || '')
            }), {})
        });

        // 2. Clear all UI feedback and errors
        setFeedbackMessage({});
        setStatus({ loading: false, error: null, showSuccess: false });
    }, [branchSchema]);

    // Shared input handler for top-level and nested address fields
    const handleInputChange = name => (e) => {
        const { value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        // Clear individual error hint when user starts typing again
        if (feedbackMessage[name]) {
            setFeedbackMessage(prev => ({ ...prev, [name]: undefined }));
        }

        // Check if the field belongs to the address object or top level
        const isAddressField = branchSchema?.address?.some(f => f.name === name);
        if (isAddressField) {
            setBranchData(prev => ({
                ...prev,
                address: { ...prev.address, [name]: val }
            }));
        } else {
            setBranchData(prev => ({ ...prev, [name]: val }));
        }
    };

    /**
     * UNIFORM HELPER: Renders inputs with integrated feedback hints
     * Adapted from Contact.jsx to handle nested schema values
     */
    const renderInput = (name, label, type = 'text', required = false) => {
        const error = feedbackMessage[name];
        const isAddressField = branchSchema.address.some(f => f.name === name);
        const value = isAddressField ? branchData.address[name] : branchData[name];

        return (
            <div className="form-group" key={name}>
                <div className="label-row">
                    <label htmlFor={name}>{label}</label>
                    {error && <span className="error-hint">{error}</span>}
                </div>
                <input
                    id={name}
                    type={type}
                    // Handle checkbox 'checked' vs standard 'value'
                    value={type === 'checkbox' ? undefined : value}
                    checked={type === 'checkbox' ? value : undefined}
                    onChange={handleInputChange(name)}
                    required={required}
                    className={error ? 'input-error' : ''}
                />
            </div>
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ error: null, showSuccess: false });
        setLoading(true);

        const cleanLibraryId = activeIds?.tenantId;

        try {
            const payload = {
                ...branchData,
                libraryId: cleanLibraryId
            };

            // The API call (The backend Middleware handles the Main Branch sync)
            await libraryApi.createBranch(cleanLibraryId, payload, getToken);
            // Refresh Context (So the library address update shows up in the UI)
            await refreshLibrary();

            setBranchData({
                name: '',
                mainBranch: false,
                address: branchSchema.address.reduce((acc, f) => ({
                    ...acc,
                    [f.name]: f.name === 'Country' ? 'Canada' : (f.default || '')
                }), {})
            });

            // Trigger Success Modal
            setStatus({ loading: false, error: null, showSuccess: true });
            handleReset();
        } catch (err) {
            console.error("Failed to create branch:", err);
            setStatus({
                loading: false,
                error: err.payload?.error || err.message,
                showSuccess: false
            });
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="create-branch-container">

            <form className="branch-right" onSubmit={handleSubmit}>
                <h2 className="form-title">Add New Branch </h2>
                <p>Establishing new location for: <strong>{currentLibrary?.name || 'Loading...'}</strong></p>
                <small style={{ opacity: 0.6 }}>Tenant ID: {activeIds.tenantId}</small>
                {/* TOP LEVEL FIELDS: Dynamically mapped from schema */}
                {branchSchema.topLevel.map(f => renderInput(f.name, f.label, f.type, f.required))}

                <h3 className="form-sub-header">Location Details</h3>

                {/* ADDRESS GRID: Excludes Country/Province for special dynamic handling */}
                <div className="address-grid">
                    {branchSchema.address
                        .filter(f => !['Country', 'province'].includes(f.name))
                        .map(f => renderInput(f.name, f.label, 'text', f.required))
                    }
                </div>

                {/* DYNAMIC REGIONAL SELECTORS: Mirroring logic from Contact.jsx */}
                <div className="form-row">
                    <div className="form-group">
                        <label>Country</label>
                        <select value={branchData.address.Country} onChange={handleInputChange('Country')}>
                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Province / State</label>
                        {regionalOptions[branchData.address.Country] ? (
                            <select value={branchData.address.province} onChange={handleInputChange('province')}>
                                <option value="">Select...</option>
                                {regionalOptions[branchData.address.Country].map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={branchData.address.province}
                                onChange={handleInputChange('province')}
                                placeholder="Enter Province"
                            />
                        )}
                    </div>
                </div>

                <div className="form-action-group">
                    <button type="submit"
                        disabled={loading || !hasChanges()}
                        className={`button-primary ${!hasChanges() ? 'disabled' : ''}`}>
                        {status.loading ? 'Creating...' : 'Create Branch'}
                    </button>
                    <button
                        type="button"
                        className="revert-btn"
                        onClick={handleReset}
                        disabled={loading || !hasChanges()} // Only allow reset if there are changes
                    >
                        ↺
                    </button>
                </div>

                {status.error && <p className="error-hint" style={{ marginTop: '1rem' }}>{status.error}</p>}
            </form>

            {/* SUCCESS MODAL: Reused from Contact.jsx for UI consistency */}
            {status.showSuccess && (
                <div className="modal-overlay" onClick={() => window.location.hash = activeIds.tenantId}>
                    <div className="modal-content success-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-info">
                            <h1 className="success-title">Branch Created!</h1>
                            <hr />
                            <p className="modal-description">
                                <strong>{branchData.name}</strong> has been added to the library system.
                            </p>
                            <button className="modal-read-more" onClick={() => window.location.hash = activeIds.tenantId}>
                                Return to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateBranch;