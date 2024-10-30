// Development server URL
export const DEV_API_URL = 'https://react-native-billsplitter-production.up.railway.app';

// Production server URL
export const PROD_API_URL = 'https://react-native-billsplitter-production.up.railway.app';

// Use this to determine which URL to use
export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
