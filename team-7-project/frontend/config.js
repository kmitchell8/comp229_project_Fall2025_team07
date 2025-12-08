const DEV_URL = 'http://localhost:5000/api';

// Vite injects environment variables that start with VITE_
const PROD_URL = import.meta.env.VITE_API_URL;
export const API_URL = PROD_URL ? PROD_URL : DEV_URL;