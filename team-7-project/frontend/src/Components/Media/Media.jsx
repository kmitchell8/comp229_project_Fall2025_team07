import React, { useState, useEffect, useCallback } from 'react';
import mediaApi from '../Api/mediaApi';
import { useAuth } from '../StateProvider/authState/useAuth';
import { useMedia } from '../StateProvider/mediaState/useMedia'; 
import { ROUTES } from '../Api/routingConfig';
import './Media.css';

const Media = ({ mediaId, viewContext, onUpdate }) => {
  const { getToken, isAdmin } = useAuth();
  const { mediaTypeConfigs, refreshMedia, genres:masterGenres} = useMedia();

  const [media, setMedia] = useState(null);
  const [editData, setEditData] = useState(null); 
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [genres, setGenres] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isLibraryView = viewContext === ROUTES.LIBRARY;
  const isAdminView = viewContext === ROUTES.ADMIN;

  // Optimized Fetcher
  const fetchFullDetails = useCallback(async () => {
    if (!mediaId) return;
    try {
      setLoading(true);
      const data = await mediaApi.read(mediaId);
      /*const [data, genreList] = await Promise.all([
        mediaApi.read(mediaId),
        mediaApi.getConfigDoc('genres')
      ]);*/

      setMedia(data);
      setEditData(JSON.parse(JSON.stringify(data))); 
      setGenres(masterGenres);

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
  }, [mediaId, masterGenres]);

  useEffect(() => {
    fetchFullDetails();
  }, [fetchFullDetails]);

  // Handle complex data types (Preserved logic)
  const handleDynamicChange = (key, value, inputType) => {
    setEditData(prev => {
      let finalValue = value;
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

  // State Comparison Logic (Preserved)
  const hasChanges = () => {
    if (!media || !editData) return false;
    const currentConfig = mediaTypeConfigs[media.mediaType] || [];
    const keysToCheck = [
        'title', 
        'genre', 
        ...currentConfig.map(f => f.name.includes('.') ? f.name.split('.')[1] : f.name)
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

  const handleRevert = () => setEditData(JSON.parse(JSON.stringify(media)));
  const handleCancel = () => { handleRevert(); setIsEditing(false); };

  const handleSave = async () => {
    try {
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
      refreshMedia(); 
      onUpdate?.(); 
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  // Helper for Creator Info (Correction Implemented)
  const getCreatorInfo = (item) => {
    const config = mediaTypeConfigs[item.mediaType];
    const field = config?.find(f => f.name.startsWith('creator'));
    if (!field) return { label: "", value: "" };
    const key = field.name.split('.')[1] || field.name;
    const label = field.label.split('.')[1] || field.label;
    return { label: label.charAt(0).toUpperCase() + label.slice(1), value: item[key] || "" };
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
                  <h3 className="media-creator-sub">
                    {getCreatorInfo(media).value}
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
                        {genres.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                ) : <p>{media.genre || 'N/A'}</p>}
              </div>

              {mediaTypeConfigs[media.mediaType]
                ?.filter(field => !field.name.startsWith('creator') && field.name !== 'title')
                .map(field => {
                  const dataKey = field.name.includes('.') ? field.name.split('.')[1] : field.name;
                  return (
                    <div key={field.name} className="detail-entry">
                      <label>{field.label.includes('.') ? field.label.split('.')[1].toUpperCase() : field.label}</label>
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
                  );
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
              <button className="revert-btn" onClick={handleRevert} disabled={!hasChanges()}>
                ↺
              </button>
              <button className="confirm-save-btn" onClick={handleSave} disabled={!hasChanges()}>
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