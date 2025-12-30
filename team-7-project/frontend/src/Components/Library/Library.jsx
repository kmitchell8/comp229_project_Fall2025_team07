// Library.jsx - Improved version
import React, { useEffect, useState, useMemo } from 'react'
import './Library.css'
import mediaApi from '../Api/mediaApi'
import LibraryNavBar from '../Navbar/LibraryNavBar';
//import { useAuth } from '../authState/useAuth'
//import {useNavigate} from 'react-router-dom'

const truncateText = (text, limit) => {
  if (!text) return "";
  return text.length > limit ? text.substring(0, limit) + "..." : text;
};

const Library = () => {
  //const [mediaShelves, setMediaShelves] = useState({});
  const [media, setMedia] = useState([]);
  const [descriptions, setDescriptions] = useState({}); // { [mediaId]: "Text content..." }
  const [expandedId, setExpandedId] = useState(null);    // For the In-line Fallback
  const [selectedMedia, setSelectedMedia] = useState(null); //Controls Quick Preview
  const [viewMode, setViewMode] = useState('genre'); // 'genre' or 'alphabetical'
  const [sortBy, setSortBy] = useState('title');   // 'title' or 'author'
  const [showButton, setShowButton] = useState(false); // New state for button visibility
  const [isScrolled, setIsScrolled] = useState(false);//scrolling navbar
  const [searchTerm, setSearchTerm] = useState(""); // search
  const [filterType, setFilterType] = useState('all'); // 'all', 'book', 'movie', 'game'
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

  //SHOW description

  // Function for the Modal (Triggered by Cover)
  const handleOpenPreview = async (media) => {
    setSelectedMedia(media);
    if (!descriptions[media._id]) {
      fetchDescription(media);
    }
  };

  // Function for In-line (Triggered by Link/Button)
  const handleShowDescription = async (media) => {
    if (expandedId === media._id) {
      setExpandedId(null);
    } else {
      setExpandedId(media._id);
      if (!descriptions[media._id]) {
        fetchDescription(media);
      }
    }
  };

  // Shared helper to fetch text
  const fetchDescription = async (media) => {
    try {
      const text = await mediaApi.getDescriptionText(media.description);
      setDescriptions(prev => ({ ...prev, [media._id]: text }));
    } catch (err) {
      console.error("Description fetch failed", err);
    }
  };

  //KEYBOARD listener
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedMedia(null);
      }
    };

    if (selectedMedia) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedMedia]);

  // API Load
  useEffect(() => {
    const loadMedia = async () => {
      try {
        const data = await mediaApi.list();
        if (Array.isArray(data)) setMedia(data);
      } catch (error) {
        console.error('Error fetching library:', error);
      }
    };
    loadMedia();
  }, []);

  // Derive grouped and sorted data (The "Shelves")
  // recalculates only when the 'media' array changes
  // Derive grouped and sorted data (The "Shelves")
  // recalculates only when the 'media' array changes
  const shelfData = useMemo(() => {
    const currentMedia = Array.isArray(media) ? media : [];

    // FILTER: Narrow down media based on search
    const filteredMedia = currentMedia.filter(item => {
      // Check Search Term
      const title = (item.title || "").toLowerCase();
      const creator = (item.author || item.director || item.developer || "").toLowerCase();
      const matchesSearch = title.includes(searchTerm.toLowerCase()) || creator.includes(searchTerm.toLowerCase());
      // Check Media Type
      const matchesType = filterType === 'all' || item.mediaType === filterType;
      return matchesSearch && matchesType;
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
    const grouped = filteredMedia.reduce((acc, item) => {
      let key;

      if (viewMode === 'genre') {
        const rawGenre = item.genre || "Other";
        key = rawGenre.charAt(0).toUpperCase() + rawGenre.slice(1).toLowerCase();
      } else {
        // If sorting by 'author' but the item is a movie, 
        // it should use the Title for the shelf key instead of crashing.
        let sortValue = (item[sortBy] || item.title || "#").trim();

        if (sortBy === 'author' && item.author) {
          sortValue = getLastName(item.author);
        }

        key = sortValue.charAt(0).toUpperCase();
        // If the first character isn't a letter (like a number or symbol), group under "#"
        if (!/[A-Z]/.test(key)) key = "#";
      }

      if (!acc[key]) acc[key] = [];
      acc[key].push({ ...item, id: item._id });
      return acc;
    }, {});

    // sorting inside the shelves
    Object.keys(grouped).forEach(shelf => {
      grouped[shelf].sort((a, b) => {
        // Check for 'book' discriminator (matching backend)
        if (sortBy === 'author' && a.author && b.author) {
          const authorA = getLastName(a.author);
          const authorB = getLastName(b.author);
          // If last names are the same, sort by first name (the whole string)
          if (authorA === authorB) {
            return (a.author || "").localeCompare(b.author || "");
          }
          return authorA.localeCompare(authorB);
        } else {
          // Default to Title sorting for Movies/Games or when sorting by Title
          const valA = (a.title || '').toLowerCase();
          const valB = (b.title || '').toLowerCase();
          return valA.localeCompare(valB);
        }
      });
    });

    const sortedNames = Object.keys(grouped).sort((a, b) => {
      if (a === "#") return -1;
      if (b === "#") return 1;
      return a.localeCompare(b);
    });

    return { grouped, sortedNames };
  }, [media, viewMode, sortBy, searchTerm, filterType]);


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
    // Check if we have a hash and if media have finally arrived
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
            top: elementPosition - navHeight-10,
            behavior: 'auto'
          });
          // URL is clean for the rest of the session.
          window.history.replaceState(null, '', window.location.pathname);
        }
      };

      // use requestAnimationFrame to wait for the very next 
      // browser "paint" after the media are added to the DOM.
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          scrollToTarget();
        });
      }, 500); // Increased to 500ms to account for image layout shifts

      return () => clearTimeout(timer);
    }
  }, [media, shelfData.sortedNames]);

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
        filterType={filterType}
        setFilterType={setFilterType}
        shelfNames={shelfData.sortedNames}
      />
      {shelfData.sortedNames.length === 0 ? (
        <div className="empty-state">
          {searchTerm ? (
            <h2>No media found matching "{searchTerm}"</h2>
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
            <div className='media-container' >
              {/*media.map((media)*/
                shelfData.grouped[shelf].map((media) => (
                  <div key={media.id} className='media-formatting'>
                    <div
                      className="media-cover-wrapper"
                      onClick={() => handleOpenPreview(media)}
                      title="Click to view description">
                      <img
                        src={mediaApi.getCoverUrl(media.cover)}
                        alt={media.title}
                      // Safety check for broken image paths
                      // onError={(e) => { e.target.src = '/default-media-cover.png'; }}
                      />
                    </div>
                    <h2>{media.title}</h2>
                    <h3>
                      {media.mediaType === 'book' && media.author}
                      {media.mediaType === 'movie' && `Directed by: ${media.director}`}
                      {media.mediaType === 'game' && `Developed by: ${media.developer}`}
                    </h3>
                    {/* <h4>
                      {media.publisher}
                      {media.ISBN_13 ? ` . ${media.ISBN_13}` : ''}
                      {media.ISBN_10 ? ` . ${media.ISBN_10}` : ''}
                    </h4>*/}
                    <h4>{/*media.rating*/}</h4>
                    {/* Metadata and the In-line Toggle Link */}
                    <button
                      className="media-readmore"
                      onClick={() => handleShowDescription(media)}
                    >
                      {expandedId === media._id ? 'Close Summary ↑' : 'Quick Summary ↓'}
                    </button>

                    {/* IN-LINE FALLBACK DISPLAY */}
                    {expandedId === media._id && descriptions[media._id] && (
                      <p className='media-description'>
                        {truncateText(descriptions[media._id], 150)}
                        <br />
                        <span
                          className="media-readmore"
                          onClick={() => handleOpenPreview(media)}
                        >
                          Read More
                        </span>
                      </p>
                    )}

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

      {/* modal overlay (pop up) */}
      {selectedMedia && (
        <div className="modal-overlay" onClick={() => setSelectedMedia(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setSelectedMedia(null)}>×</button>

            <div className="modal-body">
              <div className="modal-image">
                <img src={mediaApi.getCoverUrl(selectedMedia.cover)} alt={selectedMedia.title} />
              </div>

              <div className="modal-info">
                <h2>{selectedMedia.title}</h2>
                <h3>
                  {selectedMedia.author || selectedMedia.director || selectedMedia.developer}
                </h3>
                <p className="modal-metadata">
                  {selectedMedia.mediaType === 'book' && (
                    <>
                      {selectedMedia.publisher} • {selectedMedia.ISBN_13 || selectedMedia.ISBN_10}
                    </>
                  )}
                  {selectedMedia.mediaType === 'movie' && (
                    <>
                      {selectedMedia.studio} • {selectedMedia.runtime} mins
                    </>
                  )}
                  {selectedMedia.mediaType === 'game' && (
                    <>
                      {selectedMedia.platform} • {selectedMedia.rating}
                    </>
                  )}
                </p>
                <hr />
                <div className="modal-description">
                  {descriptions[selectedMedia._id] || "Loading description..."}
                </div>
                {/*place holder*/}
                <button
                  className="modal-read-more"
                  onClick={() => console.log(`Maps to /media/${selectedMedia._id}`)}
                >
                  View Media
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library