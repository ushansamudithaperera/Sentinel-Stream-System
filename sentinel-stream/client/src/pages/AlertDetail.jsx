import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const sevConfig = {
  High:   { badge: 'bg-red-950/60 text-red-400 border-red-700',    bar: 'border-red-500',    dot: 'bg-red-500'    },
  Medium: { badge: 'bg-yellow-950/60 text-yellow-400 border-yellow-700', bar: 'border-yellow-500', dot: 'bg-yellow-500' },
  Low:    { badge: 'bg-green-950/60 text-green-400 border-green-700',  bar: 'border-green-500',  dot: 'bg-green-500'  },
};
const typeIcon = { DDoS: '🌊', BruteForce: '🔨', Anomaly: '⚡', default: '⚠' };

const Field = ({ label, children }) => (
  <div className="bg-gray-900/60 border border-gray-800 rounded-lg px-4 py-3">
    <p className="font-mono text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</p>
    <div className="font-mono text-sm text-gray-200">{children}</div>
  </div>
);

const AlertDetail = () => {
  const { id } = useParams();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    const fetchAlert = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/alerts/${id}`, { withCredentials: true });
        setAlert(res.data);
      } catch (err) {
        setError('Failed to load alert details. Check if you are logged in as admin.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlert();
  }, [id]);

  const sev  = sevConfig[alert?.severity] || sevConfig.Low;
  const icon = typeIcon[alert?.type] || typeIcon.default;

  return (
    <div className="relative min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <div className="cyber-grid pointer-events-none" aria-hidden />
      <div className="scanline pointer-events-none" aria-hidden />

      <div className="relative z-10 p-6 max-w-4xl mx-auto">

        {/* Breadcrumb */}
        <Link
          to="/forensics"
          className="inline-flex items-center gap-1 font-mono text-xs text-gray-500 hover:text-cyan-400 transition-colors mb-6"
        >
          ← forensics / incident
        </Link>

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 py-16 justify-center text-gray-500 font-mono text-sm">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Decrypting incident record...
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-start gap-3 bg-red-950/40 border border-red-700 rounded-lg p-5">
            <span className="text-red-400 text-lg mt-0.5">⚠</span>
            <div className="text-sm">
              <p className="text-red-300 font-semibold mb-1">Access Denied</p>
              <p className="text-red-500/80">{error}</p>
            </div>
          </div>
        )}

        {/* Not found */}
        {!loading && !error && !alert && (
          <div className="py-16 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-mono text-sm text-gray-500">// no record found for ID: {id}</p>
          </div>
        )}

        {/* Alert card */}
        {!loading && alert && (
          <>
            {/* Page title */}
            <div className="mb-6">
              <p className="font-mono text-xs text-cyan-600 tracking-widest uppercase mb-1">// incident report</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
                <span>{icon}</span>
                <span>{alert.type}</span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono font-semibold ${sev.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                  {alert.severity}
                </span>
              </h1>
            </div>

            {/* Card */}
            <div className={`bg-gray-900/70 border border-gray-800 border-l-4 ${sev.bar} rounded-lg overflow-hidden shadow-xl`}>

              {/* Terminal header */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-800 bg-gray-900/50">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-mono text-xs text-gray-500 tracking-widest uppercase">incident_id: {alert._id || id}</span>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Alert ID">
                  <span className="break-all text-cyan-400">{alert._id || id}</span>
                </Field>

                <Field label="Timestamp">
                  {new Date(alert.timestamp).toLocaleString()}
                </Field>

                <Field label="Attack Type">
                  <span className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span className="text-white font-semibold">{alert.type}</span>
                  </span>
                </Field>

                <Field label="Severity">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono font-semibold ${sev.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                    {alert.severity}
                  </span>
                </Field>

                {alert.duration != null && (
                  <Field label="Attack Duration">
                    <span className="text-cyan-400 font-bold">{alert.duration}s</span>
                    {alert.attackStartedAt && alert.attackEndedAt && (
                      <span className="text-gray-500 text-xs ml-2">
                        ({new Date(alert.attackStartedAt).toLocaleTimeString()} — {new Date(alert.attackEndedAt).toLocaleTimeString()})
                      </span>
                    )}
                  </Field>
                )}
              </div>

              {/* Details */}
              <div className="px-5 pb-5">
                <Field label="Analysis / Details">
                  <p className="whitespace-pre-wrap text-gray-300 leading-relaxed mt-1">
                    {alert.details || '// no additional details available'}
                  </p>
                </Field>
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-800 bg-gray-900/40 flex justify-between items-center">
                <span className="font-mono text-xs text-gray-600">sentinel-stream // forensic module</span>
                <div className="flex items-center gap-4">
                  <Link
                    to="/dashboard"
                    className="font-mono text-xs text-cyan-600 hover:text-cyan-400 transition-colors"
                  >
                    → Dashboard
                  </Link>
                  <Link
                    to="/forensics"
                    className="font-mono text-xs text-cyan-600 hover:text-cyan-400 transition-colors"
                  >
                    → Forensics
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AlertDetail;