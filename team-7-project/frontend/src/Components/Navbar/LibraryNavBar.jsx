import React from 'react';
import './Navbar.css';
import { useMedia } from '../StateProvider/mediaState/useMedia';
import { useLibrary } from '../StateProvider/libraryState/useLibrary'; // Import Library Context
import { ROUTES } from '../Api/routingConfig';

const LibraryNavBar = ({ isScrolled, shelfNames }) => {
    const {
        media,
        viewMode, setViewMode,
        sortBy, setSortBy,
        searchTerm, setSearchTerm,
        filterType, setFilterType,
        getSortLabel,
        mediaTypes
    } = useMedia();

    // Consume Library Context for Breadcrumb Data
    const { currentLibrary, getBranchName } = useLibrary();
    const activeMedia = media && media.length > 0 ? media[0] : null;
    const tenantId = activeMedia?.tenantId ;
    const branchId = activeMedia?.branchId;

    const handleJump = (e, name) => {
        e.preventDefault();
        const targetId = `shelf-${name.replace(/\s+/g, '-')}`;
        const element = document.getElementById(targetId);

        if (element) {
            const navHeight = 180;
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({
                top: elementPosition - navHeight - 10,
                behavior: 'smooth'
            });
        }
    };

    const getSearchPlaceholder = () => {
        const label = getSortLabel().toLowerCase();
        return `Search by title or ${label}...`;
    };

    return (
        <nav className={`library-nav-container ${isScrolled ? 'scrolled' : ''}`}>

            {/* --- Breadcrumb Row --- */}
            <div className="breadcrumb-nav">
                {/* Always leads to Master Library */}
                <span onClick={() => window.location.hash = ROUTES.LIBRARY} className="breadcrumb-link">
                    Library
                </span>

                {tenantId && (
                    <>
                        <span className="bc-sep">/</span>
                        <span 
                            onClick={() => window.location.hash = `${ROUTES.LIBRARY}/${tenantId}`}
                            className={`breadcrumb-link ${!branchId ? 'active' : ''}`}
                        >
                            {currentLibrary?.name || "Tenant Library"}
                        </span>
                    </>
                )}

                {branchId && (
                    <>
                        <span className="bc-sep">/</span>
                        <span className="breadcrumb-link active">
                            {/* Uses the media's branchId to get the name */}
                            {getBranchName(branchId) || "Branch"}
                        </span>
                    </>
                )}
            </div>
            {/* Main Controls Row */}
            <div className="navbar library-nav">
                <div className="mobile-library-triggers">
                    <select value={viewMode} onChange={(e) => setViewMode(e.target.value)} className="lib-select-trigger">
                        <option value="genre">View: Genre</option>
                        <option value="alphabetical">View: A-Z</option>
                    </select>

                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="lib-select-trigger">
                        <option value="all">Show: All</option>
                        {mediaTypes.map((type) => (
                            <option key={type} value={type}>
                                Show: {type.charAt(0).toUpperCase() + type.slice(1)}s
                            </option>
                        ))}
                    </select>

                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="lib-select-trigger">
                        <option value="title">Sort: Title</option>
                        <option value="author">Sort: {getSortLabel()}</option>
                    </select>
                </div>

                <ul className="nav-menu desktop-links-only">
                    <li><a onClick={() => setViewMode('genre')} className={viewMode === 'genre' ? 'active-link' : ''}>Genre</a></li>
                    <li><a onClick={() => setViewMode('alphabetical')} className={viewMode === 'alphabetical' ? 'active-link' : ''}>A - Z</a></li>
                    <li className="nav-divider">|</li>

                    <li className="nav-label-container"><span className="nav-label">Show:</span></li>
                    <li><a onClick={() => setFilterType('all')} className={filterType === 'all' ? 'active-link' : ''}>All</a></li>

                    {mediaTypes.map((type) => (
                        <li key={type}>
                            <a onClick={() => setFilterType(type)} className={filterType === type ? 'active-link' : ''}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}s
                            </a>
                        </li>
                    ))}

                    <li className="nav-divider">|</li>
                    <li className="nav-label-container"><span className="nav-label">Sort By:</span></li>
                    <li><a onClick={() => setSortBy('title')} className={sortBy === 'title' ? 'active-sort' : ''}>Title</a></li>
                    <li>
                        <a onClick={() => setSortBy('author')} className={sortBy === 'author' ? 'active-sort' : ''}>
                            {getSortLabel()}
                        </a>
                    </li>
                </ul>

                <div className="search-container">
                    <input
                        type="text"
                        placeholder={getSearchPlaceholder()}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
            </div>

            {/* Secondary Navigation Row */}
            <div className="secondary-nav">
                <span className="jump-label">Jump to:</span>
                <div className="jump-links">
                    {shelfNames.map(name => (
                        <a
                            key={name}
                            href={`#shelf-${name.replace(/\s+/g, '-')}`}
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