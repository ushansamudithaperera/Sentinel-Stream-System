import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const socket = io('http://localhost:5000');

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-900 border border-cyan-800 rounded px-3 py-2 text-xs font-mono shadow-lg shadow-cyan-900/30">
        <p className="text-gray-400">{label}</p>
        <p className="text-cyan-400">rate: <span className="text-white">{payload[0].value}</span></p>
      </div>
    );
  }
  return null;
};

function ConfirmDialog({ confirm, onConfirm, onCancel, loading }) {
  if (!confirm.open) return null;
  const isBlock = confirm.action === 'block';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`w-full max-w-sm mx-4 rounded-xl border shadow-2xl bg-gray-900 ${
        isBlock ? 'border-red-700 shadow-red-950/50' : 'border-gray-700 shadow-gray-950/50'
      }`}>
        <div className={`px-5 py-4 border-b flex items-center gap-3 ${
          isBlock ? 'border-red-800 bg-red-950/30' : 'border-gray-800 bg-gray-800/30'
        }`}>
          <span className="text-xl">{isBlock ? '⛔' : '✓'}</span>
          <h3 className={`font-mono font-bold text-sm uppercase tracking-widest ${
            isBlock ? 'text-red-300' : 'text-gray-300'
          }`}>
            {isBlock ? 'Confirm & Block Threat' : 'Mark as False Positive'}
          </h3>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-300 mb-3">
            {isBlock
              ? 'Are you sure this is a real threat? The source will be permanently marked as BLOCKED in the logs.'
              : 'Are you sure this is a false positive? The alert will be dismissed and removed from the active threat queue.'}
          </p>
          <p className="text-xs text-cyan-500/70 font-mono border-t border-gray-800 pt-3 flex items-start gap-1.5">
            <span>⚡</span>
            <span>This action will also adjust the AI model&apos;s detection sensitivity thresholds.</span>
          </p>
        </div>
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold font-mono tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              isBlock
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            {loading ? 'Processing...' : 'Yes, Proceed'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg border border-gray-700 text-sm font-mono text-gray-400 hover:border-gray-500 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [mode, setMode] = useState('learning');
  const [user, setUser] = useState(null);
  const [actionConfirm, setActionConfirm] = useState({ open: false, alertId: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:5000/api/auth/me', { withCredentials: true })
      .then(res => setUser(res.data))
      .catch(() => navigate('/login'));
  }, [navigate]);

  useEffect(() => {
    socket.on('trafficUpdate', (newData) => {
      setData((prev) => [...prev.slice(-60), {
        name: new Date(newData.timestamp).toLocaleTimeString(),
        rate: newData.rate,
      }]);
      if (newData.mode) setMode(newData.mode);
    });

    socket.on('detectionUpdate', (update) => {
      if (update.mode) setMode(update.mode);
      if (update.status !== 'Safe' && update.status !== 'Learning') {
        setAlerts((prev) => [update, ...prev].slice(0, 50));
      }
    });

    return () => {
      socket.off('trafficUpdate');
      socket.off('detectionUpdate');
    };
  }, []);

  const clearLogs = async () => {
    try {
      await axios.delete('http://localhost:5000/api/logs', { withCredentials: true });
      setAlerts([]);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  };

  const openConfirm = (alertId, action) => {
    setActionConfirm({ open: true, alertId, action });
  };

  const executeAction = async () => {
    setActionLoading(true);
    try {
      const { alertId, action } = actionConfirm;
      const res = await axios.patch(
        `http://localhost:5000/api/alerts/${alertId}/action`,
        { action },
        { withCredentials: true }
      );
      setAlerts(prev => prev.map(a =>
        a.alertId === alertId ? { ...a, adminAction: res.data.adminAction } : a
      ));
      setActionConfirm({ open: false, alertId: null, action: null });
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const maliciousCount = alerts.filter(a => a.status === 'Malicious').length;
  const suspiciousCount = alerts.filter(a => a.status !== 'Malicious').length;

  return (
    <div className="relative min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <ConfirmDialog
        confirm={actionConfirm}
        onConfirm={executeAction}
        onCancel={() => setActionConfirm({ open: false, alertId: null, action: null })}
        loading={actionLoading}
      />
      {/* Cyber grid background */}
      <div className="cyber-grid pointer-events-none" aria-hidden />
      <div className="scanline pointer-events-none" aria-hidden />

      <div className="relative z-10 p-6 max-w-screen-2xl mx-auto">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <p className="font-mono text-xs text-cyan-600 tracking-widest uppercase mb-1">
              // operations center
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Sentinel<span className="text-cyan-400">Stream</span>{' '}
                <span className="text-gray-400 font-normal">War Room</span>
              </h1>
              {user && (
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  user.role === 'admin'
                    ? 'text-cyan-400 border-cyan-800 bg-cyan-950/60'
                    : 'text-yellow-400 border-yellow-800 bg-yellow-950/60'
                }`}>
                  {user.role.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Mode badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded border text-sm font-mono font-semibold tracking-wider ${
            mode === 'learning'
              ? 'bg-blue-950/60 border-blue-600 text-blue-300'
              : 'bg-green-950/60 border-green-600 text-green-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              mode === 'learning' ? 'bg-blue-400 animate-pulse' : 'bg-green-400 animate-pulse'
            }`} />
            {mode === 'learning' ? '● Learning Mode' : '● Active Detection'}
          </div>
        </div>

        {/* ── Learning banner ── */}
        {mode === 'learning' && (
          <div className="mb-6 flex items-start gap-3 bg-blue-950/40 border border-blue-700 rounded-lg p-4">
            <span className="text-blue-400 text-lg mt-0.5">🧠</span>
            <div className="text-sm">
              <p className="text-blue-200 font-semibold mb-0.5">AI Baseline Learning in progress</p>
              <p className="text-blue-400/80">Recording normal traffic patterns for 5 minutes. Anomaly detection and alerts activate automatically once baseline is established.</p>
            </div>
          </div>
        )}

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Threats Detected', value: alerts.length, color: 'text-red-400', border: 'border-red-900' },
            { label: 'Malicious', value: maliciousCount, color: 'text-red-300', border: 'border-red-900' },
            { label: 'Suspicious', value: suspiciousCount, color: 'text-yellow-300', border: 'border-yellow-900' },
            { label: 'System Status', value: mode === 'learning' ? 'LEARNING' : 'ACTIVE', color: mode === 'learning' ? 'text-blue-400' : 'text-green-400', border: mode === 'learning' ? 'border-blue-900' : 'border-green-900' },
          ].map(({ label, value, color, border }) => (
            <div key={label} className={`bg-gray-900/70 border ${border} rounded-lg px-4 py-3`}>
              <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-xl font-extrabold font-mono ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Live Traffic Chart ── */}
        <div className="mb-6 bg-gray-900/70 border border-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* panel header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-sm font-mono font-semibold tracking-widest uppercase text-gray-300">
                Real-time Traffic Rate
              </h2>
            </div>
            <span className="text-xs font-mono text-gray-600">last 60 ticks</span>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#374151" tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }} />
                <YAxis stroke="#374151" tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: '#22d3ee', stroke: '#083344', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Live Attack Feed (admin) or restricted notice ── */}
        {user?.role === 'admin' ? (
          <div className="bg-gray-900/70 border border-gray-800 rounded-lg shadow-lg overflow-hidden">
            {/* panel header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900/50">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <h2 className="text-sm font-mono font-semibold tracking-widest uppercase text-gray-300">
                  Live Attack Feed
                </h2>
                {alerts.length > 0 && (
                  <span className="text-xs font-mono font-bold bg-red-600/80 text-white px-2 py-0.5 rounded">
                    {alerts.length} active
                  </span>
                )}
              </div>
              {alerts.length > 0 && (
                <button
                  onClick={clearLogs}
                  className="text-xs font-mono tracking-wider uppercase px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:border-red-700 hover:text-red-400 transition-all"
                >
                  Clear Logs
                </button>
              )}
            </div>

            <div className="p-4">
              {alerts.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-3xl mb-2">🛡️</p>
                  <p className="font-mono text-sm text-green-400">
                    {mode === 'learning'
                      ? '// awaiting baseline — detection inactive'
                      : '// all clear — no threats detected'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
                  {alerts.map((alert, index) => {
                    const isMalicious = alert.status === 'Malicious';
                    return (
                      <li key={alert.alertId || index}>
                        <div className={`flex flex-col gap-2 p-3 rounded border-l-2 transition-all ${
                          isMalicious
                            ? 'border-red-500 bg-red-950/40'
                            : 'border-yellow-500 bg-yellow-950/30'
                        }`}>
                          {/* Info row — click to open forensics detail */}
                          <Link
                            to={alert.alertId ? `/alert/${alert.alertId}` : '#'}
                            className="group flex items-start justify-between gap-4 hover:opacity-80 transition-opacity"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-wrap">
                              <span className={`shrink-0 text-xs font-mono font-extrabold uppercase tracking-widest px-2 py-0.5 rounded ${
                                isMalicious ? 'bg-red-900/60 text-red-400' : 'bg-yellow-900/60 text-yellow-400'
                              }`}>
                                {alert.status}
                              </span>
                              {alert.probability > 0 && (
                                <span className="shrink-0 text-xs font-mono text-orange-300 font-semibold">
                                  {alert.probability}% Certainty
                                </span>
                              )}
                              <span className="text-xs font-mono text-gray-400 truncate">
                                Rate: <span className="text-gray-200">{alert.rate}</span>
                                {' | '}IP: <span className="text-gray-200">{alert.ip}</span>
                                {' | '}{new Date(alert.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            {alert.details && (
                              <span className="shrink-0 text-xs text-gray-500 text-right max-w-xs font-mono">{alert.details}</span>
                            )}
                          </Link>
                          {/* Admin action row — only shown for DB-persisted alerts */}
                          {alert.alertId && (
                            <div className="flex items-center gap-2 pt-1.5 border-t border-gray-800/50">
                              {alert.adminAction === 'blocked' ? (
                                <span className="text-xs font-mono font-bold text-red-400 border border-red-800/50 bg-red-950/40 px-2 py-0.5 rounded">
                                  ⛔ BLOCKED
                                </span>
                              ) : alert.adminAction === 'false_positive' ? (
                                <span className="text-xs font-mono font-bold text-gray-500 border border-gray-700 bg-gray-800/40 px-2 py-0.5 rounded">
                                  ✓ FALSE POSITIVE
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() => openConfirm(alert.alertId, 'block')}
                                    className="text-xs font-mono px-3 py-1 rounded border border-red-700/60 bg-red-950/30 text-red-400 hover:bg-red-700 hover:text-white transition-all"
                                  >
                                    ⛔ Confirm &amp; Block
                                  </button>
                                  <button
                                    onClick={() => openConfirm(alert.alertId, 'ignore')}
                                    className="text-xs font-mono px-3 py-1 rounded border border-gray-700 bg-gray-800/30 text-gray-400 hover:bg-gray-600 hover:text-white transition-all"
                                  >
                                    ✓ False Positive
                                  </button>
                                  <span className="text-xs font-mono text-gray-700 ml-auto">// awaiting action</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : (
          user && (
            <div className="bg-gray-900/70 border border-yellow-900/40 rounded-lg shadow-lg overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900/50">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <h2 className="text-sm font-mono font-semibold tracking-widest uppercase text-gray-300">
                    Live Threat Monitor
                  </h2>
                  {alerts.length > 0 && (
                    <span className="text-xs font-mono font-bold bg-yellow-900/60 text-yellow-400 border border-yellow-800/50 px-2 py-0.5 rounded">
                      {alerts.length} detected
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-yellow-600 border border-yellow-900/50 px-2 py-0.5 rounded">
                  READ-ONLY ACCESS
                </span>
              </div>

              {/* Principle of Least Privilege notice */}
              <div className="flex items-center gap-2 px-5 py-2.5 bg-yellow-950/20 border-b border-yellow-900/20 text-xs font-mono text-yellow-600">
                <span>&#9888;</span>
                <span>
                  IP addresses, traffic rates, and forensic details are restricted to{' '}
                  <span className="text-yellow-400 font-bold">Admin</span> accounts.
                  Contact your admin to block attackers or clear logs.
                </span>
              </div>

              <div className="p-4">
                {alerts.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="font-mono text-sm text-green-400">
                      {mode === 'learning'
                        ? '// awaiting baseline — detection inactive'
                        : '// all clear — no threats detected'}
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {alerts.map((alert, index) => {
                      const isMalicious = alert.status === 'Malicious';
                      return (
                        <li
                          key={index}
                          className={`flex items-start justify-between gap-4 p-3 rounded border-l-2 ${
                            isMalicious
                              ? 'border-red-500 bg-red-950/40'
                              : 'border-yellow-500 bg-yellow-950/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-wrap">
                            <span className={`shrink-0 text-xs font-mono font-extrabold uppercase tracking-widest px-2 py-0.5 rounded ${
                              isMalicious ? 'bg-red-900/60 text-red-400' : 'bg-yellow-900/60 text-yellow-400'
                            }`}>
                              {alert.status}
                            </span>
                            {alert.probability > 0 && (
                              <span className="shrink-0 text-xs font-mono text-orange-300 font-semibold">
                                {alert.probability}% Certainty
                              </span>
                            )}
                            <span className="text-xs font-mono text-gray-400">
                              Type: <span className="text-gray-200">{alert.type || 'Unknown'}</span>
                              {' | '}IP: <span className="text-gray-600 tracking-widest">***.***.***.***</span>
                              {' | '}{new Date(alert.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <span className="shrink-0 text-xs font-mono text-yellow-700 border border-yellow-900/40 px-2 py-0.5 rounded whitespace-nowrap">
                            &#9888; Escalate
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-800 text-xs font-mono text-gray-600 text-center">
                To investigate IPs, block attackers, or clear logs &mdash; contact your{' '}
                <span className="text-cyan-500">System Administrator</span>.
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default Dashboard;