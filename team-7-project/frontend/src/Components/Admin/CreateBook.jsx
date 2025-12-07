import React, { useState, useCallback } from 'react';
import { useAuth } from '../authState/useAuth'; // Assumes useAuth is correctly exported
import bookApi from '../Api/bookApi'; // Assumes path to bookApi


const CreateBook = (/*{parentSegment}*/) => {

    const { getToken } = useAuth();

    const [bookData, setBookData] = useState({
        title: '',
        author: '',
        publisher: '',
        genre: '',
        ISBN_10: '1111111111',
        ISBN_13: '0000000000000',
    });

    const [descriptionText, setDescriptionText] = useState('');
    const [coverFile, setCoverFile] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);


    //Handlers
    const handleChange = name => event => {
        if (name === 'description') {
            setDescriptionText(event.target.value);
        } else {
            setBookData({ ...bookData, [name]: event.target.value });
        }
        setError('');
        setSuccess('');
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setCoverFile(file || null);
        setError('');
        setSuccess('');

        //Set a temporary filename in state for validation/display (not necessary)
        setBookData(prev => ({
            ...prev,
            cover: file ? file.name : ''
        }));
    };

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!coverFile) {
            setError('Book cover image is required.');
            return;
        }
        setLoading(true);

        let descriptionFileName = null;//UUID.txt
        let coverFileName = null;//UUID.ext
        try {

            //upload cover file
            const uploadResult = await bookApi.uploadCover(coverFile, getToken);
            coverFileName = uploadResult.coverFileName;


            const lastDotIndex = coverFileName.lastIndexOf('.');
            const coverBaseName = lastDotIndex === -1 ? coverFileName : coverFileName.substring(0, lastDotIndex);

            if (!coverFileName) {
                throw new Error("File upload failed, no filename returned.");
            }

            const finalDescriptionContent = descriptionText.trim() || "No Description";

            //upload description file
            const descUploadResult = await bookApi.uploadDescription({
                descriptionContent: finalDescriptionContent,
                coverBaseName: coverBaseName // Pass the UUID base name to the server
            }, getToken);

            descriptionFileName = descUploadResult.descriptionFileName;

            if (!descriptionFileName) {
                throw new Error("Description file creation failed.");
            }
            const finalBookData = {
                ...bookData,
                cover: coverFileName        // Stores: "UUID.ext"

            };
            const result = await bookApi.create(finalBookData, getToken);

            setSuccess(`Book "${result.title}" created successfully!`);

            //clear form state and inputs
            setBookData({ title: '', author: '', publisher: '', genre: '', ISBN_10: '', ISBN_13: '' });
            document.getElementById('cover-upload').value = null;
            setCoverFile(null);

        } catch (error) {
            setError(error.message || 'Book creation failed. Removing book info...');
            if (coverFileName) {
                console.warn(`Attempting to delete: ${coverFileName}`);
                try {
                    await bookApi.removeCover(coverFileName, getToken);
                    console.log('Delete successful!');
                } catch (cleanupError) {
                    //If cleanup fails 
                    console.error('Delete failed:', cleanupError);
                    setError(prev => prev + ' (Cleanup failed, manually inspect file.)');
                }
            }
        } finally {
            setLoading(false);
        }
    }, [bookData, coverFile, descriptionText, getToken]);


    return (
        <div className="create-book-container">
            <h2 className="create-book-title">Add New Book</h2>

            {success && <div className="form-success">{success}</div>}
            {error && <div className="form-error">{error}</div>}

            <form onSubmit={handleSubmit} className="book-form">

                {/* Book Cover Upload */}
                <div className="form-group book-cover-group">
                    <label htmlFor="cover-upload" className="form-label">Book Cover (JPG, PNG, etc.) *</label>
                    <input
                        type="file"
                        id="cover-upload"
                        name="coverImage"
                        accept=".jpg,.jpeg,.png,.gif,.webp"
                        onChange={handleFileChange}
                        className="form-input file-input"
                    />
                    {coverFile && <p className="file-info">Selected: {coverFile.name}</p>}
                </div>
                {/* Description Text Area */}
                <div className="form-group">
                    <label htmlFor="description" className="form-label">Book Description</label>
                    <textarea
                        id="description"
                        name="description"
                        value={descriptionText}
                        onChange={handleChange('description')}
                        rows="5"
                        className="form-input textarea-input"
                        placeholder="Enter a detailed description for the book."
                    />
                    {descriptionText.trim().length === 0 && (
                        <p className="file-info">Submitting empty text will store "No Description."</p>
                    )}
                </div>
                {/* Title */}
                <div className="form-group">
                    <label htmlFor="title" className="form-label">Title *</label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        value={bookData.title}
                        onChange={handleChange('title')}
                        required
                        className="form-input"
                    />
                </div>

                {/* Author */}
                <div className="form-group">
                    <label htmlFor="author" className="form-label">Author *</label>
                    <input
                        type="text"
                        id="author"
                        name="author"
                        value={bookData.author}
                        onChange={handleChange('author')}
                        required
                        className="form-input"
                    />
                </div>

                {/* Publisher */}
                <div className="form-group">
                    <label htmlFor="publisher" className="form-label">Publisher *</label>
                    <input
                        type="text"
                        id="publisher"
                        name="publisher"
                        value={bookData.publisher}
                        onChange={handleChange('publisher')}
                        required
                        className="form-input"
                    />
                </div>

                {/* Genre */}
                <div className="form-group">
                    <label htmlFor="genre" className="form-label">Genre *</label>
                    <input
                        type="text"
                        id="genre"
                        name="genre"
                        value={bookData.genre}
                        onChange={handleChange('genre')}
                        required
                        className="form-input"
                    />
                </div>

                {/* ISBN-10 (Optional) */}
                <div className="form-group">
                    <label htmlFor="isbn10" className="form-label">ISBN-10</label>
                    <input
                        type="text"
                        id="isbn10"
                        name="ISBN_10"
                        value={bookData.ISBN_10}
                        onChange={handleChange('ISBN_10')}
                        className="form-input"
                    />
                </div>

                {/* ISBN-13 (Optional) */}
                <div className="form-group">
                    <label htmlFor="isbn13" className="form-label">ISBN-13</label>
                    <input
                        type="text"
                        id="isbn13"
                        name="ISBN_13"
                        //defaultValue={'0000000000000'}
                        value={bookData.ISBN_13}
                        onChange={handleChange('ISBN_13')}
                        className="form-input"
                    />
                </div>

                <button type="submit" disabled={loading} className="form-submit-button">
                    {loading ? 'Creating...' : 'Create Book'}
                </button>
            </form>
        </div>
    );
}

export default CreateBook;