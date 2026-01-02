// routingConfig.js

export const ROUTES = {
    // Access Views
    LOGIN: 'login',
    REGISTER: 'register',
    RESET: 'reset',

    // Profile & Admin Views
    PROFILE: 'profile',
    ADMIN: 'admin',
    
    // Admin Sub-Views
    CREATE_MEDIA: 'createmedia',
    UPDATE_MEDIA: 'updatemedia',
    UPDATE_USER: 'updateuser',

    // Library Views
    LIBRARY: 'library',
    MEDIA: 'media'
};

// Groups for the include() checks in your logic
export const PROFILE_VIEWS = [ROUTES.PROFILE, ROUTES.ADMIN];
export const ACCESS_VIEWS = [ROUTES.REGISTER, ROUTES.LOGIN, ROUTES.RESET];
export const ADMIN_SUB_VIEWS = [ROUTES.CREATE_MEDIA, ROUTES.UPDATE_MEDIA, ROUTES.UPDATE_USER, ROUTES.ADMIN];
export const LIBRARY_VIEWS = [ROUTES.LIBRARY, ROUTES.MEDIA];