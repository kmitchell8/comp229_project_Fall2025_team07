import React, { useState, useEffect } from 'react';
import './TransitionShield.css'; // Contains fade-in/out keyframes


//see 'overall_progress_track_5.docx'
const TransitionShield = () => {
    const [isExiting, setIsExiting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Handle incoming transition (Initial Load)
        const loadTimer = setTimeout(() => setIsLoading(false), 300);

        // Handle outgoing transition (Navigation Start)
        const handleNavStart = () => setIsExiting(true);

        window.addEventListener('app-nav-start', handleNavStart);
        // Also handle standard link clicks that don't use the hook
        window.addEventListener('beforeunload', handleNavStart);

        return () => {
            clearTimeout(loadTimer);
            window.removeEventListener('app-nav-start', handleNavStart);
            window.removeEventListener('beforeunload', handleNavStart);
        };
    }, []);

    if (!isLoading && !isExiting) return null;

    return (
        <div className={`transition-shield ${isExiting ? 'fade-out' : 'fade-in'}`}>
            <div className="loading-spinner">
                {/* Your team_7_logo.png could go here as a subtle watermark */}
                <div className="pulse-ring"></div>
            </div>
        </div>
    );
};

export default TransitionShield;