import React from 'react';
import './NavBar.css';


const LibraryNavBar = ({ viewMode, setViewMode, sortBy, setSortBy, searchTerm, setSearchTerm, shelfNames }) => {


    const handleJump = (e, name) => {
        e.preventDefault(); //  stops the state reset

        // Create the ID format exactly as it appears in Library.jsx
        const targetId = `shelf-${name.replace(/\s+/g, '-')}`;
        const element = document.getElementById(targetId);

        if (element) {
            const navHeight = 180;
            const elementPosition = element.getBoundingClientRect().top + window.scrollY;
            element.scrollIntoView({ behavior: 'smooth' });
            window.scrollTo({
            top: elementPosition - navHeight,
            behavior: 'smooth'
        });
            // Update URL bar without reloading the component
            //window.history.pushState(null, null, `#${targetId}`);
        }
    };
    return (
        <nav className="library-nav-container">
            {/* Main Controls Row */}
            <div className="navbar library-nav">
                <ul className="nav-menu">
                    <li>
                        <a onClick={() => setViewMode('genre')} className={viewMode === 'genre' ? 'active-link' : ''}>
                            Genre View
                        </a>
                    </li>
                    <li>
                        <a onClick={() => setViewMode('alphabetical')} className={viewMode === 'alphabetical' ? 'active-link' : ''}>
                            A - Z View
                        </a>
                    </li>
                    <li className="nav-divider">|</li>
                    <li className="nav-label-container"><span className="nav-label">Sort By:</span></li>
                    <li><a onClick={() => setSortBy('title')} className={sortBy === 'title' ? 'active-sort' : ''}>Title</a></li>
                    <li><a onClick={() => setSortBy('author')} className={sortBy === 'author' ? 'active-sort' : ''}>Author</a></li>
                    <li className="search-container">
                        <input
                            type="text"
                            placeholder="Search by title or author..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </li>
                </ul>
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