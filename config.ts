// Explicitly declare the global variable
declare const __DEV__: boolean;

// Use a default value if __DEV__ is undefined
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

export const API_URL = isDevelopment
  ? 'https://react-native-billsplitter.onrender.com' // Dev
  : 'https://react-native-billsplitter.onrender.com'; // Prod
