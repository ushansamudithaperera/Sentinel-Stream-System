import axios from 'axios';

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response.status === 401) {
      // Refresh token
      await axios.post('http://localhost:5000/api/auth/refresh', {}, { withCredentials: true });
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);