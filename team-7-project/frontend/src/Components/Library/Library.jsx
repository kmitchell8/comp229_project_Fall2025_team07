import React, { useEffect, useState } from 'react';
import './Library.css';
import mediaApi from '../Api/mediaApi';
import LibraryNavBar from '../Navbar/LibraryNavBar';
import Media from '../Media/Media';
import { ROUTES } from '../Api/routingConfig';
import { getHash } from '../Api/getPage';
import { useMedia } from '../StateProvider/mediaState/useMedia';

const truncateText = (text, limit) => {
  if (!text) return "";
  return text.length > limit ? text.substring(0, limit) + "..." : text;
};

const Library = ({ pathId }) => {
  // CONSUME CONTEXT 
  const {
    loading,
    shelfData,
    mediaTypeConfigs,
    viewMode, setViewMode,
    sortBy, setSortBy,
    searchTerm, setSearchTerm,
    filterType, setFilterType
  } = useMedia();

  // LOCAL UI STATE
  const [descriptions, setDescriptions] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showButton, setShowButton] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Scroll Listeners
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY;
      setIsScrolled(scrollPos > 50);
      setShowButton(scrollPos > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Modal Preview Logic
  const handleOpenPreview = async (media) => {
    setSelectedMedia(media);
    const mId = media._id || media.id;
    if (!descriptions[mId]) {
      fetchDescription(media);
    }
  };

  const handleShowDescription = async (media) => {
    const mId = media._id || media.id;
    if (expandedId === mId) {
      setExpandedId(null);
    } else {
      setExpandedId(mId);
      if (!descriptions[mId]) fetchDescription(media);
    }
  };

  const fetchDescription = async (media) => {
    try {
      const text = await mediaApi.getDescriptionText(media.description);
      setDescriptions(prev => ({ ...prev, [media._id || media.id]: text }));
    } catch (err) {
      console.error("Description fetch failed", err);
    }
  };

  // Keyboard Listener for Modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedMedia(null);
    };
    if (selectedMedia) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMedia]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Helper to get Creator Data cleanly (The requested correction)
  const getCreatorInfo = (item) => {
    const config = mediaTypeConfigs[item.mediaType];
    const field = config?.find(f => f.name.startsWith('creator'));
    if (!field) return { label: "", value: "" };

    const key = field.name.split('.')[1] || field.name;
    const label = field.label.split('.')[1] || field.label;
    return {
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value: item[key] || ""
    };
  };

  if (pathId) return <Media mediaId={pathId} viewContext="library" />;
  if (loading) return <div className="loading-state">Loading Library...</div>;

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
          <h2>{searchTerm ? `No media found matching "${searchTerm}"` : "Your library is empty."}</h2>
          {searchTerm && <button onClick={() => setSearchTerm("")} className="clear-search-btn">Clear Search</button>}
        </div>
      ) : (
        shelfData.sortedNames.map((shelf) => (
          <div key={shelf} id={`shelf-${shelf.replace(/\s+/g, '-')}`} className='shelf-container'>
            <h1>{shelf}</h1>
            <div className='media-container'>
              {shelfData.grouped[shelf].map((media) => {
                const creator = getCreatorInfo(media);

                return (
                  <div key={media.id} className='media-formatting'>
                    <div className="media-cover-wrapper" onClick={() => handleOpenPreview(media)}>
                      <img src={mediaApi.getCoverUrl(media.cover)} alt={media.title} />
                    </div>
                    <h2>{media.title}</h2>
                    <h3>{creator.value ? `${creator.label}: ${creator.value}` : ""}</h3>

                    <button className="media-readmore" onClick={() => handleShowDescription(media)}>
                      {expandedId === (media._id || media.id) ? 'Close Summary ↑' : 'Quick Summary ↓'}
                    </button>

                    {expandedId === (media._id || media.id) && descriptions[media._id || media.id] && (
                      <p className='media-description'>
                        {truncateText(descriptions[media._id || media.id], 150)}
                        <br />
                        <span className="media-readmore" onClick={() => handleOpenPreview(media)}>Read More</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {showButton && <button className="back-to-top" onClick={scrollToTop}>↑</button>}

      {/* CORRECTED MODAL LOGIC */}
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
                {/* Fixed Creator display using the helper */}
                <h3>{getCreatorInfo(selectedMedia).value}</h3>

                <p className="modal-metadata">
                  {mediaTypeConfigs[selectedMedia.mediaType]
                    ?.filter(field => !field.name.startsWith('creator'))
                    .map((field, index, filteredArray) => {
                      const dataKey = field.name.includes('.') ? field.name.split('.')[1] : field.name;
                      const value = selectedMedia[dataKey];
                      if (!value) return null;
                      return (
                        <span key={field.name}>
                          {Array.isArray(value) ? value.join(', ') : value}
                          {index < filteredArray.length - 1 ? ' • ' : ''}
                        </span>
                      );
                    })}
                </p>

                <hr />
                <div className="modal-description">
                  {descriptions[selectedMedia._id || selectedMedia.id] || "Loading description..."}
                </div>

                <button className="modal-read-more" onClick={() => {
                  const mId = selectedMedia._id || selectedMedia.id;
                  const currentHash = getHash();
                  // Determine the base: If empty, use ROUTES.LIBRARY. If not, use currentHash.
                  const base = currentHash ? currentHash : ROUTES.LIBRARY;
                  window.location.hash = `${base}/${mId}`;

                  setSelectedMedia(null);
                }}>
                  View Full Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;