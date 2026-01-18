import React, { useState, useEffect, useCallback, /*useMemo */ } from 'react';
import mediaApi from '../Api/mediaApi';
import { useAuth } from '../StateProvider/authState/useAuth';
import { useMedia } from '../StateProvider/mediaState/useMedia';
import { useLibrary } from '../StateProvider/libraryState/useLibrary';
import { ROUTES, ROLE_TO_ROUTE_MAP } from '../Api/routingConfig';
import { getHash } from '../Api/getPage';
import './Media.css';

const Media = ({ mediaId, viewContext, onUpdate }) => {
  const { getToken, userRole } = useAuth();
  const {
    mediaTypeConfigs, genres: masterGenres,
    formatValueForField, fetchFullDetails,
    getCreatorInfo, checkHasChanges, handleSave: saveMedia,
    mediaTenantId, mediaBranchId, refreshMedia, handleRevert: getRevertedData,
  } = useMedia();

  const { refreshLibrary, currentLibrary, currentBranch } = useLibrary();

  const [media, setMedia] = useState(null);
  const [editData, setEditData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Context resolution logic restored from original file
  const tenantId = currentLibrary?._id;
  const branchId = currentBranch?._id;
  const isMasterView = !tenantId || !mediaTenantId;

  // RESTORED: Admin access check now properly references the media's owner IDs
  const adminAccess = (tenantId === mediaTenantId) || (branchId === mediaBranchId);

  const isLibraryView = viewContext === ROUTES.LIBRARY;
  const isAdminView = viewContext === ROLE_TO_ROUTE_MAP[userRole] || viewContext === ROUTES.ADMIN;

  const loadMediaDetails = useCallback(async () => {
    if (!mediaId) return;
    try {
      setLoading(true);
      const result = await fetchFullDetails(mediaId);
      if (result) {
        setMedia(result.media);
        setEditData(JSON.parse(JSON.stringify(result.media)));
        setDescription(result.description);
      }
      // eslint-disable-next-line no-unused-vars
    } catch (e) {
      setError("Failed to load media details.");
    } finally { setLoading(false); }
  }, [mediaId, fetchFullDetails]);

  useEffect(() => { loadMediaDetails(); }, [loadMediaDetails]);

  const handleDynamicChange = (key, value, inputType) => {
    const dataKey = key.includes('.') ? key.split('.')[1] : key;
    const finalValue = formatValueForField(value, inputType);
    setEditData(prev => ({ ...prev, [dataKey]: finalValue }));
  };

  const handleSave = async () => {
    try {
      await saveMedia(media, editData, description, getToken);
      setIsEditing(false);
      refreshMedia(); // Refresh provider list
      refreshLibrary?.(); // Refresh library context
      onUpdate?.();
      loadMediaDetails(); // Sync fresh local data
    } catch (err) { alert("Update failed: " + err.message); }
  };

  const resetForm = () => {
    const reverted = getRevertedData(media);
    if (reverted) {
      setEditData(reverted.editData);
      setDescription(reverted.description);
    }
  };

  const handleCancel = () => {
    resetForm();
    setIsEditing(false);
  };

  const handleBackToLibrary = () => {
    const path = getHash();
    if (!mediaTenantId) {
      window.location.hash = ROUTES.LIBRARY;
      return;
    }

    if (path.includes(mediaTenantId)) {
      const tenantIndex = path.indexOf(mediaTenantId);
      const endOfTenant = tenantIndex + mediaTenantId.length;
      const trailingPath = path.substring(endOfTenant);

      if (trailingPath.length > 1) {
        const lastSlashIndex = path.lastIndexOf('/');
        window.location.hash = path.substring(0, lastSlashIndex);
      } else {
        window.location.hash = ROUTES.LIBRARY;
      }
    } else {
      window.location.hash = ROUTES.LIBRARY;
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
            <div className="media-cover-frame"><img src={mediaApi.getCoverUrl(media.cover)} alt={media.title} /></div>
            <div className="media-action-bar">
              {/* Check fixed to use proper logic flags */}
              {isAdminView && adminAccess && !isLibraryView && (
                <button
                  className={`admin-edit-toggle ${isEditing ? 'editing' : ''}`}
                  onClick={() => isEditing ? handleCancel() : setIsEditing(true)}
                >
                  {isEditing ? "Cancel" : "Edit Media"}
                </button>
              )}
              {isLibraryView && (
                <button className="media-back-btn" onClick={handleBackToLibrary}>
                  Back to Library
                </button>
              )}
            </div>
          </div>
          <div className="media-info-pane">
            <header className="media-title-area">
              {isEditing ? <input className="edit-input-title" value={editData.title} onChange={(e) => handleDynamicChange('title', e.target.value, 'text')} /> : (
                <><h1>{media.title}</h1><h3 className="media-creator-sub">{getCreatorInfo(media).value}</h3></>
              )}
              <span className="media-badge">{media.mediaType}</span>
            </header>
            <div className="media-details-grid">
              <div className="detail-entry">
                <label>Genre</label>
                {isEditing ? (
                  <select className="edit-field" value={editData.genre || ''} onChange={(e) => handleDynamicChange('genre', e.target.value, 'select')}>
                    {masterGenres.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : <p>{media.genre || 'N/A'}</p>}
              </div>
              {mediaTypeConfigs[media.mediaType]?.filter(f => !f.name.startsWith('creator') && f.name !== 'title').map(field => {
                const k = field.name.includes('.') ? field.name.split('.')[1] : field.name;
                return (
                  <div key={field.name} className="detail-entry">
                    <label>{field.label.includes('.') ? field.label.split('.')[1].toUpperCase() : field.label}</label>
                    {isEditing ? <input type="text" className="edit-field" value={Array.isArray(editData[k]) ? editData[k].join(', ') : (editData[k] || '')} onChange={(e) => handleDynamicChange(field.name, e.target.value, field.type)} /> : <p>{Array.isArray(media[k]) ? media[k].join(', ') : (media[k] || 'N/A')}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="media-availability-zone">
          <div className="availability-card">
            <label>{isMasterView ? "Available at these Libraries" : `Available at Branches in ${currentLibrary?.name}`}</label>
            {isMasterView ? (
              <select className="library-navigator-select" onChange={(e) => window.location.hash = `${ROUTES.LIBRARY}/${e.target.value}`}>
                <option value="">Select a Library...</option>
                {media.holdings?.map(h => <option key={h.libraryId} value={h.libraryId}>{h.libraryName}</option>)}
              </select>
            ) : (
              <ul className="branch-availability-list">
                {media.holdings?.filter(h => h.libraryId === tenantId).map(h => <li key={h.branchId} className="branch-tag">{h.branchName || "Main Branch"}</li>)}
              </ul>
            )}
          </div>
        </div>

        <div className="media-full-description">
          <h2>Summary</h2>
          <div className="description-separator"></div>
          {isEditing ? <textarea className="edit-area-description" value={description} onChange={(e) => setDescription(e.target.value)} /> : <div className="text-content">{description || "No description provided."}</div>}
          {isEditing && (
            <div className="save-footer">
              <button
                className="confirm-save-btn"
                onClick={handleSave}
                disabled={!checkHasChanges(media, editData, description)}
              >
                Save Changes
              </button>
              <button
                className="revert-btn"
                onClick={resetForm} // Just calls the reset
                disabled={!checkHasChanges(media, editData, description)}
              >
                ↺
              </button>
            </div>
          )}
        </div>

      </div>


    </div>
  );
};

export default Media;