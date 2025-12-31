import React, { useState, useEffect, useCallback } from 'react';
import mediaApi from '../Api/mediaApi';
import { useAuth } from '../authState/useAuth';
import './Media.css';

const Media = ({ mediaId, viewContext, onUpdate }) => {
  const { role, getToken } = useAuth();

  // State management for raw data and the editable draft
  const [media, setMedia] = useState(null);
  const [editData, setEditData] = useState(null); 
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [genres, setGenres] = useState([]); 
  const [mediaTypesConfig, setMediaTypesConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = role === 'admin';
  const isLibraryView = viewContext === 'library';
  const isAdminView = viewContext === 'admin';

  // Core data fetching logic for media details, dynamic config, and genre list
  const fetchFullDetails = useCallback(async () => {
    if (!mediaId) return;
    try {
      setLoading(true);
      const [data, config, genreList] = await Promise.all([
        mediaApi.read(mediaId),
        mediaApi.getMediaTypes(),
        mediaApi.getGenres()
      ]);

      setMedia(data);
      setEditData(JSON.parse(JSON.stringify(data))); 
      setMediaTypesConfig(config);
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
      return { ...prev, [key]: finalValue };
    });
  };

  // Compares original state with draft state to determine if UI should show "unsaved" status
  const hasChanges = () => {
    if (!media || !editData) return false;
    
    // We check core fields and type-specific fields defined in config
    const mediaType = media.mediaType;
    const baseFields = ['title', 'genre'];
    const typeFields = mediaTypesConfig[mediaType]?.map(f => f.name) || [];
    const keysToCheck = [...new Set([...baseFields, ...typeFields])];

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
      const allowedKeys = ['title', 'genre', ...(mediaTypesConfig[media.mediaType]?.map(f => f.name) || [])];
      const updatePayload = allowedKeys.reduce((acc, key) => {
        if (editData[key] !== undefined) acc[key] = editData[key];
        return acc;
      }, {});

      await mediaApi.update(updatePayload, mediaId, getToken);
      
      setMedia(JSON.parse(JSON.stringify(editData)));
      setIsEditing(false);
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
                <button className="media-back-btn" onClick={() => window.location.hash = 'library'}>
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
                <h1>{media.title}</h1>
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

              {mediaTypesConfig[media.mediaType]?.map(field => (
                <div key={field.name} className="detail-entry">
                  <label>{field.label}</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="edit-field"
                      value={Array.isArray(editData[field.name]) ? editData[field.name].join(', ') : (editData[field.name] || '')}
                      onChange={(e) => handleDynamicChange(field.name, e.target.value, field.type)}
                    />
                  ) : (
                    <p>{Array.isArray(media[field.name]) ? media[field.name].join(', ') : (media[field.name] || 'N/A')}</p>
                  )}
                </div>
              ))}
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