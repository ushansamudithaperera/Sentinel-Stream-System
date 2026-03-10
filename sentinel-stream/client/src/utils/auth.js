import axios from 'axios';

// Returns { id, role } for the logged-in user, or null
export const getUser = async () => {
  try {
    const res = await axios.get('http://localhost:5000/api/auth/me', { withCredentials: true });
    return res.data;
  } catch {
    return null;
  }
};

// Check if the user is currently authenticated
export const isAuthenticated = async () => {
  const user = await getUser();
  return user !== null;
};

// Redirect to login if not authenticated
export const requireAuth = async (navigate) => {
  const authed = await isAuthenticated();
  if (!authed) navigate('/login');
};
