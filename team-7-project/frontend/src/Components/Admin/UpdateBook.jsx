import React, { useState, useEffect, useCallback } from 'react';
import bookApi from '../Api/bookApi';
import { useAuth } from '../authState/useAuth';
import './Admin.css';

//For full code explanation see UpdateUser.jsx
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        // eslint-disable-next-line no-unused-vars
    } catch (e) {
        return dateString;
    }
};



const UpdateBook = (/*{pathId}/*{parentSegment}*/) => {

    const { role: userRole, getToken } = useAuth();
    const canUpdateBooks = userRole === 'admin';
    const canDeleteBooks = userRole === 'admin';

    const [feedbackMessage, setFeedbackMessage] = useState({});
    const [books, setBooks] = useState([]);
    const [editedBooks, setEditedBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setErr] = useState(null);

    const updatableBookKeys = ['title', 'author','publisher', 'ISBN_10', 'ISBN_13','quantity', 'genre', 'rated'];

    const columns = [
        { header: 'Title', key: 'title', fieldKey: 'title', editable: true, inputType: 'text' },
        { header: 'Author', key: 'author', fieldKey: 'author', editable: true, inputType: 'text' },
        { header: 'Publisher', key: 'publisher', fieldKey: 'publisher', editable: true, inputType: 'text' },
        { header: 'ISBN', key: 'ISBN_10', fieldKey: 'ISBN_10', editable: true, inputType: 'text' },
        { header: 'ISBN', key: 'ISBN_13', fieldKey: 'ISBN_13', editable: true, inputType: 'text' },
        { header: 'Genre', key: 'genre', fieldKey: 'genre', editable: true, inputType: 'text' },
        { header: 'Rated', key: 'rated', fieldKey: 'rated', editable: true, inputType: 'text' },
      //  { header: 'Quantity', key: 'quantity', fieldKey: 'quantity', editable: true, inputType: 'number' },
        { header: 'Added On', key: 'created', fieldKey: 'created', editable: false, format: formatDate },
    ];

    // Function to load book data from the API
    const loadBooks = useCallback(async () => {
        setLoading(true);
        setErr(null);
        setFeedbackMessage({});

        if (!canUpdateBooks) {
            setErr("Access Denied: Only administrators can view and update book data.");
            setLoading(false);
            return;
        }

        try {
            const data = await bookApi.list(getToken);
            setBooks(data);
            setEditedBooks(JSON.parse(JSON.stringify(data)));
        } catch (error) {
            setErr(error.message || "An unknown error occurred while listing books.");
        } finally {
            setLoading(false);
        }
    }, [getToken, canUpdateBooks]);

    useEffect(() => {
        loadBooks();
    }, [loadBooks]);

    const handleCellChange = useCallback((bookId, key, value) => {
        setEditedBooks(prevBooks => {
            return prevBooks.map(book => {
                if (book._id === bookId) {
                    const finalValue = key === 'quantity' ? Number(value) : value;
                    return { ...book, [key]: finalValue };
                }
                return book;
            });
        });
        setErr(null);
    }, []);

    const hasChanges = (originalBook, editedBook) => {
        return updatableBookKeys.some(key => {
            return String(originalBook[key]) !== String(editedBook[key]);
        });
    };

    const handleUpdate = async (bookId, bookTitle) => {
        const originalBook = books.find(b => b._id === bookId);
        const editedBook = editedBooks.find(b => b._id === bookId);

        if (!originalBook || !editedBook || !hasChanges(originalBook, editedBook)) {
            setFeedbackMessage(prev => ({ ...prev, [bookId]: { message: `No changes detected for book: ${bookTitle}.`, isError: false } }));
            return;
        }

        if (!canUpdateBooks) {
            setFeedbackMessage(prev => ({ ...prev, [bookId]: { message: `Authorization error: Must be an Admin to update books.`, isError: true } }));
            return;
        }

        const isConfirmed = window.confirm(
            `Are you sure you want to update book: ${bookTitle}? \n\nThis will save the detected changes.`
        );

        if (!isConfirmed) {
            setFeedbackMessage(prev => ({
                ...prev,
                [bookId]: { message: `Update for ${bookTitle} cancelled by admin.`, isError: false }
            }));
            return;
        }

        const updateData = updatableBookKeys.reduce((acc, key) => {
            acc[key] = editedBook[key];
            return acc;
        }, {});

        setFeedbackMessage(prev => {
            const newState = { ...prev };
            delete newState[bookId];
            return newState;
        });

        try {
            await bookApi.update(updateData, bookId, getToken);

            setBooks(prevBooks => prevBooks.map(b => b._id === bookId ? editedBook : b));

            setFeedbackMessage(prev => ({
                ...prev,
                [bookId]: { message: `Book ${bookTitle} updated successfully!`, isError: false }
            }));

        } catch (error) {
            console.error("Book update failed", error);
            const detailedMessage = `Update Failed: ${error.message || 'Unknown Error'}`;

            setFeedbackMessage(prev => ({
                ...prev,
                [bookId]: { message: detailedMessage, isError: true }
            }));
        }
    };

    //Handler for Delete Action
    const handleDelete = async (bookId, bookTitle) => {
        if (!canDeleteBooks) {
            setFeedbackMessage(prev => ({ ...prev, [bookId]: { message: `Authorization error: Must be an Admin to delete books.`, isError: true } }));
            return;
        }
        const bookToDelete = books.find(b => b._id === bookId);//need to get the book to get the cover file name
        const isConfirmed = window.confirm(
            `WARNING: Are you absolutely sure you want to DELETE book: "${bookTitle}"? \n\nThis action cannot be undone.`
        );

        if (!isConfirmed) {
            setFeedbackMessage(prev => ({
                ...prev,
                [bookId]: { message: `Deletion of ${bookTitle} cancelled.`, isError: false }
            }));
            return;
        }
        const coverFileName = bookToDelete.cover; //set the cover file name

        try {
            //Delete book data and book cover/description
            await bookApi.removeCover(coverFileName, getToken);
            await bookApi.remove(bookId, getToken);

            //Remove the book from the local state arrays
            setBooks(prevBooks => prevBooks.filter(b => b._id !== bookId));
            setEditedBooks(prevBooks => prevBooks.filter(b => b._id !== bookId));

            setFeedbackMessage(prev => ({
                ...prev,
                [bookId]: { message: `Book "${bookTitle}" successfully DELETED.`, isError: false }
            }));

        } catch (error) {
            console.error("Book deletion failed", error);
            const detailedMessage = `Deletion Failed: ${error.message || 'Unknown Error'}`;

            setFeedbackMessage(prev => ({
                ...prev,
                [bookId]: { message: detailedMessage, isError: true }
            }));
        }
    };

    const handleViewBook = (bookId, bookTitle) => {
        console.log(`[NAVIGATION PLACEHOLDER] Navigating to detail page for Book ID: ${bookId} (${bookTitle})`);
    };

    const ReloadListButton = () => {
        return (
            <button
                onClick={loadBooks}
                className="button-group reload-button"
                disabled={loading}
            >
                {loading ? 'Loading...' : 'Reload List'}
            </button>
        );
    };

    //RENDER STATES

    if (!canUpdateBooks) {
        return (
            <div className="info-box error-box">
                <h2>Unauthorized Access</h2>
                <p>You must be logged in as an **Admin** to view and modify the book directory.</p>
            </div>
        );
    }

    if (loading && books.length === 0) {
        return (
            <div className="loading-container">
                <p>Loading Book Data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="info-box error-box">
                <h2>Data Fetch Error</h2>
                <p>{error}</p>
                <p>Check your API status and network connection.</p>
                <ReloadListButton />
            </div>
        );
    }

    if (books.length === 0) {
        return (
            <div className="info-box empty-box">
                <p>No books found in the directory.</p>
                <ReloadListButton />
            </div>
        );
    }

    //MAIN TABLE RENDER
    return (
        <div className="book-table-container user-table-container">
            <div className="table-header-controls">
                <h1>Book Directory</h1>
                <ReloadListButton />
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
                <tbody>
                    {editedBooks.map((book, index) => {
                        const feedback = feedbackMessage[book._id];
                        const originalBook = books.find(b => b._id === book._id) || {};
                        const bookHasChanges = hasChanges(originalBook, book);

                        return (
                            <React.Fragment key={`book-${book._id || index}`}>
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
                                        const currentValue = book[col.fieldKey] || '';
                                        const isEditable = col.editable && canUpdateBooks;

                                        return (
                                            <td key={col.key}>
                                                {isEditable ? (
                                                    <input
                                                        type={col.inputType || 'text'}
                                                        value={currentValue}
                                                        onChange={(e) => handleCellChange(book._id, col.fieldKey, e.target.value)}
                                                        className="editable-input"
                                                        disabled={loading}
                                                    />
                                                ) : (
                                                    col.format ? col.format(currentValue) : currentValue
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="action-button-group-cell">
                                        <button
                                            className="button-group view-button"
                                            onClick={() => handleViewBook(book._id, book.title)}
                                            disabled={loading}
                                        >
                                            View
                                        </button>
                                        <button
                                            className={`button-group update-button ${bookHasChanges ? 'has-changes' : ''}`}
                                            onClick={() => handleUpdate(book._id, book.title)}
                                            disabled={loading || !bookHasChanges || !canUpdateBooks}
                                        >
                                            Update
                                        </button>
                                        {/* DELETE BUTTON */}
                                        <button
                                            className="button-group delete-button"
                                            onClick={() => handleDelete(book._id, book.title)}
                                            disabled={loading || !canDeleteBooks} // Disable if loading or not an Admin
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default UpdateBook;