// routingConfig.js



export const ROUTES = {
    // Access Views
    LOGIN: 'login',
    REGISTER: 'register',
    RESET: 'reset',
    REGISTER_LIBRARY: 'registerlibrary',

    // Profile & Admin Views
    PROFILE: 'profile',
    ADMIN: 'admin',
    LIBRARY_ADMIN: 'libraryadmin',
    BRANCH_ADMIN: 'branchadmin',

    // Admin Sub-Views
    CREATE_MEDIA: 'createmedia',
    UPDATE_MEDIA: 'updatemedia',
    UPDATE_USER: 'updateuser',
    CREATE_BRANCH: 'createbranch',
    UPDATE_BRANCH: 'updatebranch',

    // Library Views
    LIBRARY: 'library',
    //empty strings because these segments are purely ID-based
    LIBRARY_TENANT: '',
    BRANCH: '',
    MEDIA: 'media'




};

// Groups for the include() checks 
export const PROFILE_VIEWS = [
    ROUTES.PROFILE,
    ROUTES.ADMIN,
    ROUTES.LIBRARY_ADMIN,
    ROUTES.BRANCH_ADMIN
];

export const ROLE_TO_ROUTE_MAP = {
    'admin': ROUTES.ADMIN,
    'libraryAdmin': ROUTES.LIBRARY_ADMIN,
    'branchAdmin': ROUTES.BRANCH_ADMIN
};
export const ACCESS_VIEWS = [
    ROUTES.REGISTER,
    ROUTES.LOGIN,
    ROUTES.RESET,
    ROUTES.REGISTER_LIBRARY
];
export const ADMIN_SUB_VIEWS = [
    ROUTES.CREATE_MEDIA,
    ROUTES.UPDATE_MEDIA,
    ROUTES.UPDATE_USER,
    ROUTES.CREATE_BRANCH,
    ROUTES.UPDATE_BRANCH
];
export const LIBRARY_VIEWS = [
    ROUTES.LIBRARY,
    ROUTES.LIBRARY_TENANT,
    ROUTES.BRANCH,
    ROUTES.MEDIA
];