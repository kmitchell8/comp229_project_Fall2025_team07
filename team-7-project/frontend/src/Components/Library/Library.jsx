// Library.jsx - Improved version
import React, { useEffect, useState, useMemo } from 'react'
import './Library.css'
import bookApi from '../Api/bookApi'
//import { useAuth } from '../authState/useAuth'
//import {useNavigate} from 'react-router-dom'

const truncateText = (text, limit) => {
  if (!text) return "";
  return text.length > limit ? text.substring(0, limit) + "..." : text;
};

const Library = () => {
  //const [bookShelves, setBookShelves] = useState({});
  const [books, setBooks] = useState({});
  const [descriptions, setDescriptions] = useState({}); // { [bookId]: "Text content..." }
  const [expandedId, setExpandedId] = useState(null); // Tracks which book is currently "Read More"
  // const [loading, setLoading] = useState(true)
  //const [error, setError] = useState(null)
  //const { getToken } = useAuth()
  //const navigate = useNavigate();

  const handleShowDescription = async (book) => {
    //If we already have the text, just toggle it off (optional)
    if (descriptions[book._id]) {
      const newDescs = { ...descriptions };
      delete newDescs[book._id];
      setDescriptions(newDescs);
      return;
    }

    try {
      //Fetch using your new helper
      const text = await bookApi.getDescriptionText(book.description);

      //Save to state using the book's unique ID
      setDescriptions(prev => ({
        ...prev,
        [book._id]: text
      }));
    } catch (err) {
      console.error("Failed to load description:", err);
    }
  };

  /*
  useEffect(() => {
    const loadBooks = async () => {
      try {
        // setLoading(true)
        //setError(null)
        const books = await bookApi.list();
        //console.log('Sample Book Schema:', books[0]);

        if (!Array.isArray(books)) {
          throw new Error('Invalid response format')
        }

        if (books.length === 0) {
          setBookShelves({})
          //setLoading(false)
          return
        }

        // Group books by genre
        const groupedBooks = books.reduce((acc, book) => {
          // Normalize genre (capitalize first letter, handle variations)
          const genre = book.genre
            ? book.genre.charAt(0).toUpperCase() + book.genre.slice(1).toLowerCase()
            : 'Unknown'

          if (!acc[genre]) {
            acc[genre] = []
          }

          // Store the full book object, not just the title
          acc[genre].push({

            ...book, // This pulls in everything (id, isbn, description, etc.)
            id: book._id, // Renaming _id to id for easier use in React
            title: (book.title || 'Untitled book').trim(), // Keeping your formatting logic
            genre: genre, // Storing the "normalized" genre
            cover: book.cover
          })



          return acc
        }, {})

        setBookShelves(groupedBooks)
      } catch (error) {
        console.error('Error loading books:', error)
        //setError(error.message || 'Failed to load books')
      } finally {
        //setLoading(false)
      }
    }

    loadBooks()
  }, [])

  /*const handleView = (bookId) => { needed for later implimentation of book view
    // Navigate to a book details page using the bookId as a URL parameter
    navigate(`library/book/${bookId}`)
  }*/

  /*
const handleDelete = async (bookId) => {
  if (!window.confirm('Are you sure you want to delete this book?')) {
    return
  }


  try {
    await bookApi.deleteOne(bookId, getToken)

    const books = await bookApi.list()

    if (!Array.isArray(books)) {
      throw new Error('Invalid response format')
    }

    if (books.length === 0) {
      setBookShelves({})
      return
    }

    // Regroup books by genre
    const groupedBooks = books.reduce((acc, book) => {
      const genre = book.genre
        ? book.genre.charAt(0).toUpperCase() + book.genre.slice(1).toLowerCase()
        : 'Unknown'

      if (!acc[genre]) {
        acc[genre] = []
      }

      acc[genre].push({
        id: book._id,
        title: (book.title || 'Untitled book').trim(),
        author: book.author ? book.author.trim() : null,
        cover: book.cover
      })

      return acc
    }, {})

    setBookShelves(groupedBooks)
  } catch (error) {
    console.error('Error deleting book:', error)
    alert(`Failed to delete book: ${error.message}`)
  }
}

if (loading) {
  return <div className="library">Loading books...</div>
}

if (error) {
  return <div className="library">Error: {error}</div>
}

if (Object.keys(bookShelves).length === 0) {
  return <div className="library">No books found in the library.</div>
}
*/
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const data = await bookApi.list();
        if (Array.isArray(data)) {
          setBooks(data);
        }
      } catch (error) {
        console.error('Error fetching library:', error);
      }
    };
    loadBooks();
  }, []);


  // Derive grouped and sorted data (The "Shelves")
  // recalculates only when the 'books' array changes
  const shelfData = useMemo(() => {
    // Grouping & Normalization
    const currentBooks = Array.isArray(books) ? books : [];
    const grouped = currentBooks.reduce((acc, book) => {
      const rawGenre = book.genre || "Other";
      const genre = rawGenre.charAt(0).toUpperCase() + rawGenre.slice(1).toLowerCase();

      if (!acc[genre]) acc[genre] = [];

      acc[genre].push({
        ...book,
        id: book._id, // Standardizing id
        displayGenre: genre
      });
      return acc;
    }, {});

    // Sort books alphabetically by title within each genre
    Object.keys(grouped).forEach(genre => {
      grouped[genre].sort((a, b) =>
        (a.title || '').localeCompare(b.title || '')
      );
    });

    // Sort the genre names themselves alphabetically
    const sortedGenreNames = Object.keys(grouped).sort((a, b) =>
      a.localeCompare(b)
    );

    return { grouped, sortedGenreNames };
  }, [books]);

  return (
    <div className="library">
      {shelfData.sortedGenreNames.length === 0 ? (
        <div className="empty-state">
          <h2>Your library is currently empty.</h2>
        </div>
      ) : (

        shelfData.sortedGenreNames.map((genre) => (
          <div key={genre} className='genre-container'>
            <h1>{genre}</h1>
            <div className='books-container' >
              {/*books.map((book)*/
                shelfData.grouped[genre].map((book) => (
                  <div key={book.id} className='books-formatting'>
                    <img
                      src={bookApi.getCoverUrl(book.cover)}
                      alt={book.title}

                    />
                    <h2>{book.title}</h2>
                    <h3>{book.author}</h3>
                    <h4>
                      {book.publisher}
                      {book.ISBN_13 ? ` . ${book.ISBN_13}` : ''}
                      {book.ISBN_10 ? ` . ${book.ISBN_10}` : ''}
                    </h4>

                    <h4>{/*book.publisher*/}</h4>
                    <h4>{/*book.ISBN_10*/}</h4>
                    <h4>{/*book.ISBN_13/*}</h4>
                  <h4>{/*book.rating*/}</h4>

                    {descriptions[book._id] && (
                      <p className='books-description'>
                        {expandedId === book._id
                          ? descriptions[book._id]
                          : truncateText(descriptions[book._id], 150)
                        }

                        {descriptions[book._id].length > 150 && (
                          <button
                            className='books-readmore'
                            onClick={() => setExpandedId(expandedId === book._id ? null : book._id)}
                          >
                            {expandedId === book._id ? 'Show Less' : 'Read More'}
                          </button>
                        )}
                      </p>
                    )}
                    <button onClick={() => handleShowDescription(book)} >
                      {descriptions[book._id] ? 'Hide' : 'Description'}

                    </button>
                  </div>

                ))}
            </div>

          </div>
        ))
        /*<section key={genre} className="library__section">
          <h4>{genre}</h4>
          <div className="library__list">
            {books.map((book) => (
              <p key={book.id} className="library__book-item">
                <span className="library__book-title">{book.title}</span>
                {book.author && (
                  <span className="library__book-author"> by {book.author}</span>
                )}
                //{/*<button
               //   className="library__delete-button"
                //  onClick={() => handleDelete(book.id)}
                 // type="button"
              //  >
                //  Delete
                //</button>}
                <button
 
                  className="library__view-button"
                  //onClick={() => handleView(book.id)} //implimented later
                  type="button"
                >
                  View
                </button>
              </p>
            ))}
          </div>
        </section>*/
      )}
    </div>
  );
};

export default Library