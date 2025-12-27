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
      )}
    </div>
  );
};

export default Library