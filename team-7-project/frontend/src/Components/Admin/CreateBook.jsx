import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../authState/useAuth'; // Assumes useAuth is correctly exported
import bookApi from '../Api/bookApi'; // Assumes path to bookApi
import './Admin.css'

const CreateBook = (/*{parentSegment}*/) => {

    const { getToken } = useAuth();

    const [editedBookData, setEditedBookData] = useState({ //can be reused in the UpdateBook component
        title: '',
        author: '',
        publisher: '',
        genre: '',
        ISBN_10: '1111111111',
        ISBN_13: '0000000000000',
    });

    const [descriptionText, setDescriptionText] = useState('');
    const [coverFile, setCoverFile] = useState(null); // State to hold the filename string

    const [feedbackMessage, setFeedbackMessage] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setErr] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [genres, setGenres] = useState([]); // To store the list from the server


    useEffect(() => {
        const loadGenres = async () => {
            try {
                const list = await bookApi.getGenres();
                //console.log(list);
                // array before setting state
                const genreList = Array.isArray(list) ? list : [];
                setGenres(genreList);

                // default selection ONLY if genre is currently empty
                setEditedBookData(prev => {
                    if (!prev.genre && genreList.length > 0) {
                        return { ...prev, genre: genreList[0] };
                    }
                    return prev;
                });
            } catch (err) {
                console.error("Failed to load genres:", err);
                setErr("Could not load genre categories.");
            }
        };
        loadGenres();
    }, []); // Empty array means this runs ONLY on mount

    //Handlers (can mostly be resued in the UpdateBook component)
    const handleChange = name => event => {
        //separate handling for the description textarea
        if (name === 'description') {
            setDescriptionText(event.target.value);
            setFeedbackMessage(prev => ({ ...prev, description: undefined }));
        } else {
            setEditedBookData({ ...editedBookData, [name]: event.target.value });
            setFeedbackMessage(prev => ({ ...prev, [name]: undefined }));
        }
        setErr('');
        setSuccessMessage('');
    };


    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setCoverFile(file || null);
        setErr('');
        setSuccessMessage('');
        setFeedbackMessage(prev => ({ ...prev, coverFile: undefined }));

        // Temporarily store filename for display/validation (as in original file)
        setEditedBookData(prev => ({
            ...prev,
            cover: file ? file.name : ''
        }));
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setErr('');
        setSuccessMessage('');
        setFeedbackMessage({});

        //check for required file
        if (!coverFile) {

            setFeedbackMessage(prev => ({ ...prev, coverFile: 'Book cover image is required.' }));
            return;
        }
        setLoading(true);

        let descriptionFileName = null;
        let coverFileName = null;

        try {
            // UPLOAD COVER FILE
            const uploadResult = await bookApi.uploadCover(coverFile, getToken);
            // Result holds the UUID filename (e.g., "5f0d3b.jpg")
            coverFileName = uploadResult.coverFileName;

            if (!coverFileName) {
                throw new Error("File upload failed, no filename returned from server.");
            }


            //get the UUID base name without the extension (e.g., "5f0d3b")
            const lastDotIndex = coverFileName.lastIndexOf('.');
            const coverBaseName = lastDotIndex === -1 ? coverFileName : coverFileName.substring(0, lastDotIndex);

            //upload description text
            const finalDescriptionContent = descriptionText.trim() || "No Description";

            const descUploadResult = await bookApi.uploadDescription({
                descriptionContent: finalDescriptionContent,
                coverBaseName: coverBaseName // Pass the UUID base name to the server
            }, getToken);

            //final description path (e.g., "/documents/description/5f0d3b.txt")
            descriptionFileName = descUploadResult.descriptionFileName;

            if (!descriptionFileName) {
                throw new Error("Description file creation failed.");
            }

            // book entery
            const finalBookData = {
                ...editedBookData, // Use renamed state
                cover: coverFileName // Stores the UUID image file name
            };

            const result = await bookApi.create(finalBookData, getToken);

            setSuccessMessage(`Book "${result.title}" created successfully!`);

            // Clear form state and inputs
            setEditedBookData({ title: '', author: '', publisher: '', genre: '', ISBN_10: '', ISBN_13: '' });
            setDescriptionText(''); // Clear description text
            document.getElementById('cover-upload').value = null;
            setCoverFile(null);

        } catch (submitError) {
            setErr(submitError.message || 'Book creation failed. Attempting file removal...');


            let message = submitError.message || 'Book creation failed.'; //keep code for future use
            //thorough error messaging for client usability

            if (message.includes('validation failed') || message.includes('required')) {
                if (message.toLowerCase().includes('title')) {
                    setFeedbackMessage(prev => ({ ...prev, title: 'Title is required and must be unique.' }));
                } else if (message.toLowerCase().includes('author')) {
                    setFeedbackMessage(prev => ({ ...prev, author: 'Author is required.' }));
                }
                //Fallback
                setErr("Validation failed. Please check required fields.");

            } else {
                //global error message
                setErr(message);
            }
            let successfulCleanUp = '';
            if (descriptionFileName) {
                try {
                    await bookApi.removeCover(descriptionFileName, getToken);
                    // console.log('Description delete successful!');
                    successfulCleanUp += `Description file (${descriptionFileName.substring(0, 8)}...) removed. `;
                } catch (cleanupError) {
                    console.error('Description delete failed. Maunally inspect file:', cleanupError);
                }
            }
            // If the cover was uploaded but metadata failed, delete the cover file
            if (coverFileName) {
                try {
                    // Assuming removeCover deletes the file given its UUID filename
                    await bookApi.removeCover(coverFileName, getToken);
                    successfulCleanUp += `Cover file (${descriptionFileName.substring(0, 8)}...) removed. `;
                    //console.log('Cover delete successful!');
                } catch (cleanupError) {
                    console.error('Cover delete failed. Maunally inspect file:', cleanupError);
                }

            }
            if (successfulCleanUp) {
                message += ` Cleanup Status: ${successfulCleanUp.trim()}`;
            }
            setErr(message);
        } finally {
            setLoading(false);
        }
    }, [editedBookData, coverFile, descriptionText, getToken]);

    //Metadata render helper (left in for future reference)
    const renderInput = (name, label, type = 'text', required = false) => {
        const isError = feedbackMessage[name];
        const value = editedBookData[name];

        return (
            <div className="form-group">
                <label htmlFor={name} className="form-label">
                    {label} {required && <span className="required">*</span>}
                </label>
                <input
                    type={type}
                    id={name}
                    name={name}
                    value={value}
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
        const value = editedBookData[name];

        return (
            <div className="form-group">
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
        <div className="create-book-container">
            <h2 className="form-title">Add New Book</h2>

            {successMessage && <div className="info-box success-box">{successMessage}</div>}
            {error && <div className="info-box error-box">{error}</div>}

            <form onSubmit={handleSubmit} className="book-form">

                {/* Cover Upload */}
                <div className="form-section-group">
                    <div className="form-group cover-upload-group">
                        <label htmlFor="cover-upload" className="form-label">Book Cover (JPG, PNG, etc.) <span className="required">*</span></label>
                        <input
                            type="file"
                            id="cover-upload"
                            name="coverImage"
                            accept=".jpg,.jpeg,.png,.gif,.webp"
                            onChange={handleFileChange}
                            className={`form-input file-input ${feedbackMessage.coverFile ? 'input-error' : ''}`}
                            required
                        />
                        {coverFile && <p className="field-info">Selected: **{coverFile.name}**</p>}
                        {feedbackMessage.coverFile && <p className="field-feedback error-message">{feedbackMessage.coverFile}</p>} {/* <-- FIELD FEEDBACK */}
                    </div>
                </div>

                {/* Description Text Area */}
                <div className="form-section-group">
                    <div className="form-group large-textarea">
                        <label htmlFor="description" className="form-label">Book Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={descriptionText}
                            onChange={handleChange('description')}
                            rows="5"
                            className={`form-input textarea-input ${feedbackMessage.description ? 'input-error' : ''}`}
                            placeholder="Enter a detailed description for the book."
                        />
                        {feedbackMessage.description && <p className="field-feedback error-message">{feedbackMessage.description}</p>} {/* <-- FIELD FEEDBACK */}

                        {descriptionText.trim().length === 0 && (
                            <p className="field-info">Submitting empty text will store "No Description."</p>
                        )}
                    </div>
                </div>

                {/* Metadata Fields using the new renderInput helper */}
                <div className="form-section-group">
                    {renderInput('title', 'Title', 'text', true)}
                    {renderInput('author', 'Author', 'text', true)}
                    {renderInput('publisher', 'Publisher', 'text', true)}
                    {/* Swapped renderInput for renderSelect for Genre */}
                    {renderSelect('genre', 'Genre', genres, true)}
                    {renderInput('ISBN_10', 'ISBN-10', 'text', false)}
                    {renderInput('ISBN_13', 'ISBN-13', 'text', false)}
                </div>

                <div className="form-action-group">
                    <button type="submit" disabled={loading} className="button-primary">
                        {loading ? 'Creating...' : 'Create Book'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreateBook;