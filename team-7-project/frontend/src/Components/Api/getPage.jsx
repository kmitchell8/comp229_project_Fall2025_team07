export const getPage = () => {
    // to see full setup instructions see file Project/path_extraction.docx        
    const path = window.location.pathname;
    const segments = path.split('/');
    const lastSegment = segments.pop() || '';

    if (!lastSegment) {
        return 'index';
    }
    //remove ".html" to get only the value for the page name
    const getSegmentName = lastSegment.replace(/\.[^/.]+$/, '');
    //
    // return the last segment of the path without the .html portion
    return getSegmentName;
};

export const getHash = () => {
    const hash = window.location.hash.slice(1);
    //replace any leading/trailing slashes to keep the string clean.
    return hash.replace(/^\/|\/$/g, "");//return the name of the hash
}

