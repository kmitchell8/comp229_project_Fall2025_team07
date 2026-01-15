import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../StateProvider/authState/useAuth'; // Assumes useAuth is correctly exported
import { useLibrary } from '../StateProvider/libraryState/useLibrary'; // Integrated for Branch/Library IDs
import { useMedia } from '../StateProvider/mediaState/useMedia'; // Context integration
import mediaApi from '../Api/mediaApi'; // Assumes path to mediaApi
import './Admin.css'

const CreateMedia = (/*{parentSegment}*/) => {

    const { getToken, user } = useAuth();
    // Consuming Library Context for the Gatekeeper logic
    const { 
        branches = [], 
        tenantId, 
        branchId: currentAuthBranchId,
        currentLibrary // Accessing current library directly to derive name
    } = useLibrary();

    // Consuming Media Context
    const {
        mediaTypeConfigs,
        refreshMedia,
        genres: contextGenres = [],
        loading: contextLoading
    } = useMedia();

    const coverInputRef = React.useRef(null);
    const [mediaType, setMediaType] = useState('');
    // mediaTypesConfig state removed as it is now provided by Context
    const [mediaData, setMediaData] = useState({ //can be reused in the UpdateMedia component
        title: '',
        genre: '',
        cover: '',
        // managed dynamically via mediaTypesConfig
        // Initializing with system IDs from providers using camelCase keys found in logs
        libraryId: tenantId || '',
        branchId: currentAuthBranchId || ''
    });

    const [descriptionText, setDescriptionText] = useState('');
    const [coverFile, setCoverFile] = useState(null); // State to hold the filename string
    const [feedbackMessage, setFeedbackMessage] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setErr] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    // local genres and availableMediaTypes states removed to use Context values

    // availableMediaTypes derived directly from context keys
    const availableMediaTypes = Object.keys(mediaTypeConfigs || {});

    //  Universal State Comparison Logic
    // This allows the button to enable/disable based on any field in the dynamic config
    const hasChanges = useCallback(() => {
        if (mediaData.title.trim() !== '') return true;
        if (descriptionText.trim() !== '') return true;
        if (coverFile !== null) return true;

        // Check if genre is different from the default first genre
        if (mediaData.genre !== (contextGenres[0] || '')) return true;

        // Check dynamic fields (anything that isn't title, genre, or cover)
        const dynamicKeys = Object.keys(mediaData).filter(k => !['title', 'genre', 'cover', 'libraryId', 'branchId'].includes(k));
        return dynamicKeys.some(key => {
            const val = mediaData[key];
            if (val === undefined || val === null) return false;
            // If it's a string, check if not empty. If it's boolean, check if true.
            return typeof val === 'string' ? val.trim() !== '' : !!val;
        });
    }, [mediaData, descriptionText, coverFile, contextGenres]);

    /**
     * EFFECT 1: Initialization logic for MediaType and Genre
     * This runs when context arrives but avoids the infinite loop by 
     * checking against state without depending on the whole mediaData object.
     */
    useEffect(() => {
        if (availableMediaTypes.length > 0 && !mediaType) {
            setMediaType(availableMediaTypes[0]);
        }
        if (contextGenres.length > 0 && !mediaData.genre) {
            setMediaData(prev => ({ ...prev, genre: contextGenres[0] }));
        }
    }, [availableMediaTypes, contextGenres, mediaType, mediaData.genre]);

    /**
     * EFFECT 2: Sync system IDs (Gatekeeper Logic)
     * Updates Library and Branch IDs and resolves parent Library for Branch Admins.
     */
    useEffect(() => {
        const activeBranchId = currentAuthBranchId || user?.managementAccess?.branchId;
        const foundBranch = branches.find(b => b._id === activeBranchId);
        const resolvedLibraryId = tenantId || foundBranch?.libraryId;

        if (resolvedLibraryId || activeBranchId) {
            setMediaData(prev => ({
                ...prev,
                libraryId: resolvedLibraryId || prev.libraryId,
                branchId: activeBranchId || prev.branchId
            }));
        }
    }, [tenantId, currentAuthBranchId, user, branches]);

    // Reset feedback and specific metadata when switching types to prevent "state pollution"
    useEffect(() => {
        setFeedbackMessage({});
        setErr('');

        // Clear dynamic fields when switching types to ensure clean state
        setMediaData(prev => ({
            title: prev.title,
            genre: prev.genre,
            cover: prev.cover,
            libraryId: prev.libraryId,
            branchId: prev.branchId
        }));
    }, [mediaType]);

    const handleChange = name => event => {
        if (name === 'description') {
            setDescriptionText(event.target.value);
        } else {
            // Handle "creator.xxx" dot notation while keeping the flat object structure
            const dataKey = name.includes('.') ? name.split('.')[1] : name;

            // FIX 1: Keep value as raw string during typing. 
            // This prevents the cursor jumping/trimming issues when typing lists with commas.
            setMediaData({ ...mediaData, [dataKey]: event.target.value });
        }
        setFeedbackMessage(prev => ({ ...prev, [name]: undefined }));
        setErr('');
        setSuccessMessage('');
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setCoverFile(file || null);
        setErr('');
        setSuccessMessage('');
        setFeedbackMessage(prev => ({ ...prev, coverFile: undefined }));

        setMediaData(prev => ({
            ...prev,
            cover: file ? file.name : ''
        }));
    };

    /**
     * handleReset: Reverts all media data and UI states
     * Clears files, dynamic metadata, and feedback messages.
     */
    const handleReset = useCallback(() => {
        const activeBranchId = currentAuthBranchId || user?.managementAccess?.branchId;
        const foundBranch = branches.find(b => b._id === activeBranchId);
        const resolvedLibraryId = tenantId || foundBranch?.libraryId;

        // Reset standard and dynamic media fields
        setMediaData({
            title: '',
            genre: contextGenres[0] || '',
            cover: '',
            libraryId: resolvedLibraryId || '',
            branchId: activeBranchId || ''
        });

        //  Clear text-based description
        setDescriptionText('');

        // Clear File states and the actual DOM input via Ref
        setCoverFile(null);
        if (coverInputRef.current) {
            coverInputRef.current.value = "";
        }

        // Clear all UI alerts
        setErr(null);
        setSuccessMessage(null);
        setFeedbackMessage({});
    }, [contextGenres, tenantId, currentAuthBranchId, user, branches]);


    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setErr('');
        setSuccessMessage('');
        setFeedbackMessage({});
        setLoading(true);

        let descriptionFileName = null;
        let coverFileName = null;

        try {
            // UPLOAD COVER FILE
            if (!coverFile) {
                setFeedbackMessage(prev => ({ ...prev, coverFile: 'Cover image is required.' }));
                setLoading(false);
                return;
            }
            const uploadResult = await mediaApi.uploadCover(coverFile, getToken);
            coverFileName = uploadResult.coverFileName;

            if (!coverFileName) {
                throw new Error("File upload failed, no filename returned from server.");
            }

            // UPLOAD DESCRIPTION
            const lastDotIndex = coverFileName.lastIndexOf('.');
            const coverBaseName = lastDotIndex === -1 ? coverFileName : coverFileName.substring(0, lastDotIndex);
            const finalDescriptionContent = descriptionText.trim() || "No Description";

            const descUploadResult = await mediaApi.uploadDescription({
                descriptionContent: finalDescriptionContent,
                coverBaseName: coverBaseName
            }, getToken);

            descriptionFileName = descUploadResult.descriptionFileName;
            if (!descriptionFileName) {
                throw new Error("Description file creation failed.");
            }

            // PREPARE DATA DYNAMICALLY
            const finalMediaData = {
                mediaType,
                title: mediaData.title.trim(),
                genre: mediaData.genre,
                cover: coverFileName,
                // Using camelCase mapping consistent with logs
                libraryId: mediaData.libraryId,
                branchId: mediaData.branchId
            };

            // Inject only fields defined in the config for this specific type
            if (mediaTypeConfigs[mediaType]) {
                mediaTypeConfigs[mediaType].forEach(field => {
                    const dataKey = field.name.includes('.') ? field.name.split('.')[1] : field.name;
                    
                    // Skip keys already explicitly handled above (using case-insensitive check)
                    if (dataKey.toLowerCase() === 'libraryid' || dataKey.toLowerCase() === 'branchid') return;

                    let value = mediaData[dataKey];

                    // Transform string into array ONLY at submission time
                    if ((field.type === 'list' || field.type === 'array') && typeof value === 'string') {
                        value = value.split(',').map(v => v.trim()).filter(v => v !== '');
                    }
                    // Handle numbers/booleans if needed for the engine
                    if (field.type === 'number' || field.type === 'integer') value = Number(value);

                    if (value !== undefined && value !== '') {
                        finalMediaData[dataKey] = value;
                    }
                });
            }

            const result = await mediaApi.create(finalMediaData, getToken);
            setSuccessMessage(`${mediaType.toUpperCase()} "${result.title}" created successfully!`);

            // Refresh Library context to include new item
            refreshMedia();
            // Reset Form
            handleReset();

        } catch (submitError) {
            let message = submitError.message || 'Media creation failed.';

            if (message.includes('validation failed') || message.includes('required')) {
                setErr("Validation failed. Please check the highlighted fields.");
            } else {
                setErr(message);
            }

            // Logic to remove orphaned files if the final metadata creation fails
            let successfulCleanUp = '';
            if (descriptionFileName) {
                try {
                    await mediaApi.removeCover(descriptionFileName, getToken);
                    successfulCleanUp += `Description file removed. `;
                } catch (cleanupError) {
                    console.error('Description delete failed:', cleanupError);
                }
            }
            if (coverFileName) {
                try {
                    await mediaApi.removeCover(coverFileName, getToken);
                    successfulCleanUp += `Cover file removed. `;
                } catch (cleanupError) {
                    console.error('Cover delete failed:', cleanupError);
                }
            }
            if (successfulCleanUp) {
                setErr(`${message} Cleanup Status: ${successfulCleanUp.trim()}`);
            } else {
                setErr(message);
            }
        } finally {
            setLoading(false);
        }
    }, [mediaData, coverFile, descriptionText, mediaType, getToken, handleReset, mediaTypeConfigs, refreshMedia]);

    const renderInput = (name, label, type = 'text', required = false, disabled = false, overrideValue = null) => {
        // Clean up "creator.xxx" labels for display
        const displayLabel = label.includes('.') ? label.split('.')[1] : label;
        const dataKey = name.includes('.') ? name.split('.')[1] : name;

        const isError = feedbackMessage[name];
        // Use overrideValue if provided (like for Library Name), otherwise use state
        const value = overrideValue !== null ? overrideValue : mediaData[dataKey];

        return (
            <div className="form-group" key={name}>
                <label htmlFor={name} className="form-label">
                    {displayLabel} {required && <span className="required">*</span>}
                </label>
                <input
                    type={type}
                    id={name}
                    name={name}
                    value={value || ''}
                    onChange={handleChange(name)}
                    required={required}
                    disabled={loading || disabled}
                    className={`form-input ${isError ? 'input-error' : ''} ${disabled ? 'read-only-input' : ''}`}
                />
                {isError && <p className="field-feedback error-message">{isError}</p>}
            </div>
        );
    };

    const renderSelect = (name, label, options = [], required = false) => {
        const isError = feedbackMessage[name];
        const value = mediaData[name] || (name === 'genre' ? contextGenres[0] : '');

        return (
            <div className="form-group" key={name}>
                <label htmlFor={name} className="form-label">
                    {label} {required && <span className="required">*</span>}
                </label>
                <select
                    id={name}
                    name={name}
                    value={value}
                    onChange={handleChange(name)}
                    disabled={loading}
                    className={`form-input ${isError ? 'input-error' : ''}`}
                >
                    {/* Guard for options.map to prevent crash on undefined */}
                    {Array.isArray(options) && options.map(g => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>
                {isError && <p className="field-feedback error-message">{isError}</p>}
            </div>
        );
    };

    // Prevent rendering until critical config is loaded
    if (contextLoading && availableMediaTypes.length === 0) {
        return <div className="create-media-container"><h2>Loading form configuration...</h2></div>;
    }

    return (
        <div className="create-media-container">
            <h2 className="form-title">Add New Media</h2>

            {successMessage && <div className="info-box success-box">{successMessage}</div>}
            {error && <div className="info-box error-box">{error}</div>}

            <div className="media-type-selector">
                {availableMediaTypes.map(typeName => (
                    <button
                        key={typeName}
                        type="button"
                        className={mediaType === typeName ? 'active' : ''}
                        onClick={() => setMediaType(typeName)}
                    >
                        {typeName.charAt(0).toUpperCase() + typeName.slice(1)}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="media-form">
                <div className="form-section-group">
                    {renderSelect('genre', 'Genre', contextGenres, true)}
                    {renderInput('title', 'Title', 'text', true)}

                    {/* DYNAMIC FIELD RENDERING ENGINE WITH CASE-INSENSITIVE GATEKEEPER */}
                    {mediaType && mediaTypeConfigs[mediaType]?.map(field => {
                        const dataKey = field.name.includes('.') ? field.name.split('.')[1] : field.name;

                        // GATEKEEPER: INTERCEPT BRANCHID (Lock if specific branch is resolved)
                        if (dataKey.toLowerCase() === 'branchid') {
                            const activeBranchId = currentAuthBranchId || user?.managementAccess?.branchId;
                            const currentBranch = branches.find(b => b._id === activeBranchId);

                            if (activeBranchId) {
                                // BRANCH ADMIN VIEW: Render as locked/uneditable text input
                                return renderInput(field.name, "Target Branch", 'text', false, true, currentBranch?.name || "My Branch");
                            }

                            // LIBRARY ADMIN VIEW: Show standard dropdown
                            return (
                                <div className="form-group" key={field.name}>
                                    <label className="form-label">Target Branch {field.required && <span className="required">*</span>}</label>
                                    <select 
                                        value={mediaData.branchId} 
                                        onChange={handleChange('branchId')}
                                        className="form-input"
                                        disabled={loading}
                                        required={field.required}
                                    >
                                        <option value="">-- Select Branch --</option>
                                        {branches.map(b => (
                                            <option key={b._id} value={b._id}>
                                                {b.name} {b.mainBranch ? '(Main)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            );
                        }

                        // GATEKEEPER: INTERCEPT LIBRARYID (Render Library NAME instead of ID - ALWAYS LOCKED)
                        if (dataKey.toLowerCase() === 'libraryid') {
                            // Derive name directly from the currentLibrary object in context
                            const libName = currentLibrary?.name || currentLibrary?.tenantName || "System Library";
                            return renderInput(field.name, "Library System", 'text', false, true, libName);
                        }

                        // Handle Array/List types (e.g., platforms)
                        if (field.type === 'list' || field.type === 'array') {
                            return (
                                <div className="form-group" key={field.name}>
                                    <label className="form-label">{field.label.includes('.') ? field.label.split('.')[1] : field.label}</label>
                                    <input
                                        type="text"
                                        placeholder="Separate with commas"
                                        // Note: Keeping it as a string from mediaData for smooth typing
                                        value={mediaData[dataKey] || ''}
                                        onChange={handleChange(field.name)}
                                        className="form-input"
                                        disabled={loading}
                                    />
                                </div>
                            );
                        }

                        // Handle Boolean/Checkbox types
                        if (field.type === 'checkbox' || field.type === 'boolean') {
                            return (
                                <div className="form-group checkbox-inline-group" key={field.name}>
                                    <div className="checkbox-wrapper">
                                        <input
                                            type="checkbox"
                                            id={field.name}
                                            checked={!!mediaData[dataKey]}
                                            onChange={(e) => {
                                                setMediaData({ ...mediaData, [dataKey]: e.target.checked });
                                            }}
                                            disabled={loading}
                                            className="form-checkbox"
                                        />
                                        <label htmlFor={field.name} className="checkbox-label-text">
                                            {field.label.includes('.') ? field.label.split('.')[1] : field.label}
                                        </label>
                                    </div>
                                </div>
                            );
                        }
                        return renderInput(field.name, field.label, field.type || 'text', field.required);
                    })}
                </div>

                <div className="form-section-group">
                    <div className="form-group cover-upload-group">
                        <label className="form-label">Media Cover <span className="required">*</span></label>
                        <div className="custom-file-upload">
                            <input
                                type="file" 
                                id="cover-upload"
                                ref={coverInputRef}
                                accept=".jpg,.jpeg,.png,.gif,.webp"
                                onChange={handleFileChange}
                                className="hidden-file-input"
                                required
                            />
                            <label  htmlFor="cover-upload" className="file-upload-label">
                                <span className="upload-icon">📁</span>
                                {coverFile ? 'Change Cover' : 'Choose Cover File'}
                            </label>
                            {coverFile && <div className="file-preview-zone"><p className="field-info">Selected: <strong>{coverFile.name}</strong></p></div>}
                        </div>
                        {feedbackMessage.coverFile && <p className="field-feedback error-message">{feedbackMessage.coverFile}</p>}
                    </div>
                </div>

                <div className="form-section-group">
                    <div className="form-group large-textarea">
                        <label htmlFor="description" className="form-label">Media Description</label>
                        <textarea id="description" value={descriptionText} onChange={handleChange('description')} rows="5" className="form-input textarea-input" />
                    </div>
                </div>

                <div className="form-action-group">
                    <button
                        type="submit"
                        disabled={loading || !hasChanges()}
                        className={`button-primary ${!hasChanges() ? 'disabled' : ''}`}
                    >
                        {loading ? 'Creating...' : 'Create Media'}
                    </button>
                    <button
                        type="button"
                        className="revert-btn"
                        onClick={handleReset}
                        disabled={loading || !hasChanges()}
                    >
                        ↺
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreateMedia;