import React, { useState, useEffect } from 'react';
import './Navbar.css';
import mediaApi from '../Api/mediaApi'; // Following your original import pattern

const LibraryNavBar = ({
    isScrolled,
    viewMode,
    setViewMode,
    sortBy,
    setSortBy,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    shelfNames }) => {

    const [mediaTypes, setMediaTypes] = useState([]);

    // following the loadMediaTypes pattern from CreateMedia.jsx
    useEffect(() => {
        const loadMediaTypes = async () => {
            try {
                const data = await mediaApi.getMediaTypes();
                // data is { "book": [...], "movie": [...] } 
                const typeKeys = data ? Object.keys(data) : [];
                setMediaTypes(typeKeys);
                // eslint-disable-next-line no-unused-vars
            } catch (err) {
                console.error("Could not load media type definitions.");
            }
        };

        loadMediaTypes();
    }, []);

    const handleJump = (e, name) => {
        e.preventDefault(); //  stops the state reset

        // Create the ID format exactly as it appears in Library.jsx
        const targetId = `shelf-${name.replace(/\s+/g, '-')}`;
        const element = document.getElementById(targetId);

        if (element) {
            const navHeight = 180;
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;

            window.scrollTo({
                top: elementPosition - navHeight - 10,
                behavior: 'smooth'
            });
            // Update URL bar without reloading the component
            //window.history.pushState(null, null, `#${targetId}`);
        }
    };

    return (
        <nav className={`library-nav-container ${isScrolled ? 'scrolled' : ''}`}>
            {/* Main Controls Row */}
            <div className="navbar library-nav">

                {/* Mobile Dropdown Triggers - Only visible on mobile */}
                <div className="mobile-library-triggers">
                    <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="lib-select-trigger">
                        <option value="genre">View: Genre</option>
                        <option value="alphabetical">View: A-Z</option>
                    </select>

                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="lib-select-trigger">
                        <option value="all">Show: All</option>
                        {/* Dynamic integration based on mediaApi types */}
                        {mediaTypes.map((type) => (
                            <option key={type} value={type}>
                                Show: {type.charAt(0).toUpperCase() + type.slice(1)}s
                            </option>
                        ))}
                    </select>

                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="lib-select-trigger">
                        <option value="title">Sort: Title</option>
                        <option value="author">Sort: Author</option>
                    </select>
                </div>

                {/* Desktop Menu - Uses desktop-links-only to hide on mobile */}
                <ul className="nav-menu desktop-links-only">
                    {/* View Modes */}
                    <li>
                        <a onClick={() => setViewMode('genre')} className={viewMode === 'genre' ? 'active-link' : ''}>
                            Genre
                        </a>
                    </li>
                    <li>
                        <a onClick={() => setViewMode('alphabetical')} className={viewMode === 'alphabetical' ? 'active-link' : ''}>
                            A - Z
                        </a>
                    </li>
                    <li className="nav-divider">|</li>

                    {/* Media Type Filters - Now Dynamic */}
                    <li className="nav-label-container"><span className="nav-label">Show:</span></li>
                    <li><a onClick={() => setFilterType('all')} className={filterType === 'all' ? 'active-link' : ''}>All</a></li>

                    {/* Mapping through mediaTypes from API to replace hardcoded links */}
                    {mediaTypes.map((type) => (
                        <li key={type}>
                            <a
                                onClick={() => setFilterType(type)}
                                className={filterType === type ? 'active-link' : ''}
                            >
                                {type.charAt(0).toUpperCase() + type.slice(1)}s
                            </a>
                        </li>
                    ))}

                    <li className="nav-divider">|</li>

                    <li
                        className="nav-label-container">
                        <span className="nav-label">Sort By:</span>
                    </li>
                    <li>
                        <a onClick={() => setSortBy('title')} className={sortBy === 'title' ? 'active-sort' : ''}>Title</a>
                    </li>
                    <li>
                        <a onClick={() => setSortBy('author')} className={sortBy === 'author' ? 'active-sort' : ''}>Author</a>
                    </li>
                </ul>

                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search by title or author..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            {/* Secondary Navigation Row ( */}
            <div className="secondary-nav">
                <span className="jump-label">Jump to:</span>
                <div className="jump-links">
                    {shelfNames.map(name => (
                        <a
                            key={name}
                            href={`#shelf-${name.replace(/\s+/g, '-')}`}//accessibility fallback
                            onClick={(e) => handleJump(e, name)}
                            className="jump-link"
                        >
                            {name}
                        </a>
                    ))}
                </div>
            </div>
        </nav>
    );
};

export default LibraryNavBar;