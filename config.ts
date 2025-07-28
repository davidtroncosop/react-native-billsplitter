// Explicitly declare the global variable
declare const __DEV__: boolean;

// Use a default value if __DEV__ is undefined
const isDevelopment = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

// API URL para Cloudflare Workers
export const API_URL = isDevelopment 
  ? 'https://billsplitter.davidtroncosop.workers.dev' // Dev
  : 'https://billsplitter.davidtroncosop.workers.dev'; // Prod
