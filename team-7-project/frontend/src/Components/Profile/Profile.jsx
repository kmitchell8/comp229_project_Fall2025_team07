import React, { useState, useMemo } from 'react';
import { useAuth } from '../authState/useAuth.jsx';
import './Profile.css';

export const Profile = () => {
    // Accessing core identity and account status
    const { userInfo,  loading } = useAuth();

    // Local state for the "Activity" data (fetched from {userId}.json later)
    const [userActivity] = useState({
        mediaInventory: [], // owned/rented
        ratings: [],
        libraryCard: 'Standard' // Access Level
    });

    // Form state for contact fields - identifies empty fields to prompt user
    const [contactData] = useState({
        phone: userInfo?.phone || '',
        altEmail: userInfo?.altEmail || '',
        address: {
            street: userInfo?.address?.street || '',
            city: userInfo?.address?.city || '',
            postalCode: userInfo?.address?.postalCode || ''
        }
    });

    // useMemo prevents these strings from being "re-calculated" unnecessarily 
    // which can sometimes trip up React's render cycle and cause flashing.
    const coverPath = useMemo(() => 
        userInfo?._id ? `/users/${userInfo._id}/${userInfo._id}_cover.jpg` : null
    , [userInfo?._id]);

    const profilePath = useMemo(() => 
        userInfo?.profileImage || '/assets/images/default-avatar.png'
    , [userInfo?.profileImage]);

    // This function ensures the error fallback only runs once to prevent infinite loops
    // if the default image is also missing.
    const handleImgError = (e, fallbackType) => {
        const fallback = fallbackType === 'cover' 
            ? '/assets/images/default-cover.jpg' 
            : '/assets/images/default-avatar.png';
            
        if (e.target.src !== window.location.origin + fallback) {
            e.target.onerror = null; // Disables the error listener after one failure
            e.target.src = fallback;
        }
    };

    if (loading) return null; 

    return (
        <div className="media"> {/* Reusing outer container logic */}
            <main className="media-type"> {/* Reusing the Card logic */}
                
                <div className="media-split-container">
                    
                    {/* LEFT PANE: Visuals (Cover & Avatar) */}
                    <aside className="media-visual-pane">
                        <div className="media-cover-frame">
                             <img
                                src={coverPath}
                                alt="Cover"
                                onError={(e) => handleImgError(e, 'cover')}
                            />
                        </div>

                        <div className="profile-avatar-overlay">
                            <img
                                src={profilePath}
                                alt={userInfo?.name}
                                className="avatar-img"
                                onError={(e) => handleImgError(e, 'avatar')}
                            />
                        </div>

                        <div className="media-action-bar">
                            <button className="media-back-btn">Update Profile Image</button>
                            <button className="admin-edit-toggle">Update Cover Photo</button>
                        </div>
                    </aside>

                    {/* RIGHT PANE: Identity & Metadata */}
                    <section className="media-info-pane">
                        <div className="media-title-area">
                            <h1>{userInfo?.name || 'Guest User'}</h1>
                            <span className="media-badge">{userActivity.libraryCard} Access</span>
                        </div>

                        <div className="media-details-grid">
                            <div className="detail-entry">
                                <label>User ID</label>
                                <p>{userInfo?._id || 'N/A'}</p>
                            </div>
                            <div className="detail-entry">
                                <label>Username/Email</label>
                                <p>{userInfo?.email || 'N/A'}</p>
                            </div>
                            <div className="detail-entry">
                                <label>Contact Phone</label>
                                <p>{contactData.phone || "Not Set"}</p>
                            </div>
                            <div className="detail-entry">
                                <label>Secondary Email</label>
                                <p>{contactData.altEmail || "None Provided"}</p>
                            </div>
                        </div>

                        <div className="media-full-description">
                            <h2>Personal Library Summary</h2>
                            <div className="description-separator"></div>
                            <div className="library-stats-container">
                                <div className="detail-entry">
                                    <label>Inventory Size</label>
                                    <p>{userActivity.mediaInventory.length} Items</p>
                                </div>
                                <div className="detail-entry">
                                    <label>Active Rentals</label>
                                    <p>0 Items</p>
                                </div>
                            </div>
                            <button className="confirm-save-btn" style={{marginTop: '20px'}}>
                                Open Full Library
                            </button>
                        </div>
                    </section>
                </div>

                {/* TROUBLESHOOTING SECTION */}
                <footer className="media-full-description" style={{marginTop: '80px', opacity: 0.6}}>
                    <h2>Debug Info</h2>
                    <div className="description-separator"></div>
                    <div className="text-content">
                        <p><strong>System Message:</strong> This is a test message for profile validation.</p>
                        <p><strong>Role:</strong> {userInfo?.role || 'N/A'}</p>
                        <p><strong>URL State:</strong> Rendered via hash logic (empty or #profile).</p>
                        <p><strong>Note:</strong> Files stored at /users/{userInfo?._id}/</p>
                    </div>
                </footer>
            </main>
        </div>
    );
};

export default Profile;