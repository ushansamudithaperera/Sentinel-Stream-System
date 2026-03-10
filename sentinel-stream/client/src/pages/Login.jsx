import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

// Animated typing text
const TYPING_LINES = [
  'Initializing secure channel...',
  'Verifying JWT credentials...',
  'Establishing encrypted tunnel...',
  'Loading threat detection engine...',
];

function TypingLine() {
  const [lineIdx, setLineIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    const line = TYPING_LINES[lineIdx];
    if (charIdx < line.length) {
      const t = setTimeout(() => {
        setDisplayed((p) => p + line[charIdx]);
        setCharIdx((c) => c + 1);
      }, 40);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => {
        setDisplayed('');
        setCharIdx(0);
        setLineIdx((i) => (i + 1) % TYPING_LINES.length);
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [charIdx, lineIdx]);

  return (
    <span className="text-cyan-400 font-mono text-xs">
      {displayed}<span className="animate-pulse">▌</span>
    </span>
  );
}

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post(
        'http://localhost:5000/api/auth/login',
        { username, password },
        { withCredentials: true }
      );
      window.location.href = '/dashboard';
    } catch (err) {
      const msg = err.response?.data?.msg || 'Login failed. Check server is running.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-950 flex items-center justify-center overflow-hidden">

      {/* Cyber grid + scanline */}
      <div className="cyber-grid pointer-events-none" aria-hidden />
      <div className="scanline pointer-events-none" aria-hidden />

      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to home */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-20 text-sm text-gray-500 hover:text-cyan-400 transition-colors flex items-center gap-1"
      >
        ← Back to Home
      </Link>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">

        {/* Top accent bar */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent mb-px" />

        <div className="bg-gray-900/90 backdrop-blur border border-gray-700 rounded-b-xl rounded-t-none shadow-2xl shadow-cyan-900/20 overflow-hidden">

          {/* Terminal title bar */}
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/80 border-b border-gray-700">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            <span className="ml-2 font-mono text-xs text-gray-400">auth@sentinel-stream:~</span>
          </div>

          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border border-cyan-700 bg-cyan-950/50 mb-4">
                <span className="text-2xl">🛡️</span>
              </div>
              <h1 className="text-xl font-extrabold tracking-widest text-white uppercase">
                Sentinel<span className="text-cyan-400">Stream</span>
              </h1>
              <p className="text-xs text-gray-500 mt-1 tracking-wider uppercase">Secure Access Portal</p>
            </div>

            {/* Typing indicator */}
            <div className="mb-6 h-5 font-mono text-xs text-gray-600 flex items-center gap-1">
              <span className="text-green-500">$</span>
              <TypingLine />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-red-950/60 border border-red-700 rounded text-red-400 text-sm">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors text-sm">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  autoComplete="username"
                  className="w-full pl-9 pr-4 py-3 bg-gray-800 text-white text-sm rounded border border-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder-gray-600 font-mono"
                />
              </div>

              <div className="relative group">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors text-sm">🔑</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                  className="w-full pl-9 pr-4 py-3 bg-gray-800 text-white text-sm rounded border border-gray-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder-gray-600 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative w-full py-3 mt-2 rounded font-bold text-sm tracking-widest uppercase transition-all overflow-hidden
                  bg-cyan-500 hover:bg-cyan-400 text-gray-950
                  disabled:bg-cyan-900 disabled:text-gray-500
                  shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/40"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Authenticating...
                  </span>
                ) : (
                  'Authenticate →'
                )}
              </button>
            </form>

            {/* Footer note */}
            <p className="mt-6 text-center text-xs text-gray-600 font-mono">
              <span className="text-green-500">✓</span> JWT · HTTP-Only Cookies · bcrypt-12
            </p>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mt-px" />
      </div>
    </div>
  );
};

export default Login;
