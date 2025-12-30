import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../authState/useAuth'; // Assumes useAuth is correctly exported
import mediaApi from '../Api/mediaApi'; // Assumes path to mediaApi
import './Admin.css'

const CreateMedia = (/*{parentSegment}*/) => {

    const { getToken } = useAuth();
    const [mediaType, setMediaType] = useState('');
    const [mediaTypesConfig, setMediaTypesConfig] = useState({});
    const [mediaData, setMediaData] = useState({ //can be reused in the UpdateMedia component
        title: '',
        genre: '',
        cover: ''
        // managed dynamically via mediaTypesConfig
        /*author: '',
        publisher: '',
        ISBN_10: '',
        ISBN_13: '',
        director: '',
        studio: '',
        runtime: '',
        developer: '',
        platform: '',
        rating: ''*/
    });

    const [descriptionText, setDescriptionText] = useState('');
    const [coverFile, setCoverFile] = useState(null); // State to hold the filename string
    const [feedbackMessage, setFeedbackMessage] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setErr] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [genres, setGenres] = useState([]); // To store the list from the server
    const [availableMediaTypes, setAvailableMediaTypes] = useState([]);

    useEffect(() => {
        const loadGenres = async () => {
            try {
                const list = await mediaApi.getGenres();
                const genreList = Array.isArray(list) ? list : [];
                setGenres(genreList);

                setMediaData(prev => {
                    if (!prev.genre && genreList.length > 0) {
                        return { ...prev, genre: genreList[0] };
                    }
                    return prev;
                });
                // eslint-disable-next-line no-unused-vars
            } catch (err) {
                setErr("Could not load genre categories.");
            }
        };

        const loadMediaTypes = async () => {
            try {
                const data = await mediaApi.getMediaTypes();
                // data is now { "book": [...], "movie": [...] } per updated backend logic
                setMediaTypesConfig(data || {});

                const typeKeys = data ? Object.keys(data) : [];
                setAvailableMediaTypes(typeKeys);

                if (typeKeys.length > 0) {
                    setMediaType(typeKeys[0]);
                }
                // eslint-disable-next-line no-unused-vars
            } catch (err) {
                setErr("Could not load media type definitions.");
            }
        };

        loadGenres();
        loadMediaTypes();
    }, []);

    // Reset feedback and specific metadata when switching types to prevent "state pollution"
    useEffect(() => {
        setFeedbackMessage({});
        setErr('');
    }, [mediaType]);

    const handleChange = name => event => {
        if (name === 'description') {
            setDescriptionText(event.target.value);
        } else {
            setMediaData({ ...mediaData, [name]: event.target.value });
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
                setLoading(false); // Ensure loading stops if file is missing
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

            // PREPARE DATA DYNAMICALLY (Replaces hardcoded book/movie logic)
            // This ensures any new discriminators added to the backend work automatically
            const finalMediaData = {
                mediaType,
                title: mediaData.title,
                genre: mediaData.genre,
                cover: coverFileName,
            };

            // Inject only fields defined in the config for this specific type
            if (mediaTypesConfig[mediaType]) {
                mediaTypesConfig[mediaType].forEach(field => {
                    const value = mediaData[field.name];
                    if (value !== undefined && value !== '') {
                        finalMediaData[field.name] = value;
                    }
                });
            }

            const result = await mediaApi.create(finalMediaData, getToken);
            setSuccessMessage(`${mediaType.toUpperCase()} "${result.title}" created successfully!`);

            // Clear form state and inputs
            //setMediaData({ title: '', genre: genres[0] || '', author: '', publisher: '', director: '', studio: '', developer: '', platform: '' });
            setMediaData({
                title: '',
                genre: genres[0] || '',
                cover: ''
            });
            setDescriptionText('');
            if (document.getElementById('cover-upload')) document.getElementById('cover-upload').value = null;
            setCoverFile(null);

        } catch (submitError) {
            let message = submitError.message || 'Media creation failed.';

            // Refined error messaging for validation
            if (message.includes('validation failed') || message.includes('required')) {
                setErr("Validation failed. Please check the highlighted fields.");
                // Note: Feedback messages are usually mapped here based on server response keys
            } else {
                setErr(message);
            }

            let successfulCleanUp = '';
            if (descriptionFileName) {
                try {
                    await mediaApi.removeCover(descriptionFileName, getToken);
                    successfulCleanUp += `Description file (${descriptionFileName.substring(0, 8)}...) removed. `;
                } catch (cleanupError) {
                    console.error('Description delete failed:', cleanupError);
                }
            }
            if (coverFileName) {
                try {
                    await mediaApi.removeCover(coverFileName, getToken);
                    successfulCleanUp += `Cover file (${coverFileName.substring(0, 8)}...) removed. `;
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
    }, [mediaData, coverFile, descriptionText, mediaType, getToken, genres, mediaTypesConfig]);

    const renderInput = (name, label, type = 'text', required = false) => {
        const isError = feedbackMessage[name];
        const value = mediaData[name];

        return (
            <div className="form-group" key={name}>
                <label htmlFor={name} className="form-label">
                    {label} {required && <span className="required">*</span>}
                </label>
                <input
                    type={type}
                    id={name}
                    name={name}
                    value={value || ''}
                    onChange={handleChange(name)}
                    required={required}
                    disabled={loading}
                    className={`form-input ${isError ? 'input-error' : ''}`}
                />
                {isError && <p className="field-feedback error-message">{isError}</p>}
            </div>
        );
    };

    const renderSelect = (name, label, options, required = false) => {
        const isError = feedbackMessage[name];
        const value = mediaData[name];

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
                    {options.map(g => (
                        <option key={g} value={g}>{g}</option>
                    ))}
                </select>
                {isError && <p className="field-feedback error-message">{isError}</p>}
            </div>
        );
    };

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
                    {renderSelect('genre', 'Genre', genres, true)}
                    {renderInput('title', 'Title', 'text', true)}

                    {/* DYNAMIC FIELD RENDERING ENGINE */}
                    {mediaType && mediaTypesConfig[mediaType]?.map(field => {
                        // Handle Array/List types (e.g., platforms)
                        if (field.type === 'list') {
                            return (
                                <div className="form-group" key={field.name}>
                                    <label className="form-label">{field.label}</label>
                                    <input
                                        type="text"
                                        placeholder="Separate with commas"
                                        value={Array.isArray(mediaData[field.name]) ? mediaData[field.name].join(', ') : ''}
                                        onChange={(e) => {
                                            const values = e.target.value.split(',').map(v => v.trim());
                                            setMediaData({ ...mediaData, [field.name]: values });
                                        }}
                                        className="form-input"
                                        disabled={loading}
                                    />
                                </div>
                            );
                        }

                        // Handle Boolean/Checkbox types (e.g., multiplayer)
                        if (field.type === 'checkbox') {
                            return (
                                <div className="form-group checkbox-inline-group" key={field.name}>
                                    <div className="checkbox-wrapper">
                                        <input
                                            type="checkbox"
                                            id={field.name}
                                            checked={!!mediaData[field.name]}
                                            onChange={(e) => {
                                                setMediaData({ ...mediaData, [field.name]: e.target.checked });
                                            }}
                                            disabled={loading}
                                            className="form-checkbox"
                                        />
                                        <label htmlFor={field.name} className="checkbox-label-text">
                                            {field.label}
                                        </label>
                                    </div>
                                </div>
                            );
                        }
                        // Default to standard renderInput for text/number
                        return renderInput(field.name, field.label, field.type || 'text', field.required);
                    })}
                </div>

                <div className="form-section-group">
                    <div className="form-group cover-upload-group">
                        <label className="form-label">Media Cover <span className="required">*</span></label>
                        <div className="custom-file-upload">
                            <input type="file" id="cover-upload" accept=".jpg,.jpeg,.png,.gif,.webp" onChange={handleFileChange} className="hidden-file-input" required />
                            <label htmlFor="cover-upload" className="file-upload-label">
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
                    <button type="submit" disabled={loading} className="button-primary">{loading ? 'Creating...' : 'Create Media'}</button>
                </div>
            </form>
        </div>
    );
}

export default CreateMedia;