import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const severityConfig = {
  High:   { bar: 'bg-red-500',    badge: 'bg-red-950/60 text-red-400 border-red-700',    dot: 'bg-red-500'    },
  Medium: { bar: 'bg-yellow-500', badge: 'bg-yellow-950/60 text-yellow-400 border-yellow-700', dot: 'bg-yellow-500' },
  Low:    { bar: 'bg-green-500',  badge: 'bg-green-950/60 text-green-400 border-green-700',  dot: 'bg-green-500'  },
};

const typeIcon = { DDoS: '🌊', BruteForce: '🔨', Anomaly: '⚡', default: '⚠' };

const Forensics = () => {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [filter, setFilter]   = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        // Role guard: viewers are not permitted to access forensic logs
        const meRes = await axios.get('http://localhost:5000/api/auth/me', { withCredentials: true });
        if (meRes.data.role !== 'admin') {
          navigate('/dashboard');
          return;
        }
        const res = await axios.get('http://localhost:5000/api/logs', { withCredentials: true });
        setLogs(res.data);
      } catch (err) {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Failed to load logs.');
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [navigate]);

  const types = ['All', ...Array.from(new Set(logs.map(l => l.type)))];
  const filtered = filter === 'All' ? logs : logs.filter(l => l.type === filter);

  const highCount   = logs.filter(l => l.severity === 'High').length;
  const medCount    = logs.filter(l => l.severity === 'Medium').length;
  const lowCount    = logs.filter(l => l.severity === 'Low').length;

  return (
    <div className="relative min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <div className="cyber-grid pointer-events-none" aria-hidden />
      <div className="scanline pointer-events-none" aria-hidden />

      <div className="relative z-10 p-6 max-w-screen-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <p className="font-mono text-xs text-cyan-600 tracking-widest uppercase mb-1">// incident records</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Forensics <span className="text-gray-400 font-normal">&amp; Historical Logs</span>
          </h1>
        </div>

        {/* Stats row */}
        {!loading && !error && logs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Events', value: logs.length, color: 'text-cyan-400', border: 'border-cyan-900' },
              { label: 'High Severity', value: highCount,  color: 'text-red-400',   border: 'border-red-900' },
              { label: 'Medium',        value: medCount,   color: 'text-yellow-400', border: 'border-yellow-900' },
              { label: 'Low',           value: lowCount,   color: 'text-green-400',  border: 'border-green-900' },
            ].map(({ label, value, color, border }) => (
              <div key={label} className={`bg-gray-900/70 border ${border} rounded-lg px-4 py-3`}>
                <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-2xl font-extrabold font-mono ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 py-12 justify-center text-gray-500 font-mono text-sm">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Loading encrypted logs...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-700 rounded-lg p-5 mb-6">
            <span className="text-red-400 text-lg mt-0.5">⚠</span>
            <div className="text-sm">
              <p className="text-red-300 font-semibold mb-1">{error}</p>
              <p className="text-red-500/80">Try logging in first or check if backend is running.</p>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && logs.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">🛡️</p>
            <p className="font-mono text-sm text-green-400">// no incidents recorded — system clean</p>
          </div>
        )}

        {/* Table */}
        {!loading && logs.length > 0 && (
          <div className="bg-gray-900/70 border border-gray-800 rounded-lg overflow-hidden shadow-xl">

            {/* Panel header + filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 border-b border-gray-800 bg-gray-900/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-mono font-semibold tracking-widest uppercase text-gray-300">
                  Incident Log — {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
              {/* Type filter pills */}
              <div className="flex flex-wrap gap-2">
                {types.map(t => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`text-xs font-mono px-3 py-1 rounded border transition-all ${
                      filter === t
                        ? 'bg-cyan-500 border-cyan-500 text-gray-950 font-bold'
                        : 'border-gray-700 text-gray-500 hover:border-cyan-700 hover:text-cyan-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Timestamp', 'Type', 'Severity', 'Details'].map(col => (
                      <th key={col} className="px-5 py-3 text-left text-xs font-mono font-semibold text-gray-500 uppercase tracking-widest">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => {
                    const sev = severityConfig[log.severity] || severityConfig.Low;
                    const icon = typeIcon[log.type] || typeIcon.default;
                    return (
                      <tr
                        key={log._id}
                        className={`border-b border-gray-800/60 transition-colors hover:bg-gray-800/40 ${
                          i % 2 === 0 ? 'bg-transparent' : 'bg-gray-900/30'
                        }`}
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="font-mono text-xs text-gray-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <Link
                            to={`/alert/${log._id}`}
                            className="flex items-center gap-2 group"
                          >
                            <span className={`w-1 h-8 rounded-full ${sev.bar} shrink-0`} />
                            <span className="text-sm">{icon}</span>
                            <span className="font-mono font-semibold text-sm text-gray-200 group-hover:text-cyan-400 transition-colors">
                              {log.type}
                            </span>
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono font-semibold ${sev.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                            {log.severity}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            to={`/alert/${log._id}`}
                            className="font-mono text-xs text-gray-400 hover:text-cyan-400 transition-colors line-clamp-1 max-w-md block"
                          >
                            {log.details || 'No details'}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Forensics;