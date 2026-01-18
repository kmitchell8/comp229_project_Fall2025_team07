import { useCallback } from 'react';
import { ROUTES } from '../Api/routingConfig';


//see 'overall_progress_track_5.docx'
/**
 * useAppNavigator - A custom hook to manage hybrid navigation.
 * This replaces direct window.location calls to provide a central
 * point for interceptors (e.g., unsaved changes) and global transitions.
 */
export const useAppNavigator = (hasUnsavedChanges = false) => {

    const navigate = useCallback((targetUrl, useHash = false) => {
        // 1. Interceptor Logic: Guard against losing work
        if (hasUnsavedChanges) {
            const confirmLeave = window.confirm("You have unsaved changes. Are you sure you want to leave?");
            if (!confirmLeave) return;
        }

        // 2. Transition Trigger: Dispatch global event for the UI to "Fade Out"
        const navEvent = new CustomEvent('app-nav-start', { detail: { target: targetUrl } });
        window.dispatchEvent(navEvent);

        // 3. Execution: Small delay allows the "Fade Out" animation to begin
        setTimeout(() => {
            if (useHash) {
                window.location.hash = targetUrl;
            } else {
                window.location.href = targetUrl;
            }
        }, 150); // Matches the CSS transition time
    }, [hasUnsavedChanges]);

    const goToLibrary = () => navigate('./library.html');
    const goToProfile = (hash = '') => navigate(`./profile.html${hash ? '#' + hash : ''}`);
    const goBackHome = () => navigate('./');

    return { navigate, goToLibrary, goToProfile, goBackHome };
};