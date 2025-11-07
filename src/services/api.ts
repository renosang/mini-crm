import axios from 'axios';

// Tạo một instance axios
const api = axios.create({
  baseURL: '/api', // Backend của bạn chạy trên Vercel tại /api
});

// Thêm một interceptor (bộ chặn) request
api.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;