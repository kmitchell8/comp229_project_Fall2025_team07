// Library.jsx - Improved version
import React, { useEffect, useState, useMemo } from 'react'
import './Library.css'
import bookApi from '../Api/bookApi'
import LibraryNavBar from '../Navbar/LibraryNavBar';
//import { useAuth } from '../authState/useAuth'
//import {useNavigate} from 'react-router-dom'

const truncateText = (text, limit) => {
  if (!text) return "";
  return text.length > limit ? text.substring(0, limit) + "..." : text;
};

const Library = () => {
  //const [bookShelves, setBookShelves] = useState({});
  const [books, setBooks] = useState([]);
  const [descriptions, setDescriptions] = useState({}); // { [bookId]: "Text content..." }
  const [expandedId, setExpandedId] = useState(null); // Tracks which book is currently "Read More"
  const [viewMode, setViewMode] = useState('genre'); // 'genre' or 'alphabetical'
  const [sortBy, setSortBy] = useState('title');   // 'title' or 'author'
  const [showButton, setShowButton] = useState(false); // New state for button visibility
  const [isScrolled, setIsScrolled] = useState(false);//scrolling navbar
  const [searchTerm, setSearchTerm] = useState(""); // search
  // const [loading, setLoading] = useState(true)
  //const [error, setError] = useState(null)
  //const { getToken } = useAuth()
  //const navigate = useNavigate();


  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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


  // API Load
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const data = await bookApi.list();
        if (Array.isArray(data)) setBooks(data);
      } catch (error) {
        console.error('Error fetching library:', error);
      }
    };
    loadBooks();
  }, []);



  // Derive grouped and sorted data (The "Shelves")
  // recalculates only when the 'books' array changes
  // Derive grouped and sorted data (The "Shelves")
  // recalculates only when the 'books' array changes
  const shelfData = useMemo(() => {
    const currentBooks = Array.isArray(books) ? books : [];

    // FILTER: Narrow down books based on search
    const filteredBooks = currentBooks.filter(book => {
      const title = (book.title || "").toLowerCase();
      const author = (book.author || "").toLowerCase();
      const search = searchTerm.toLowerCase();

      return title.includes(search) || author.includes(search);
    });

    //HELPER: Handle authors with suffixes (Jr, Sr, III) for last-name sorting
    const suffixes = ['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v', 'esq', 'phd'];
    const getLastName = (fullName) => {
      if (!fullName) return "";
      const parts = fullName.trim().split(/\s+/);
      if (parts.length <= 1) return parts[0].toLowerCase();

      let lastIndex = parts.length - 1;
      // If the last word is a suffix, look at the word before it
      if (suffixes.includes(parts[lastIndex].toLowerCase()) && parts.length > 1) {
        lastIndex--;
      }
      return parts[lastIndex].toLowerCase();
    };

    // Grouping Logic
    const grouped = filteredBooks.reduce((acc, book) => {
      let key;

      if (viewMode === 'genre') {
        // Group by Genre Name
        const rawGenre = book.genre || "Other";
        key = rawGenre.charAt(0).toUpperCase() + rawGenre.slice(1).toLowerCase();
      } else {
        // Group by the first letter of Title or Author
        // If sorting by author, use the last name's first letter for the shelf key
        let sortValue = (book[sortBy] || "#").trim();

        if (sortBy === 'author') {
          sortValue = getLastName(sortValue);
        }

        key = sortValue.charAt(0).toUpperCase();

        // If the first character isn't a letter (like a number or symbol), group under "#"
        if (!/[A-Z]/.test(key)) key = "#";
      }

      if (!acc[key]) acc[key] = [];
      acc[key].push({ ...book, id: book._id });
      return acc;
    }, {});

    // Sorting Books inside the shelves
    Object.keys(grouped).forEach(shelf => {
      grouped[shelf].sort((a, b) => {
        // Handle Author by Last Name
        if (sortBy === 'author') {
          const authorA = getLastName(a.author);
          const authorB = getLastName(b.author);

          // If last names are the same, sort by first name (the whole string)
          if (authorA === authorB) {
            return (a.author || "").localeCompare(b.author || "");
          }
          return authorA.localeCompare(authorB);
        }

        // Default Title sorting
        const valA = (a[sortBy] || '').toLowerCase();
        const valB = (b[sortBy] || '').toLowerCase();
        return valA.localeCompare(valB);
      });
    });

    // Sorting the Shelves themselves
    // Ensures "#" comes first, then A-Z
    const sortedNames = Object.keys(grouped).sort((a, b) => {
      if (a === "#") return -1;
      if (b === "#") return 1;
      return a.localeCompare(b);
    });

    return {
      grouped: grouped || {},
      sortedNames: sortedNames || []
    };
  }, [books, viewMode, sortBy, searchTerm]);


  // Scroll listener logic
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowButton(true);
      } else {
        setShowButton(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    /* if (window.location.hash) {
       window.history.pushState(null, null, window.location.pathname);
     }*/
  };

  useEffect(() => {
    // Check if we have a hash and if books have finally arrived
    const hash = window.location.hash;
    if (hash && shelfData.sortedNames.length > 0) {

      const scrollToTarget = () => {
        const targetId = decodeURIComponent(hash.replace('#', ''));
        const element = document.getElementById(targetId);

        if (element) {
          // Use 'auto' instead of 'smooth' for the refresh jump. 
          // 'smooth' can be canceled by the browser if images are still loading.
          const navHeight = 180;
          const elementPosition = element.getBoundingClientRect().top + window.scrollY;

          window.scrollTo({
            top: elementPosition - navHeight,
            behavior: 'auto'
          });
          // URL is clean for the rest of the session.
          window.history.replaceState(null, '', window.location.pathname);
        }
      };

      // We use requestAnimationFrame to wait for the very next 
      // browser "paint" after the books are added to the DOM.
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          scrollToTarget();
        });
      }, 500); // Increased to 500ms to account for image layout shifts

      return () => clearTimeout(timer);
    }
  }, [books, shelfData.sortedNames]);

  return (

    <div className="library">
      <LibraryNavBar
        isScrolled={isScrolled}
        viewMode={viewMode}
        setViewMode={setViewMode}
        sortBy={sortBy}
        setSortBy={setSortBy}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        shelfNames={shelfData.sortedNames}
      />
      {shelfData.sortedNames.length === 0 ? (
        <div className="empty-state">
          {searchTerm ? (
            <h2>No books found matching "{searchTerm}"</h2>
          ) : (
            <h2>Your library is currently empty.</h2>
          )}
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="clear-search-btn">
              Clear Search
            </button>
          )}
        </div>
      ) : (

        shelfData.sortedNames.map((shelf) => (
          <div key={shelf} id={`shelf-${shelf.replace(/\s+/g, '-')}`} className='shelf-container'>
            <h1>{shelf}</h1>
            <div className='books-container' >
              {/*books.map((book)*/
                shelfData.grouped[shelf].map((book) => (
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
      {/* Back to Top Button */}
      {showButton && (
        <button className="back-to-top" onClick={scrollToTop} title="Back to Top">
          ↑
        </button>
      )}
    </div>
  );
};

export default Library