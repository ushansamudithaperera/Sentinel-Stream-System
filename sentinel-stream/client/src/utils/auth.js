import axios from 'axios';

// Check if the user is currently authenticated by hitting a lightweight protected endpoint
export const isAuthenticated = async () => {
  try {
    await axios.get('http://localhost:5000/api/logs', { withCredentials: true });
    return true;
  } catch {
    return false;
  }
};

// Redirect to login if not authenticated
export const requireAuth = async (navigate) => {
  const authed = await isAuthenticated();
  if (!authed) navigate('/login');
};
