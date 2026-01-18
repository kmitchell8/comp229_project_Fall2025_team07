import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../StateProvider/authState/useAuth';
import { useLibrary } from '../StateProvider/libraryState/useLibrary';
import { useMedia } from '../StateProvider/mediaState/useMedia';
import mediaApi from '../Api/mediaApi';
import './Admin.css';

const CreateMedia = () => {
    const { getToken } = useAuth();

    // 1. Pulling refined IDs and data from Library Context
    const {
        branches = [],
        activeIds, // { libraryId, branchId }
        currentLibrary,
        currentBranch
    } = useLibrary();

    // 2. Pulling Configs and Refresh logic from Media Context
    const {
        mediaTypeConfigs,
        refreshMedia,
        genres: contextGenres = [],
        loading: contextLoading
    } = useMedia();

    const coverInputRef = React.useRef(null);
    const [mediaType, setMediaType] = useState('');

    // Initial state setup
    const [mediaData, setMediaData] = useState({
        title: '',
        genre: '',
        cover: ''
    });

    const [descriptionText, setDescriptionText] = useState('');
    const [coverFile, setCoverFile] = useState(null);
    const [feedbackMessage, setFeedbackMessage] = useState({}); // Restored for field-level feedback
    const [loading, setLoading] = useState(false);
    const [error, setErr] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const availableMediaTypes = useMemo(() => Object.keys(mediaTypeConfigs || {}), [mediaTypeConfigs]);
    const hasBranchContext = activeIds.branchId && 
                             activeIds.branchId !== 'all' && 
                             activeIds.branchId !== 'null';
    
    const isBranchSpecific = !!(hasBranchContext && currentBranch?._id);
    const isLibraryWide = !!(activeIds?.tenantId && !hasBranchContext);

    /**
     * EFFECT: Form Initialization
     * Syncs with context genres and media types when they load
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
     * EFFECT: Type Switch Cleanup
     * Prevents metadata from one media type leaking into another
     */
    useEffect(() => {
        setFeedbackMessage({});
        setErr('');
        setMediaData(prev => ({
            title: prev.title,
            genre: prev.genre,
            cover: prev.cover,
        }));
    }, [mediaType]);

    const hasChanges = useCallback(() => {
        if (mediaData.title.trim() !== '') return true;
        if (descriptionText.trim() !== '') return true;
        if (coverFile !== null) return true;

        const coreFields = ['title', 'genre', 'cover'];
        return Object.keys(mediaData).some(key =>
            !coreFields.includes(key) && mediaData[key]?.toString().trim() !== ''
        );
    }, [mediaData, descriptionText, coverFile]);

    // Universal Change Handler
    const handleChange = name => event => {
        const value = event.target.value;
        if (name === 'description') {
            setDescriptionText(value);
        } else {
            const dataKey = name.includes('.') ? name.split('.')[1] : name;
            setMediaData(prev => ({ ...prev, [dataKey]: value }));
        }
        // Clear specific feedback for this field as user types
        setFeedbackMessage(prev => ({ ...prev, [name]: undefined }));
        setErr('');
        setSuccessMessage('');
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setCoverFile(file || null);
        setMediaData(prev => ({ ...prev, cover: file ? file.name : '' }));
        setFeedbackMessage(prev => ({ ...prev, cover: undefined }));
    };

    const handleReset = useCallback(() => {
        setMediaData({
            title: '',
            genre: contextGenres[0] || '',
            cover: ''
        });
        setDescriptionText('');
        setCoverFile(null);
        if (coverInputRef.current) coverInputRef.current.value = "";
        setErr(null);
        setSuccessMessage(null);
        setFeedbackMessage({});
    }, [contextGenres]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setLoading(true);
        setErr('');

        let uploadedCover = null;
        let uploadedDesc = null;

        try {
            if (!coverFile) throw new Error("Cover image is required.");

            const coverRes = await mediaApi.uploadCover(coverFile, getToken);
            uploadedCover = coverRes.coverFileName;

            const coverBase = uploadedCover.split('.')[0];
            const descRes = await mediaApi.uploadDescription({
                descriptionContent: descriptionText.trim() || "No Description",
                coverBaseName: coverBase
            }, getToken);
            uploadedDesc = descRes.descriptionFileName;

            const payload = {
                mediaType,
                title: mediaData.title.trim(),
                genre: mediaData.genre,
                cover: uploadedCover,
                libraryId: activeIds.libraryId,
                branchId: mediaData.branchId || activeIds.branchId
            };

            const config = mediaTypeConfigs[mediaType] || [];
            config.forEach(field => {
                const dataKey = field.name.includes('.') ? field.name.split('.')[1] : field.name;
                if (['libraryid', 'branchid', 'title', 'genre'].includes(dataKey.toLowerCase())) return;

                let val = mediaData[dataKey];
                if ((field.type === 'list' || field.type === 'array') && typeof val === 'string') {
                    val = val.split(',').map(v => v.trim()).filter(v => v !== '');
                }
                if (field.type === 'number' && val) val = Number(val);
                if (val !== undefined && val !== '') payload[dataKey] = val;
            });

            await mediaApi.create(payload, getToken);
            setSuccessMessage(`Success! ${payload.title} has been added.`);
            refreshMedia();
            handleReset();

        } catch (err) {
            setErr(err.message);
            if (uploadedCover) await mediaApi.removeCover(uploadedCover, getToken).catch(console.error);
            if (uploadedDesc) await mediaApi.removeCover(uploadedDesc, getToken).catch(console.error);
        } finally {
            setLoading(false);
        }
    }, [mediaData, coverFile, descriptionText, mediaType, activeIds, mediaTypeConfigs, getToken, refreshMedia, handleReset]);
    // Keep comments: Sync mediaData with the active context
useEffect(() => {
    if (isBranchSpecific && currentBranch) {
        // For Branch Admins: Auto-fill both from the current context
        setMediaData(prev => ({
            ...prev,
            branchId: currentBranch._id,
            libraryId: currentBranch.libraryId || currentLibrary?._id
        }));
    } else if (isLibraryWide && currentLibrary) {
        // For Library Admins: Ensure the libraryId is set even if branch is still null
        setMediaData(prev => ({
            ...prev,
            libraryId: currentLibrary._id
        }));
    }
}, [isBranchSpecific, isLibraryWide, currentBranch, currentLibrary]);

    const renderField = (field) => {
    // Keep your original mapping exactly as it was
    const dataKey = field.name.includes('.') ? field.name.split('.')[1] : field.name;
    const label = field.label.includes('.') ? field.label.split('.')[1] : field.label;

    /**
     * Dynamic Context Checks
     * We normalize the IDs to handle cases where they might be strings like "null" or "all"
     */
    

    // 1. ADMINISTRATIVE ID FIELDS
    if (dataKey.toLowerCase() === 'branchid' || dataKey.toLowerCase() === 'libraryid') {

        // CASE A: Specific Branch View (Branch Admin or Library Admin looking at 1 branch)
        if (isBranchSpecific) {
            if (dataKey.toLowerCase() === 'branchid') {
                return (
                    <div className="form-group" key={field.name}>
                        <label className="form-label">Branch</label>
                        <input
                            className="form-input read-only-input"
                            value={currentBranch.name || "Assigned Branch"}
                            disabled
                        />
                    </div>
                );
            }
            if (dataKey.toLowerCase() === 'libraryid') {
                return (
                    <div className="form-group" key={field.name}>
                        <label className="form-label">Library System</label>
                        <input
                            className="form-input read-only-input"
                            value={currentLibrary?.name || "System"}
                            disabled
                        />
                    </div>
                );
            }
        }
        // CASE B: Library Admin View (Broad context - must select a branch)
        else if (isLibraryWide) {
            if (dataKey.toLowerCase() === 'branchid') {
                return (
                    <div className="form-group" key={field.name}>
                        <label className="form-label">Target Branch *</label>
                        <select
                            className="form-input"
                            value={mediaData.branchId || ''}
                            onChange={handleChange('branchId')}
                            required={field.required}
                        >
                            <option value="">-- Select Target Branch --</option>
                            {branches && branches.map(b => (
                                <option key={b._id} value={b._id}>{b.name}</option>
                            ))}
                        </select>
                        {feedbackMessage['branchId'] && <span className="feedback-error">{feedbackMessage['branchId']}</span>}
                    </div>
                );
            }
            if (dataKey.toLowerCase() === 'libraryid') {
                return (
                    <div className="form-group" key={field.name}>
                        <label className="form-label">Library System</label>
                        <input
                            className="form-input read-only-input"
                            value={currentLibrary?.name || "System"}
                            disabled
                        />
                    </div>
                );
            }
        }

        // Fallback: If no context, don't render these ID fields
        return null;
    }

    // 2. STANDARD METADATA FIELDS (Title, Author, etc.)
    return (
        <div className="form-group" key={field.name}>
            <label className="form-label">{label} {field.required && '*'}</label>
            <input
                type={field.type === 'number' ? 'number' : 'text'}
                className="form-input"
                placeholder={field.type === 'list' ? 'Comma separated list' : ''}
                value={mediaData[dataKey] || ''}
                onChange={handleChange(field.name)}
                required={field.required}
            />
            {feedbackMessage[field.name] && <span className="feedback-error">{feedbackMessage[field.name]}</span>}
        </div>
    );
};


    if (contextLoading && !availableMediaTypes.length) return <div>Loading Configuration...</div>;

    return (
        <div className="create-media-container">
            <h2 className="form-title">Add New Media</h2>
            {successMessage && <div className="info-box success-box">{successMessage}</div>}
            {error && <div className="info-box error-box">{error}</div>}

            <div className="media-type-selector">
                {availableMediaTypes.map(t => (
                    <button key={t} className={mediaType === t ? 'active' : ''} onClick={() => setMediaType(t)}>
                        {t.toUpperCase()}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="media-form">
                <div className="form-section-group">
                    <div className="form-group">
                        <label className="form-label">Genre</label>
                        <select className="form-input" value={mediaData.genre} onChange={handleChange('genre')}>
                            {contextGenres.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Title *</label>
                        <input className="form-input" value={mediaData.title} onChange={handleChange('title')} required />
                    </div>
                    {mediaTypeConfigs[mediaType]?.map(renderField)}
                </div>

                <div className="form-section-group">
                    <div className="form-group">
                        <label className="form-label">Cover Image *</label>
                        <div className="custom-file-upload">
                            <input type="file" id="cv" ref={coverInputRef} onChange={handleFileChange} className="hidden-file-input" accept="image/*" />
                            <label htmlFor="cv" className="file-upload-label">📁 {coverFile ? 'Change' : 'Select'} Cover</label>
                            {coverFile && <p className="field-info">Selected: {coverFile.name}</p>}
                        </div>
                    </div>
                    <div className="form-group large-textarea">
                        <label className="form-label">Description</label>
                        <textarea className="form-input" value={descriptionText} onChange={handleChange('description')} rows="4" />
                    </div>
                </div>

                <div className="form-action-group">
                    <button type="submit" disabled={loading || !hasChanges()} className="button-primary">
                        {loading ? 'Processing...' : 'Create Media'}
                    </button>
                    {/* Restored conditional glowing class 'has-changes' */}
                    <button
                        type="button"
                        onClick={handleReset}
                        className={`revert-btn ${hasChanges() ? 'has-changes' : ''}`}
                    >
                        ↺
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateMedia;