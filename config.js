// Get the local IP address of your machine where Django is running
const LOCAL_IP = '127.0.0.1:8000'; // Replace with your actual IP address

const DEV_API_URL = 'http://' + LOCAL_IP;
const PROD_API_URL = 'https://' + LOCAL_IP; // Replace with your production URL

export const API_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

// For debugging
console.log('API_URL:', API_URL);

export const APP_VERSION = '1.0.0';
export const APP_NAME = 'RxDoctor';