import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: API_URL,
    withCredentials: true,  // Important for CSRF
    headers: {
        'Content-Type': 'application/json',
    },
});

export default axiosInstance; 