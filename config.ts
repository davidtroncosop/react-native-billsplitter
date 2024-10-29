// Development server URL
export const DEV_API_URL = 'http://192.168.100.13:3001';

// Production server URL (update this when you have a production server)
export const PROD_API_URL = 'https://your-production-url.com';

// Use this to determine which URL to use
export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
