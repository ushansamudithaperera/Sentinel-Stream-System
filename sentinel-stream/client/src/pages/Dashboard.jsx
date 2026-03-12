import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const socket = io('http://localhost:5000');

const SCENARIO_META = {
  QUIET:      { label: 'Quiet',      color: 'text-blue-400',   bg: 'bg-blue-950/40',   border: 'border-blue-800'   },
  MODERATE:   { label: 'Moderate',   color: 'text-green-400',  bg: 'bg-green-950/40',  border: 'border-green-800'  },
  PEAK:       { label: 'Peak Load',  color: 'text-yellow-400', bg: 'bg-yellow-950/40', border: 'border-yellow-800' },
  DDOS:       { label: 'DDoS',       color: 'text-red-400',    bg: 'bg-red-950/50',    border: 'border-red-700'    },
  BRUTEFORCE: { label: 'BruteForce', color: 'text-orange-400', bg: 'bg-orange-950/40', border: 'border-orange-800' },
  ANOMALY:    { label: 'Anomaly',    color: 'text-purple-400', bg: 'bg-purple-950/40', border: 'border-purple-800' },
  RECOVERY:   { label: 'Recovery',   color: 'text-cyan-400',   bg: 'bg-cyan-950/40',   border: 'border-cyan-800'   },
};

function fmtBw(kbps) {
  if (!kbps) return null;
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${kbps} Kbps`;
}

// Extracts rate, bandwidth, ip, probability from the stored details string
// so DB-seeded alert rows render the same as live socket rows.
function parseAlertDetails(details = '') {
  const rateMatch = details.match(/(\d[\d,]*)\s*pkt\/s/);
  const bwMbps    = details.match(/([\d.]+)\s*Mbps/);
  const bwKbps    = details.match(/(\d+)\s*Kbps/);
  const ipMatch   = details.match(/from\s+([\d.]+)/);
  const probMatch = details.match(/(\d+)%\s*certain/);
  return {
    rate:        rateMatch  ? parseInt(rateMatch[1].replace(/,/g, ''), 10) : undefined,
    bandwidth:   bwMbps    ? Math.round(parseFloat(bwMbps[1]) * 1000)
               : bwKbps   ? parseInt(bwKbps[1], 10)
               : undefined,
    ip:          ipMatch   ? ipMatch[1]  : undefined,
    probability: probMatch ? parseInt(probMatch[1], 10) : 0,
  };
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    const d = payload[0]?.payload || {};
    return (
      <div className="bg-gray-900 border border-cyan-800 rounded px-3 py-2 text-xs font-mono shadow-lg shadow-cyan-900/30 space-y-0.5">
        <p className="text-gray-400 mb-1">{label}</p>
        <p className="text-cyan-400">rate: <span className="text-white">{d.rate} pkt/s</span></p>
        {d.bandwidth && <p className="text-green-400">bandwidth: <span className="text-white">{fmtBw(d.bandwidth)}</span></p>}
        {d.connectionRate != null && <p className="text-orange-400">conn/sec: <span className="text-white">{d.connectionRate}</span></p>}
        {d.protocol && <p className="text-purple-400">protocol: <span className="text-white">{d.protocol}</span></p>}
        {d.scenario && <p className="text-yellow-400">scenario: <span className="text-white">{d.scenario}</span></p>}
      </div>
    );
  }
  return null;
};

// ── Security Ops Modal ────────────────────────────────────────────────────────
function SecurityOpsModal({ open, onClose, blacklist, onUnblock }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-3xl mx-4 rounded-xl border-2 border-cyan-700 shadow-2xl shadow-cyan-950/50 bg-slate-950/95"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-800/60 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-sm font-mono font-bold tracking-widest uppercase text-cyan-400">
              Security Ops &mdash; IP Control
            </h2>
            <span className="text-xs font-mono font-bold bg-red-600/80 text-white px-2 py-0.5 rounded">
              {blacklist.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-cyan-400 text-lg font-mono transition-colors"
          >
            \u2715
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {blacklist.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-3xl mb-2">\ud83d\udee1\ufe0f</p>
              <p className="font-mono text-sm text-cyan-400">// no blacklisted IPs &mdash; all clear</p>
            </div>
          ) : (
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-cyan-500 uppercase tracking-wider border-b border-cyan-800/40">
                  <th className="text-left py-2 px-3">IP Address</th>
                  <th className="text-left py-2 px-3">Reason</th>
                  <th className="text-left py-2 px-3">Timestamp</th>
                  <th className="text-left py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {blacklist.map((entry, i) => (
                  <tr key={entry._id || i} className="border-b border-gray-800/50 hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-red-400 font-bold">{entry.ip}</td>
                    <td className="py-2.5 px-3 text-gray-400 max-w-xs truncate">{entry.reason}</td>
                    <td className="py-2.5 px-3 text-gray-500">{new Date(entry.timestamp).toLocaleString()}</td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => onUnblock(entry.ip)}
                        className="px-3 py-1 rounded border border-cyan-600 bg-cyan-950/50 text-cyan-400 font-bold uppercase tracking-wider text-xs hover:bg-cyan-600 hover:text-white transition-all shadow-sm shadow-cyan-900/30"
                      >
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-cyan-800/40 text-center">
          <p className="text-xs font-mono text-gray-600">Unblocking removes the IP from the auto-blacklist collection.</p>
        </div>
      </div>
    </div>
  );
}

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
  const [threatCount, setThreatCount] = useState(null); // null = loading from DB
  const [mode, setMode] = useState('learning');
  const [scenario, setScenario] = useState(null);
  const [liveStats, setLiveStats] = useState({ rate: 0, bandwidth: 0, connectionRate: 0, protocol: '-' });
  const [user, setUser] = useState(null);
  const [actionConfirm, setActionConfirm] = useState({ open: false, alertId: null, action: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [blacklist, setBlacklist] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [showSecOpsModal, setShowSecOpsModal] = useState(false);
  const [chartMode, setChartMode] = useState('combined'); // 'combined' | 'split'
  const seenAlertIds = useRef(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:5000/api/auth/me', { withCredentials: true })
      .then(res => setUser(res.data))
      .catch(() => navigate('/login'));
  }, [navigate]);

  // ── Seed initial state from DB on mount so navigating away and back never resets ──
  useEffect(() => {
    // Threat count — total unique Alert documents
    axios.get('http://localhost:5000/api/threats/count', { withCredentials: true })
      .then(res => setThreatCount(res.data.count))
      .catch(() => setThreatCount(0));

    // Recent traffic — pre-populate the chart with history
    axios.get('http://localhost:5000/api/traffic/recent', { withCredentials: true })
      .then(res => {
        const seeded = res.data.map(r => ({
          name:           new Date(r.timestamp).toLocaleTimeString(),
          rate:           r.rate,
          bandwidth:      r.bandwidth,
          connectionRate: r.connectionRate,
          protocol:       r.protocol,
          scenario:       r.scenario ?? null,
        }));
        setData(seeded);
      })
      .catch(() => {});

    // Alert feed — restore persisted threats so navigating away never clears the list
    axios.get('http://localhost:5000/api/logs', { withCredentials: true })
      .then(res => {
        // /api/logs returns newest-first; map DB docs to the same shape socket events use
        const seeded = res.data.slice(0, 50).map(doc => {
          if (doc._id) seenAlertIds.current.add(String(doc._id));
          return {
            alertId:     doc._id,
            status:      'Malicious',
            details:     doc.details,
            timestamp:   doc.timestamp,
            adminAction: doc.adminAction,
            scenario:    doc.type?.toUpperCase() ?? 'DDOS',
            ...parseAlertDetails(doc.details),
          };
        });
        setAlerts(seeded);
      })
      .catch(() => {});

    // Blacklist — admin view of auto-blacklisted IPs
    axios.get('http://localhost:5000/api/admin/blacklist', { withCredentials: true })
      .then(res => setBlacklist(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    socket.on('trafficUpdate', (newData) => {
      setData((prev) => [...prev.slice(-60), {
        name: new Date(newData.timestamp).toLocaleTimeString(),
        rate: newData.rate,
        bandwidth: newData.bandwidth,
        connectionRate: newData.connectionRate,
        protocol: newData.protocol,
        scenario: newData.scenario,
      }]);
      if (newData.mode)     setMode(newData.mode);
      if (newData.scenario) setScenario(newData.scenario);
      setLiveStats({
        rate:           newData.rate           ?? 0,
        bandwidth:      newData.bandwidth      ?? 0,
        connectionRate: newData.connectionRate  ?? 0,
        protocol:       newData.protocol        ?? '-',
      });
    });

    socket.on('detectionUpdate', (update) => {
      if (update.mode) setMode(update.mode);
      if (update.status !== 'Safe' && update.status !== 'Learning') {
        const id = update.alertId ? String(update.alertId) : null;
        // Deduplicate via ref — immune to StrictMode double-invocation
        if (id && seenAlertIds.current.has(id)) return;
        if (id) seenAlertIds.current.add(id);
        setAlerts(prev => [update, ...prev].slice(0, 50));
        setThreatCount(c => (c ?? 0) + 1);
      }
    });

    socket.on('securityAlert', (sa) => {
      setSecurityAlerts(prev => [sa, ...prev].slice(0, 20));
      // Also refresh the blacklist when a lockout occurs
      axios.get('http://localhost:5000/api/admin/blacklist', { withCredentials: true })
        .then(res => setBlacklist(res.data))
        .catch(() => {});
    });

    return () => {
      socket.off('trafficUpdate');
      socket.off('detectionUpdate');
      socket.off('securityAlert');
    };
  }, []);

  const clearLogs = async () => {
    try {
      await axios.delete('http://localhost:5000/api/logs', { withCredentials: true });
      setAlerts([]);
      setThreatCount(0);
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
      if (action === 'ignore') {
        setThreatCount(c => Math.max((c ?? 1) - 1, 0));
      }
      setActionConfirm({ open: false, alertId: null, action: null });
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const unblockIp = async (ip) => {
    try {
      await axios.delete(`http://localhost:5000/api/admin/blacklist/${encodeURIComponent(ip)}`, { withCredentials: true });
      setBlacklist(prev => prev.filter(e => e.ip !== ip));
    } catch (err) {
      console.error('Unblock failed:', err);
    }
  };

  const maliciousCount = alerts.filter(a => a.status === 'Malicious').length;
  const suspiciousCount = alerts.filter(a => a.status !== 'Malicious').length;
  const isAttack = scenario === 'DDOS' || scenario === 'BRUTEFORCE' || scenario === 'ANOMALY';

  return (
    <div className="relative min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <ConfirmDialog
        confirm={actionConfirm}
        onConfirm={executeAction}
        onCancel={() => setActionConfirm({ open: false, alertId: null, action: null })}
        loading={actionLoading}
      />
      <SecurityOpsModal
        open={showSecOpsModal}
        onClose={() => setShowSecOpsModal(false)}
        blacklist={blacklist}
        onUnblock={unblockIp}
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
                <>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                    user.role === 'admin'
                      ? 'text-cyan-400 border-cyan-800 bg-cyan-950/60'
                      : 'text-yellow-400 border-yellow-800 bg-yellow-950/60'
                  }`}>
                    {user.role.toUpperCase()}
                  </span>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => setShowSecOpsModal(true)}
                      className="text-xs font-mono font-bold px-3 py-1 rounded border border-red-700 bg-red-950/50 text-red-400 hover:bg-red-700 hover:text-white transition-all shadow-sm shadow-red-900/30 uppercase tracking-wider"
                    >
                      IP Control
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mode badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded border text-sm font-mono font-semibold tracking-wider transition-all duration-500 ${
            mode === 'learning'
              ? 'bg-blue-950/60 border-blue-600 text-blue-300'
              : isAttack
                ? 'bg-red-950/60 border-red-600 text-red-300'
                : 'bg-green-950/60 border-green-600 text-green-300'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              mode === 'learning'
                ? 'bg-blue-400 animate-pulse'
                : isAttack
                  ? 'animate-pulse-red'
                  : 'bg-green-400 animate-pulse'
            }`} />
            {mode === 'learning' ? '● Learning Mode' : isAttack ? '● Attack Detected' : '● Active Detection'}
          </div>
        </div>

        {/* ── Learning banner ── */}
        {mode === 'learning' && (
          <div className="mb-6 relative overflow-hidden rounded-lg border border-blue-700/60 bg-blue-950/30 shadow-lg shadow-blue-950/20">
            {/* Animated sweep beam */}
            <div className="learning-sweep" />

            {/* Top progress bar */}
            <div className="learning-progress-bar" />

            <div className="relative z-10 flex items-start gap-4 p-4">
              {/* Orbiting brain icon */}
              <div className="relative w-10 h-10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-2xl">🧠</span>
                <span className="orbit-dot" />
                <span className="orbit-dot" />
                <span className="orbit-dot" />
              </div>

              <div className="text-sm flex-1">
                <p className="text-blue-200 font-bold font-mono tracking-wide mb-1 blink-cursor">
                  AI Baseline Learning in progress
                </p>
                <p className="text-blue-400/70 text-xs font-mono leading-relaxed">
                  Recording normal traffic patterns. Anomaly detection activates automatically once baseline is established.
                </p>

                {/* Animated metric indicators */}
                <div className="flex items-center gap-4 mt-3">
                  {['Packets', 'Bandwidth', 'Connections'].map((m, i) => (
                    <div key={m} className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse`}
                        style={{ animationDelay: `${i * 0.4}s` }} />
                      <span className="text-[10px] font-mono text-blue-500 uppercase tracking-widest">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom progress bar */}
            <div className="learning-progress-bar" style={{ animationDelay: '2s' }} />
          </div>
        )}

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Packet Rate',   value: `${liveStats.rate} pkt/s`,      color: 'text-cyan-400',   border: 'border-cyan-900' },
            { label: 'Bandwidth',     value: fmtBw(liveStats.bandwidth) || '—', color: 'text-green-400', border: 'border-green-900' },
            { label: 'Conn/sec',      value: liveStats.connectionRate,        color: 'text-orange-400', border: 'border-orange-900' },
            { label: 'Protocol',      value: liveStats.protocol,              color: 'text-purple-400', border: 'border-purple-900' },
            { label: 'Threats',       value: threatCount ?? '…',              color: 'text-red-400',    border: 'border-red-900' },
            { label: 'System Status', value: mode === 'learning' ? 'LEARNING' : 'ACTIVE', color: mode === 'learning' ? 'text-blue-400' : 'text-green-400', border: mode === 'learning' ? 'border-blue-900' : 'border-green-900' },
          ].map(({ label, value, color, border }) => (
            <div key={label} className={`bg-gray-900/70 border ${border} rounded-lg px-4 py-3`}>
              <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-1">{label}</p>
              <p className={`text-lg font-extrabold font-mono ${color} truncate`}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Live Traffic Chart ── */}
        <div className={`mb-6 bg-gray-900/70 border rounded-lg shadow-lg overflow-hidden chart-emergency ${
          isAttack ? 'glow-active border-red-700' : 'border-gray-800'
        }`}>
          {/* panel header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <h2 className="text-sm font-mono font-semibold tracking-widest uppercase text-gray-300">
                Real-time Traffic Rate
              </h2>
              {scenario && SCENARIO_META[scenario] && (
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  SCENARIO_META[scenario].color} ${SCENARIO_META[scenario].bg} ${SCENARIO_META[scenario].border}`}>
                  ● {SCENARIO_META[scenario].label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setChartMode(m => m === 'combined' ? 'split' : 'combined')}
                className="text-xs font-mono font-bold px-3 py-1 rounded border border-cyan-800 bg-cyan-950/40 text-cyan-400 hover:bg-cyan-800 hover:text-white transition-all uppercase tracking-wider"
              >
                {chartMode === 'combined' ? '⇅ Split View' : '⇄ Combined View'}
              </button>
              <span className="text-xs font-mono text-gray-600">last 60 ticks</span>
            </div>
          </div>

          {chartMode === 'combined' ? (
            /* ── Combined: both lines in one chart ── */
            <div className="p-4">
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="name" stroke="#374151" tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }} />
                  <YAxis yAxisId="left" stroke="#374151" tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#374151" tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '8px' }} />
                  <Line yAxisId="left"  type="monotone" dataKey="rate"           name="pkt/s"    stroke="#22d3ee" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  <Line yAxisId="right" type="monotone" dataKey="connectionRate" name="conn/sec" stroke="#f97316" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            /* ── Split: pkt/s on top, conn/sec on bottom ── */
            <div className="p-4 space-y-1">
              {/* pkt/s */}
              <div>
                <p className="text-[10px] font-mono text-cyan-500 uppercase tracking-widest mb-1 pl-1">▸ Packet Rate (pkt/s)</p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" stroke="#374151" tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }} />
                    <YAxis stroke="#374151" tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="rate" name="pkt/s" stroke="#22d3ee" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* conn/sec */}
              <div>
                <p className="text-[10px] font-mono text-orange-500 uppercase tracking-widest mb-1 pl-1">▸ Connection Rate (conn/sec)</p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" stroke="#374151" tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }} />
                    <YAxis stroke="#374151" tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'monospace' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="connectionRate" name="conn/sec" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* ── Live Attack Feed (admin) or restricted notice ── */}
        {user?.role === 'admin' ? (
          <>
          {/* ── Security Alert Banner ── */}
          {securityAlerts.length > 0 && (
            <div className="mb-6 bg-orange-950/40 border border-orange-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-400 text-lg">🔐</span>
                <h3 className="text-sm font-mono font-bold text-orange-300 uppercase tracking-widest">
                  Brute-Force Lockout Alerts
                </h3>
                <span className="text-xs font-mono font-bold bg-orange-600/80 text-white px-2 py-0.5 rounded">
                  {securityAlerts.length}
                </span>
              </div>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {securityAlerts.map((sa, i) => (
                  <li key={sa.alertId || i} className="text-xs font-mono text-orange-200 flex items-center gap-2">
                    <span className="text-orange-500">⛔</span>
                    <span>IP <span className="text-white font-bold">{sa.ip}</span> locked out after <span className="text-white font-bold">{sa.attempts}</span> failed attempts</span>
                    <span className="text-orange-600 ml-auto">{new Date(sa.timestamp).toLocaleTimeString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
                                Rate: <span className="text-gray-200">{alert.rate} pkt/s</span>
                                {alert.bandwidth ? <>{' | '}BW: <span className="text-green-300">{fmtBw(alert.bandwidth)}</span></> : null}
                                {alert.connectionRate > 0 ? <>{' | '}Conn/s: <span className="text-orange-300">{alert.connectionRate}</span></> : null}
                                {alert.protocol ? <>{' | '}Proto: <span className="text-purple-300">{alert.protocol}</span></> : null}
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

          </>
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