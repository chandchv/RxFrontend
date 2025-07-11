    // Get the local IP address of your machine where Django is running
const LOCAL_IP = '192.168.29.59:8000'; // Replace with your actual IP address

const DEV_API_URL = 'https://15.207.11.86/app/';
const PROD_API_URL = 'https://15.207.11.86/app/'; // Replace with your production URL

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

// For debugging
console.log('API_URL:', API_URL);

export const APP_VERSION = '1.0.0';
export const APP_NAME = 'RxApp'; 