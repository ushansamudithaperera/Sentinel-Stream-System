import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:5000/api/auth/me', { withCredentials: true })
      .then(res => setUserRole(res.data.role))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/auth/logout', {}, { withCredentials: true });
    } catch (_) {
      // ignore
    }
    navigate('/login');
  };

  const navLink = (to, label) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        className={`text-sm font-mono tracking-wider uppercase transition-colors relative px-1 pb-px ${
          active
            ? 'text-cyan-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-cyan-400'
            : 'text-gray-400 hover:text-cyan-300'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav className="bg-gray-950/95 backdrop-blur border-b border-gray-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded border border-cyan-700 bg-cyan-950/60">
            <span className="text-cyan-400 text-sm font-bold">⚡</span>
          </div>
          <div className="font-bold text-lg tracking-widest">
            <span className="text-white">Sentinel</span><span className="text-cyan-400">Stream</span>
          </div>
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1 ml-2 text-xs font-mono text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            LIVE
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-6">
          {navLink('/dashboard', 'Dashboard')}
          {userRole === 'admin' && navLink('/forensics', 'Forensics')}
          {/* Role badge */}
          {userRole && (
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
              userRole === 'admin'
                ? 'text-cyan-400 border-cyan-800 bg-cyan-950/60'
                : 'text-yellow-400 border-yellow-800 bg-yellow-950/60'
            }`}>
              {userRole.toUpperCase()}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-xs font-mono tracking-widest uppercase px-3 py-1.5 rounded border border-red-700 text-red-400 hover:bg-red-900/30 hover:border-red-500 hover:text-red-300 transition-all"
          >
            [ Logout ]
          </button>
        </div>
      </nav>
      {/* Cyan accent line */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
    </>
  );
};

export default Navbar;
