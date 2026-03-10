import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// â”€â”€ Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TICKER_EVENTS = [
  { type: 'DDoS',       ip: '45.33.32.156',   certainty: 98, color: 'text-red-400'    },
  { type: 'BruteForce', ip: '192.168.1.14',    certainty: 91, color: 'text-orange-400' },
  { type: 'Anomaly',    ip: '10.0.0.23',       certainty: 85, color: 'text-yellow-400' },
  { type: 'DDoS',       ip: '203.0.113.42',    certainty: 99, color: 'text-red-400'    },
  { type: 'BruteForce', ip: '172.16.0.5',      certainty: 88, color: 'text-orange-400' },
  { type: 'Anomaly',    ip: '198.51.100.7',    certainty: 92, color: 'text-yellow-400' },
  { type: 'DDoS',       ip: '104.21.14.80',    certainty: 97, color: 'text-red-400'    },
  { type: 'BruteForce', ip: '185.220.101.56',  certainty: 94, color: 'text-orange-400' },
];

const PARTICLES = [
  { ip: '45.33.32.156',   label: 'DDoS', left: '7%',  delay: '0s',   dur: '7s'   },
  { ip: '192.168.1.14',   label: 'BF',   left: '17%', delay: '1.8s', dur: '9s'   },
  { ip: '10.0.0.23',      label: 'ZDay', left: '30%', delay: '0.4s', dur: '6s'   },
  { ip: '203.0.113.5',    label: 'DDoS', left: '45%', delay: '3s',   dur: '8s'   },
  { ip: '172.16.4.2',     label: 'BF',   left: '60%', delay: '1s',   dur: '10s'  },
  { ip: '198.51.100.7',   label: 'ZDay', left: '74%', delay: '2.2s', dur: '7.5s' },
  { ip: '104.21.14.80',   label: 'DDoS', left: '85%', delay: '0.9s', dur: '6.5s' },
  { ip: '185.220.101.56', label: 'BF',   left: '52%', delay: '4s',   dur: '8.5s' },
];

const NODES = [
  { id: 'Client-A',  status: 'attacked', icon: 'CLI' },
  { id: 'Router',    status: 'attacked', icon: 'RTR' },
  { id: 'SENTINEL',  status: 'shield',   icon: 'SEN' },
  { id: 'Server-1',  status: 'normal',   icon: 'SRV' },
  { id: 'Database',  status: 'normal',   icon: 'DB'  },
];

function IconDDoS() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="34" cy="22" r="5" stroke="#ef4444" strokeWidth="1.5" />
      <circle cx="34" cy="22" r="5" stroke="#ef4444" strokeWidth="1">
        <animate attributeName="r" values="5;15;5" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.7;0;0.7" dur="2s" repeatCount="indefinite" />
      </circle>
      <rect x="2" y="21" width="12" height="2" rx="1" fill="#22d3ee">
        <animateTransform attributeName="transform" type="translate" values="0,0;18,0;0,0" dur="1.1s" repeatCount="indefinite" />
      </rect>
      <rect x="2" y="10" width="10" height="2" rx="1" fill="#22d3ee" opacity="0.6">
        <animateTransform attributeName="transform" type="translate" values="0,0;18,10;0,0" dur="1.3s" begin="0.3s" repeatCount="indefinite" />
      </rect>
      <rect x="2" y="32" width="10" height="2" rx="1" fill="#22d3ee" opacity="0.6">
        <animateTransform attributeName="transform" type="translate" values="0,0;18,-10;0,0" dur="1.3s" begin="0.65s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

function IconAI() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <circle cx="8"  cy="22" r="3" fill="#22d3ee">
        <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" begin="0s"    repeatCount="indefinite" />
      </circle>
      <circle cx="22" cy="8"  r="3" fill="#22d3ee">
        <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" begin="0.45s" repeatCount="indefinite" />
      </circle>
      <circle cx="36" cy="22" r="3" fill="#22d3ee">
        <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" begin="0.9s"  repeatCount="indefinite" />
      </circle>
      <circle cx="22" cy="36" r="3" fill="#22d3ee">
        <animate attributeName="opacity" values="1;0.2;1" dur="1.8s" begin="1.35s" repeatCount="indefinite" />
      </circle>
      <circle cx="22" cy="22" r="5" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.4" />
      <line x1="11" y1="22" x2="17" y2="22" stroke="#22d3ee" strokeWidth="0.8" opacity="0.25" />
      <line x1="22" y1="11" x2="22" y2="17" stroke="#22d3ee" strokeWidth="0.8" opacity="0.25" />
      <line x1="27" y1="22" x2="33" y2="22" stroke="#22d3ee" strokeWidth="0.8" opacity="0.25" />
      <line x1="22" y1="27" x2="22" y2="33" stroke="#22d3ee" strokeWidth="0.8" opacity="0.25" />
      <circle r="2.5" fill="#a5f3fc">
        <animateMotion dur="1.8s" repeatCount="indefinite" path="M8,22 L22,8 L36,22 L22,36 L8,22" />
      </circle>
    </svg>
  );
}

function IconBF() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <g>
        <animateTransform
          attributeName="transform" type="translate"
          values="0,0;-4,0;4,0;-3,0;3,0;0,0;0,0"
          keyTimes="0;0.07;0.14;0.2;0.26;0.32;1"
          dur="2.5s" repeatCount="indefinite"
        />
        <rect x="11" y="21" width="22" height="18" rx="3" stroke="#f97316" strokeWidth="1.5" fill="none" />
        <path d="M15 21V15a7 7 0 0 1 14 0v6" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <circle cx="22" cy="30" r="3" stroke="#f97316" strokeWidth="1.5" fill="none" />
        <line x1="22" y1="33" x2="22" y2="36" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function IconRBAC() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <path d="M22 4L8 10v12c0 9 6 16 14 19 8-3 14-10 14-19V10L22 4z" stroke="#22d3ee" strokeWidth="1.5" fill="none" />
      <path d="M22 4L8 10v12c0 9 6 16 14 19 8-3 14-10 14-19V10L22 4z" fill="#22d3ee">
        <animate attributeName="opacity" values="0;0.1;0" dur="2.5s" repeatCount="indefinite" />
      </path>
      <path
        d="M14 23l6 6 10-10"
        stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="22" strokeDashoffset="22"
      >
        <animate attributeName="stroke-dashoffset" values="22;0;0;22" keyTimes="0;0.35;0.75;1" dur="2.5s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function IconLive() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <polyline
        points="2,22 8,22 12,10 16,34 19,16 22,28 25,22 32,22 35,15 38,22 42,22"
        stroke="#22c55e" strokeWidth="1.5" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray="95" strokeDashoffset="95"
      >
        <animate attributeName="stroke-dashoffset" values="95;0;0;95" keyTimes="0;0.5;0.8;1" dur="2.2s" repeatCount="indefinite" />
      </polyline>
      <circle cx="42" cy="22" r="3" fill="#22c55e">
        <animate attributeName="r"       values="3;5;3" dur="1.1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0;1" dur="1.1s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function IconLog() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
      <rect x="8" y="4" width="28" height="36" rx="2" stroke="#22d3ee" strokeWidth="1.5" fill="none" />
      <line x1="14" y1="14" x2="30" y2="14" stroke="#22d3ee" strokeWidth="1" opacity="0.5" />
      <line x1="14" y1="21" x2="30" y2="21" stroke="#22d3ee" strokeWidth="1" opacity="0.5" />
      <line x1="14" y1="28" x2="24" y2="28" stroke="#22d3ee" strokeWidth="1" opacity="0.5" />
      <rect x="8" y="4" width="28" height="3" rx="1" fill="#22d3ee">
        <animate attributeName="opacity" values="0;0.5;0.5;0" keyTimes="0;0.05;0.85;1" dur="2.5s" repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="translate" values="0,0;0,34" dur="2.5s" repeatCount="indefinite" />
      </rect>
    </svg>
  );
}

const FEATURES = [
  { icon: <IconDDoS />, title: 'Real-Time DDoS Detection',   desc: 'Monitors packet rates every second. Triggers an alert the moment traffic spikes 500% above the learned baseline.' },
  { icon: <IconAI />,   title: 'AI Baseline Learning',        desc: 'Spends the first 5 minutes building a normal-traffic model using EWMA. Anything that deviates triggers a Zero-Day flag.' },
  { icon: <IconBF />,   title: 'Brute-Force Blocking',        desc: '10 failed JWT logins from the same IP in 30 seconds? The attacker is blocked and the event is logged to MongoDB.' },
  { icon: <IconRBAC />, title: 'Role-Based Access Control',   desc: 'Admins see the live attack feed and forensics logs. Viewers only get traffic charts. Every route is JWT-protected.' },
  { icon: <IconLive />, title: 'Live War Room Dashboard',     desc: 'Real-time Recharts line chart streamed via Socket.io. Alerts scroll in with colour-coded severity badges.' },
  { icon: <IconLog />,  title: 'Forensics & Audit Trail',     desc: 'Every threat is persisted in MongoDB. Click any log entry to see full details: IP, protocol, severity, and AI confidence.' },
];

// â”€â”€ Animated neutralized-threat counter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function RadarScanner() {
  return (
    <svg
      className="absolute left-1/2 -translate-x-1/2 pointer-events-none select-none"
      style={{ top: '-80px', zIndex: 0 }}
      width="700" height="700" viewBox="0 0 680 680" fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#0891b2" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#0891b2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="340" cy="340" r="330" fill="url(#centerGlow)" />
      {[70, 140, 210, 280, 330].map((r, i) => (
        <circle key={i} cx="340" cy="340" r={r} stroke="#22d3ee" strokeWidth="0.8" opacity={0.04 + i * 0.025} />
      ))}
      <line x1="340" y1="10" x2="340" y2="670" stroke="#22d3ee" strokeWidth="0.5" opacity="0.07" strokeDasharray="3 9" />
      <line x1="10" y1="340" x2="670" y2="340" stroke="#22d3ee" strokeWidth="0.5" opacity="0.07" strokeDasharray="3 9" />
      <line x1="105" y1="105" x2="575" y2="575" stroke="#22d3ee" strokeWidth="0.5" opacity="0.04" strokeDasharray="3 9" />
      <line x1="575" y1="105" x2="105" y2="575" stroke="#22d3ee" strokeWidth="0.5" opacity="0.04" strokeDasharray="3 9" />
      {/* Rotating sweep — uses CSS class for transform-origin support */}
      <g className="radar-sweep">
        <path d="M340,340 L340,12 A328,328 0 0,1 600,492 Z" fill="#22d3ee" opacity="0.07" />
        <line x1="340" y1="340" x2="340" y2="14" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      </g>
      {/* Blip 1 — red threat */}
      <circle cx="462" cy="186" r="4" fill="#ef4444" opacity="0">
        <animate attributeName="opacity" values="0;0;1;0.7;0.3;0" keyTimes="0;0.25;0.28;0.50;0.75;1" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle cx="462" cy="186" r="4" fill="none" stroke="#ef4444" strokeWidth="1.2" opacity="0">
        <animate attributeName="opacity" values="0;0;0.6;0;0" keyTimes="0;0.25;0.30;0.50;1" dur="5s" repeatCount="indefinite" />
        <animate attributeName="r"       values="4;4;16;26;26"  keyTimes="0;0.25;0.32;0.52;1" dur="5s" repeatCount="indefinite" />
      </circle>
      {/* Blip 2 — orange threat */}
      <circle cx="234" cy="440" r="3.5" fill="#f97316" opacity="0">
        <animate attributeName="opacity" values="0;0;0.9;0.5;0.2;0" keyTimes="0;0.58;0.61;0.75;0.88;1" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle cx="234" cy="440" r="3.5" fill="none" stroke="#f97316" strokeWidth="1" opacity="0">
        <animate attributeName="opacity" values="0;0;0.5;0;0" keyTimes="0;0.58;0.63;0.78;1" dur="5s" repeatCount="indefinite" />
        <animate attributeName="r"       values="3.5;3.5;14;22;22" keyTimes="0;0.58;0.65;0.78;1" dur="5s" repeatCount="indefinite" />
      </circle>
      {/* Static friendly blip */}
      <circle cx="490" cy="355" r="3" fill="#22d3ee" opacity="0.3" />
      <circle cx="490" cy="355" r="3" fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.15">
        <animate attributeName="r"       values="3;9;3"     dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.15;0;0.15" dur="3s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

const TERMINAL_LINES = [
  [{ text: '// Initializing detection engine...', cls: 'text-gray-600' }],
  [{ text: '[INFO] ', cls: 'text-cyan-400' }, { text: 'EWMA baseline established',         cls: 'text-green-400' }],
  [{ text: '[INFO] ', cls: 'text-cyan-400' }, { text: 'Anomaly detection now active',       cls: 'text-green-400' }],
  [{ text: '[ALERT] ', cls: 'text-red-400' }, { text: 'Rate 820 pps — 5.2x above avg 157', cls: 'text-white' }],
  [{ text: '[ALERT] ', cls: 'text-red-400' }, { text: '98% certain: DDoS Attack', cls: 'text-white font-bold' }, { text: ' — saved to MongoDB', cls: 'text-gray-500' }],
  [{ text: '[STATUS] ', cls: 'text-green-400' }, { text: 'IP 45.33.32.156 blocked. ✓', cls: 'text-green-300' }],
];

function AnimatedTerminal() {
  const [lineCount, setLineCount] = useState(0);
  const [cycle, setCycle]         = useState(0);

  useEffect(() => {
    setLineCount(0);
    const timers = TERMINAL_LINES.map((_, i) =>
      setTimeout(() => setLineCount(i + 1), 350 + i * 700)
    );
    timers.push(
      setTimeout(() => setCycle(c => c + 1), 350 + TERMINAL_LINES.length * 700 + 2400)
    );
    return () => timers.forEach(clearTimeout);
  }, [cycle]);

  return (
    <div className="p-5 font-mono text-sm leading-7 min-h-[200px]">
      {TERMINAL_LINES.slice(0, lineCount).map((parts, i) => (
        <p key={`${cycle}-${i}`} className="animate-terminal-line">
          {parts.map((part, j) => (
            <span key={j} className={part.cls}>{part.text}</span>
          ))}
        </p>
      ))}
      <span className="text-cyan-400 animate-pulse">&#x258C;</span>
    </div>
  );
}

// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MATRIX_COLS = [
  { left: '3%',  text: ['FF','A3','78','0E','C2','91','3D','B8','22','6F'], dur: '9s',   delay: '0s'   },
  { left: '11%', text: ['22','D3','EE','06','B2','D5','88','14','5A','C0'], dur: '7s',   delay: '2.1s' },
  { left: '20%', text: ['EF','44','F9','73','16','84','04','AB','CD','01'], dur: '10s',  delay: '0.8s' },
  { left: '31%', text: ['00','FF','41','12','3F','A0','CE','77','8B','E3'], dur: '8.5s', delay: '3.4s' },
  { left: '43%', text: ['1B','60','7D','2E','B9','55','F1','39','0A','CC'], dur: '7.5s', delay: '1.5s' },
  { left: '55%', text: ['C8','3E','AA','62','19','FE','30','7C','D4','0B'], dur: '9.5s', delay: '4s'   },
  { left: '67%', text: ['4A','D0','7F','93','28','E5','6B','16','F2','89'], dur: '8s',   delay: '0.5s' },
  { left: '78%', text: ['97','2C','B4','51','F8','3A','69','15','44','D7'], dur: '7.5s', delay: '2.8s' },
  { left: '89%', text: ['11','CC','87','45','D9','6E','23','BC','50','9E'], dur: '10s',  delay: '1s'   },
  { left: '95%', text: ['5E','A1','C3','72','0D','B5','38','F0','8C','27'], dur: '8s',   delay: '3.1s' },
];

function MatrixRain({ color = '#22d3ee', opacity = 1 }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden style={{ opacity }}>
      {MATRIX_COLS.map((col, i) => (
        <div
          key={i}
          className="absolute top-0 flex flex-col items-center font-mono text-[11px] leading-5"
          style={{ left: col.left, animation: `matrix-fall ${col.dur} linear infinite`, animationDelay: col.delay }}
        >
          {col.text.map((c, j) => (
            <span key={j} style={{ color, opacity: Math.max(0.04, 0.6 - j * 0.06) }}>{c}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

function PulseRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" aria-hidden>
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="absolute rounded-full border border-red-500/20"
          style={{ width: 80, height: 80, animation: 'ring-pulse 4s ease-out infinite', animationDelay: `${i}s` }}
        />
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen bg-gray-950 text-white overflow-x-hidden">
      <div className="cyber-grid pointer-events-none" aria-hidden />
      <div className="scanline pointer-events-none" aria-hidden />

      {/* â”€â”€ Navbar â”€â”€ */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl text-cyan-400">&#9888;</span>
          <span className="text-xl font-extrabold tracking-widest text-cyan-400 uppercase">
            Sentinel<span className="text-white">Stream</span>
          </span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <Link to="/login" className="px-4 py-2 rounded border border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-gray-950 font-semibold transition-all">
            Login
          </Link>
        </nav>
      </header>

      {/* â”€â”€ Live Threat Ticker â”€â”€ */}
      <div className="relative z-10 bg-gray-950/95 border-b border-red-900/30 overflow-hidden py-2 flex items-center">
        <div className="shrink-0 flex items-center gap-2 px-4 font-mono text-xs font-bold text-red-400 border-r border-gray-800 tracking-widest mr-0">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </div>
        <div className="overflow-hidden flex-1">
          <div className="animate-marquee inline-flex whitespace-nowrap">
            {[...TICKER_EVENTS, ...TICKER_EVENTS].map((e, i) => (
              <span key={i} className="font-mono text-xs inline-flex items-center gap-2 px-6">
                <span className={`font-bold ${e.color}`}>[{e.type}]</span>
                <span className="text-gray-500">{e.ip}</span>
                <span className="text-green-500">&#9679; BLOCKED</span>
                <span className="text-orange-300">{e.certainty}% certain</span>
                <span className="text-gray-800 mx-2"> | </span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* â”€â”€ Hero â”€â”€ */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Glow orb */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Radar scanner */}
        <RadarScanner />

        {/* Floating threat IPs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className={`absolute bottom-8 font-mono text-[10px] font-semibold ${p.label === 'DDoS' ? 'text-red-500/40' : p.label === 'BF' ? 'text-orange-500/40' : 'text-yellow-500/40'}`}
              style={{ left: p.left, animation: `float-up ${p.dur} ease-in infinite`, animationDelay: p.delay }}
            >
              {p.ip}&nbsp;[{p.label}]
            </span>
          ))}
        </div>

        {/* Badge */}
        <span style={{ animation: 'fade-up 0.6s ease-out 0.1s both' }} className="relative mb-5 inline-block text-xs font-bold tracking-widest text-cyan-400 uppercase border border-cyan-800 px-3 py-1 rounded-full bg-cyan-950/50">
          AI-Powered Cybersecurity Platform
        </span>

        {/* Headline with glitch */}
        <h1 style={{ animation: 'fade-up 0.7s ease-out 0.35s both' }} className="relative text-5xl md:text-7xl font-extrabold leading-tight mb-6">
          <span className="glitch" data-text="Defend. Detect.">Defend. Detect.</span>{' '}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Dominate.
          </span>
        </h1>

        <p style={{ animation: 'fade-up 0.7s ease-out 0.6s both' }} className="relative max-w-2xl text-lg text-gray-400 mb-10 leading-relaxed">
          Sentinel-Stream is a real-time network intrusion detection system. It streams live traffic,
          learns your baseline, and flags DDoS attacks, brute-force attempts, and zero-day anomalies &mdash;

          all in under a second.
        </p>

        <div style={{ animation: 'fade-up 0.7s ease-out 0.8s both' }} className="relative flex flex-wrap gap-4 justify-center">
          <Link to="/login" className="px-8 py-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-lg transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50">
            Enter War Room &rarr;
          </Link>
          <a href="#features" className="px-8 py-4 rounded-lg border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white font-semibold text-lg transition-all">
            See Features
          </a>
        </div>

        {/* Terminal preview */}
        <div style={{ animation: 'fade-up 0.8s ease-out 1.05s both' }} className="relative mt-16 w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl overflow-hidden shadow-2xl shadow-black/60 text-left">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 text-xs text-gray-400 font-mono">detection-engine.js</span>
          </div>
          <AnimatedTerminal />
        </div>
      </section>

      {/* â”€â”€ Network Topology Map â”€â”€ */}
      <section className="relative z-10 py-12 px-6 border-y border-gray-800/50 bg-gray-900/20">
        <p className="font-mono text-xs text-gray-600 uppercase tracking-widest text-center mb-10">
          // live network topology
        </p>
        <div className="max-w-3xl mx-auto relative flex items-start justify-between">
          {/* Base connection line */}
          <div className="absolute top-5 left-0 right-0 h-px bg-gray-800" />
          {/* Animated data packet */}
          <div className="absolute top-[17px] left-0 right-0 h-1.5 overflow-hidden pointer-events-none">
            <div
              className="absolute h-px w-12 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-data-pulse"
            />
          </div>
          {/* Secondary packet (offset) */}
          <div className="absolute top-[17px] left-0 right-0 h-1.5 overflow-hidden pointer-events-none">
            <div
              className="absolute h-px w-8 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-data-pulse"
              style={{ animationDelay: '1.2s' }}
            />
          </div>

          {NODES.map((node) => (
            <div key={node.id} className="relative flex flex-col items-center gap-2 z-10">
              {/* Attack/shield indicator above node */}
              <div className="h-5 flex items-center justify-center">
                {node.status === 'attacked' && (
                  <span className="font-mono text-xs text-red-500 animate-pulse">&#9888; ATTACK</span>
                )}
                {node.status === 'shield' && (
                  <span className="font-mono text-xs text-cyan-400">&#10003; ACTIVE</span>
                )}
              </div>

              {/* Node circle */}
              <div className={`relative w-11 h-11 rounded-full border-2 flex items-center justify-center text-lg ${
                node.status === 'shield'   ? 'border-cyan-500 bg-cyan-950/80 shadow-lg shadow-cyan-500/30' :
                node.status === 'attacked' ? 'border-red-500  bg-red-950/80  shadow-lg shadow-red-500/30' :
                                             'border-gray-700 bg-gray-900'
              }`}>
                {node.icon}
                {node.status !== 'normal' && (
                  <div
                    className={`absolute inset-0 rounded-full animate-ping ${
                      node.status === 'shield' ? 'border border-cyan-500/40' : 'border border-red-500/60'
                    }`}
                    style={{ animationDuration: node.status === 'attacked' ? '0.9s' : '1.6s' }}
                  />
                )}
              </div>

              {/* Node label */}
              <span className={`font-mono text-xs ${
                node.status === 'shield'   ? 'text-cyan-400' :
                node.status === 'attacked' ? 'text-red-400'  :
                                             'text-gray-600'
              }`}>
                {node.id}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* â”€â”€ Features â”€â”€ */}
      <section id="features" className="relative z-10 py-24 px-6 overflow-hidden">
        <MatrixRain opacity={0.35} />
        <div className="max-w-6xl mx-auto relative">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Industry-Level Security, <span className="text-cyan-400">Out of the Box</span>
          </h2>
          <p className="text-center text-gray-400 mb-14 max-w-xl mx-auto">
            Every pillar of a real SOC platform &mdash; built with the MERN stack and Socket.io.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative bg-gray-900 border border-gray-800 hover:border-cyan-700 rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-cyan-900/30"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-t-xl" />
                <div className="mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* â”€â”€ CTA â”€â”€ */}
      <section className="relative z-10 py-24 px-6 text-center overflow-hidden">
        <PulseRings />
        <MatrixRain color="#ef4444" opacity={0.4} />
        {/* Vertical scan beam */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/35 to-transparent" style={{ animation: 'h-scan 5s ease-in-out infinite' }} />
        </div>
        {/* Corner reticle brackets */}
        <div className="absolute inset-8 pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-0 w-10 h-10 border-t border-l border-red-500/35" />
          <div className="absolute top-0 right-0 w-10 h-10 border-t border-r border-red-500/35" />
          <div className="absolute bottom-0 left-0 w-10 h-10 border-b border-l border-red-500/35" />
          <div className="absolute bottom-0 right-0 w-10 h-10 border-b border-r border-red-500/35" />
        </div>
        <div className="max-w-2xl mx-auto relative">
          <div className="inline-block mb-6 px-4 py-1 text-xs tracking-widest text-red-400 uppercase border border-red-800 rounded-full bg-red-950/30">
            Threats are live. Are you watching?
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6">
            Your Network Won't{' '}
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Defend Itself.
            </span>
          </h2>
          <Link to="/login" className="inline-block px-10 py-4 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold text-xl transition-all shadow-lg shadow-cyan-500/30">
            Launch Sentinel-Stream &rarr;
          </Link>
        </div>
      </section>

      {/* â”€â”€ Footer â”€â”€ */}
      <footer className="relative z-10 border-t border-gray-800 text-center py-6 text-gray-600 text-sm">
        Sentinel-Stream &middot; AI-Powered Intrusion Detection &middot; Built with MERN + Socket.io
      </footer>
    </div>
  );
}
