import React, { useState, useEffect, useCallback } from 'react';
import mediaApi from '../Api/mediaApi';
import { useAuth } from '../StateProvider/authState/useAuth';
import { useMedia } from '../StateProvider/mediaState/useMedia'; // Import the context hook
import { ROUTES } from '../Api/routingConfig';
import './Media.css';

const Media = ({ mediaId, viewContext, onUpdate }) => {
  const { getToken, isAdmin } = useAuth();
  
  // Consuming the Media Context
  // We pull mediaTypeConfigs and refreshMedia from the Provider
  const { mediaTypeConfigs, refreshMedia } = useMedia();

  // State management for raw data and the editable draft
  const [media, setMedia] = useState(null);
  const [editData, setEditData] = useState(null); 
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [genres, setGenres] = useState([]); 
  // mediaTypesConfig state removed as it is now provided by Context
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isLibraryView = viewContext === ROUTES.LIBRARY;
  const isAdminView = viewContext === ROUTES.ADMIN;

  // Core data fetching logic for media details, and genre list
  // mediaApi.getMediaTypes() removed from here to rely on Provider's data
  const fetchFullDetails = useCallback(async () => {
    if (!mediaId) return;
    try {
      setLoading(true);
      const [data, genreList] = await Promise.all([
        mediaApi.read(mediaId),
        mediaApi.getGenres()
      ]);

      setMedia(data);
      setEditData(JSON.parse(JSON.stringify(data))); 
      setGenres(Array.isArray(genreList) ? genreList : []);

      if (data.description) {
        const text = await mediaApi.getDescriptionText(data.description);
        setDescription(text);
      }
    } catch (err) {
      setError("Failed to load media details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mediaId]);

  useEffect(() => {
    fetchFullDetails();
  }, [fetchFullDetails]);

  // Handles complex data types to ensure arrays and numbers are stored correctly in state
  const handleDynamicChange = (key, value, inputType) => {
    setEditData(prev => {
      let finalValue = value;
      // Audit Fix: Handle "creator.xxx" dot notation while keeping the flat object structure
      const dataKey = key.includes('.') ? key.split('.')[1] : key;

      if (inputType === 'list' || inputType === 'array') {
        finalValue = (typeof value === 'string' && value.trim() === '')
          ? []
          : (typeof value === 'string' ? value.split(',').map(v => v.trim()) : value);
      } 
      else if (inputType === 'number' || inputType === 'integer') {
        finalValue = value === '' ? 0 : Number(value);
      }
      else if (inputType === 'checkbox' || inputType === 'boolean') {
        finalValue = Boolean(value);
      }
      return { ...prev, [dataKey]: finalValue };
    });
  };

  // Compares original state with draft state to determine if UI should show "unsaved" status
  const hasChanges = () => {
    if (!media || !editData) return false;
    
    // Audit Fix: Removed baseFields logic. Checking title, genre, and dynamic fields directly.
    // Updated to use mediaTypeConfigs from Context
    const keysToCheck = [
        'title', 
        'genre', 
        ...(mediaTypeConfigs[media.mediaType]?.map(f => f.name.includes('.') ? f.name.split('.')[1] : f.name) || [])
    ];

    return keysToCheck.some(key => {
      const orig = media[key];
      const edit = editData[key];

      if (Array.isArray(orig) || Array.isArray(edit)) {
        return JSON.stringify(orig || []) !== JSON.stringify(edit || []);
      }
      return String(orig ?? '') !== String(edit ?? '');
    });
  };

  // Resets the draft data to match the original database record
  const handleRevert = () => {
    setEditData(JSON.parse(JSON.stringify(media)));
  };

  // Exits edit mode and clears any unsaved changes in the draft
  const handleCancel = () => {
    handleRevert();
    setIsEditing(false);
  };

  // Saves updated fields to the database and updates the local "original" state on success
  const handleSave = async () => {
    try {
      // Audit Fix: Restored your logic of mapping dynamic keys without intermediate baseField variables
      // Updated to use mediaTypeConfigs from Context
      const allowedKeys = [
        'title', 
        'genre', 
        ...(mediaTypeConfigs[media.mediaType]?.map(f => f.name.includes('.') ? f.name.split('.')[1] : f.name) || [])
      ];

      const updatePayload = allowedKeys.reduce((acc, key) => {
        if (editData[key] !== undefined) acc[key] = editData[key];
        return acc;
      }, {});

      await mediaApi.update(updatePayload, mediaId, getToken);
      
      setMedia(JSON.parse(JSON.stringify(editData)));
      setIsEditing(false);
      
      // Trigger context refresh to update Library shelves immediately
      refreshMedia(); 
      onUpdate?.(); 
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  if (loading) return <div className="media-status">Loading entry...</div>;
  if (error) return <div className="media-status error">{error}</div>;
  if (!media) return null;

  return (
    <div className="media">
      <div className="media-type">
        <div className="media-split-container">
          
          <div className="media-visual-pane">
            <div className="media-cover-frame">
              <img src={mediaApi.getCoverUrl(media.cover)} alt={media.title} />
            </div>
            <div className="media-action-bar">
              {isAdminView && isAdmin && (
                <button
                  className={`admin-edit-toggle ${isEditing ? 'editing' : ''}`}
                  onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                >
                  {isEditing ? "Cancel" : "Edit Media"}
                </button>
              )}

              {isLibraryView && (
                <button className="media-back-btn" onClick={() => window.location.hash = ROUTES.LIBRARY}>
                  Back to Library
                </button>
              )}

              {isAdminView && !isEditing && (
                <button className="media-back-btn" onClick={() => window.location.hash = 'admin/updatemedia'}>
                  Back to Admin List
                </button>
              )}
            </div>
          </div>

          <div className="media-info-pane">
            <header className="media-title-area">
              {isEditing ? (
                <input
                  className="edit-input-title"
                  value={editData.title}
                  onChange={(e) => handleDynamicChange('title', e.target.value, 'text')}
                />
              ) : (
                <>
                  <h1>{media.title}</h1>
                  {/* Dynamic Creator Sub-heading synchronized with Library logic via Context */}
                  <h3 className="media-creator-sub">
                    {mediaTypeConfigs[media.mediaType]
                      ?.filter(f => f.name.startsWith('creator'))
                      .map(f => media[f.name.split('.')[1]])[0] || ""}
                  </h3>
                </>
              )}
              <span className="media-badge">{media.mediaType}</span>
            </header>

            <div className="media-details-grid">
              <div className="detail-entry">
                <label>Genre</label>
                {isEditing ? (
                    <select 
                        className="edit-field"
                        value={editData.genre || ''} 
                        onChange={(e) => handleDynamicChange('genre', e.target.value, 'select')}
                    >
                        <option value="" disabled>Select Genre</option>
                        {genres.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                ) : <p>{media.genre || 'N/A'}</p>}
              </div>

              {/* Filtering logic using Context config to prevent duplicate Creator/Title in grid */}
              {mediaTypeConfigs[media.mediaType]
                ?.filter(field => !field.name.startsWith('creator') && field.name !== 'title')
                .map(field => {
                const dataKey = field.name.includes('.') ? field.name.split('.')[1] : field.name;
                
                // Handling the "Creator.xxx" label logic consistent with Provider
                const displayLabel = field.label.includes('.') ? 
                    (field.label.split('.')[1].charAt(0).toUpperCase() + field.label.split('.')[1].slice(1)) : 
                    field.label;

                return (
                  <div key={field.name} className="detail-entry">
                    <label>{displayLabel}</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="edit-field"
                        value={Array.isArray(editData[dataKey]) ? editData[dataKey].join(', ') : (editData[dataKey] || '')}
                        onChange={(e) => handleDynamicChange(field.name, e.target.value, field.type)}
                      />
                    ) : (
                      <p>{Array.isArray(media[dataKey]) ? media[dataKey].join(', ') : (media[dataKey] || 'N/A')}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="media-full-description">
          <h2>Summary</h2>
          <div className="description-separator"></div>
          {isEditing ? (
            <textarea
              className="edit-area-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          ) : (
            <div className="text-content">{description || "No description provided."}</div>
          )}

          {isEditing && (
            <div className="save-footer">
              <button 
                className="revert-button detail-revert-btn" 
                onClick={handleRevert}
                disabled={!hasChanges()}
                title="Discard unsaved changes"
              >
                Revert Changes ↺
              </button>
              <button 
                className="confirm-save-btn" 
                onClick={handleSave}
                disabled={!hasChanges()}
              >
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Media;