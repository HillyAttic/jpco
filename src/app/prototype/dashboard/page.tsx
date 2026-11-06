'use client';

/**
 * PROTOTYPE — restyle of /dashboard with ElevenLabs design tokens.
 * Layout, structure, sidebar, header all mirror the real dashboard.
 * Only surfaces/typography/tokens change. Switch via ?variant=A|B|C.
 */

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as Icons from '@/components/Layouts/sidebar/icons';
import { NAV_DATA } from '@/components/Layouts/sidebar/data';
import { PrototypeSwitcher } from '@/components/PrototypeSwitcher';

const VARIANTS = ['A', 'B', 'C'] as const;
const NAMES: Record<string, string> = {
  A: 'Editorial taupe',
  B: 'Dense hairline',
  C: 'Elevated whisper',
};

const T = {
  eggshell: '#fdfcfc',
  taupe: '#f5f3f1',
  stone: '#ebe8e4',
  ink: '#000000',
  graphite: '#44403b',
  smoke: '#777169',
  ash: '#a59f97',
  orange: '#ff4704',
};

const STATS = [
  { label: 'Total Tasks', value: 128, sub: 'All tasks' },
  { label: 'Completed', value: 74, sub: 'Finished tasks' },
  { label: 'In Progress', value: 31, sub: 'Currently active' },
  { label: 'To Do', value: 19, sub: 'Pending tasks' },
  { label: 'Overdue', value: 4, sub: 'Past due date' },
];

const TASKS = [
  { title: 'GST filing — Q3', status: 'in-progress', priority: 'high', due: 'Nov 8', assignee: 'Priya S.' },
  { title: 'Income tax review', status: 'pending', priority: 'medium', due: 'Nov 10', assignee: 'Rahul M.' },
  { title: 'Client onboarding — Acme', status: 'completed', priority: 'low', due: 'Nov 2', assignee: 'Anita K.' },
  { title: 'MCA annual return', status: 'pending', priority: 'high', due: 'Nov 12', assignee: 'Vikram R.' },
  { title: 'Attendance reconciliation', status: 'in-progress', priority: 'medium', due: 'Nov 9', assignee: 'Sneha P.' },
];

const DEADLINES = [
  { title: 'GST filing — Q3', due: 'in 3 days', warn: true },
  { title: 'MCA annual return', due: 'in 7 days', warn: false },
  { title: 'Payroll run', due: 'in 9 days', warn: false },
];

interface Cfg {
  cardBg: string; cardRadius: number; cardPad: number; statRadius: number; statBg: string;
  dense: boolean; border: string | null; whisper: boolean; headlineSize: number; gap: number;
}

const CFG: Record<string, Cfg> = {
  A: { cardBg: T.taupe, cardRadius: 20, cardPad: 32, statRadius: 20, statBg: T.taupe, dense: false, border: null, whisper: false, headlineSize: 48, gap: 24 },
  B: { cardBg: T.eggshell, cardRadius: 10, cardPad: 20, statRadius: 10, statBg: T.eggshell, dense: true, border: T.stone, whisper: false, headlineSize: 36, gap: 16 },
  C: { cardBg: T.eggshell, cardRadius: 20, cardPad: 24, statRadius: 20, statBg: T.eggshell, dense: false, border: T.stone, whisper: true, headlineSize: 48, gap: 24 },
};

function Headline({ children, size }: { children: React.ReactNode; size: number }) {
  return <h1 style={{ fontFamily: '"Waldenburg", Inter, system-ui, sans-serif', fontWeight: 300, fontSize: size, lineHeight: 1.08, letterSpacing: '-0.02em', color: T.ink, margin: 0 }}>{children}</h1>;
}

function cardStyle(cfg: Cfg, extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: cfg.cardBg,
    borderRadius: cfg.cardRadius,
    padding: cfg.cardPad,
    border: cfg.border ? `1px solid ${cfg.border}` : 'none',
    boxShadow: cfg.whisper ? 'rgba(0,0,0,0.4) 0px 0px 1px 0px, rgba(0,0,0,0.04) 0px 1px 1px 0px, rgba(0,0,0,0.04) 0px 2px 4px 0px' : 'none',
    ...extra,
  };
}

function StatCard({ s, cfg }: { s: (typeof STATS)[number]; cfg: Cfg }) {
  return (
    <div style={{ background: cfg.statBg, borderRadius: cfg.statRadius, padding: cfg.dense ? 16 : 20, border: cfg.border ? `1px solid ${cfg.border}` : 'none', boxShadow: cfg.whisper ? 'rgba(0,0,0,0.4) 0px 0px 1px 0px, rgba(0,0,0,0.04) 0px 1px 1px 0px, rgba(0,0,0,0.04) 0px 2px 4px 0px' : 'none' }}>
      <div style={{ fontSize: 12, color: T.smoke, letterSpacing: '0.01em', marginBottom: 6 }}>{s.label}</div>
      <div style={{ fontSize: cfg.dense ? 24 : 32, fontWeight: 300, fontFamily: '"Waldenburg", Inter, system-ui', letterSpacing: '-0.02em', color: T.ink, lineHeight: 1 }}>{s.value}</div>
      <div style={{ fontSize: 12, color: T.ash, marginTop: 6 }}>{s.sub}</div>
    </div>
  );
}

function TaskRow({ t, dense }: { t: (typeof TASKS)[number]; dense: boolean }) {
  const statusColor = t.status === 'completed' ? '#22AD5C' : t.status === 'in-progress' ? T.orange : '#F59E0B';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: dense ? '8px 0' : '12px 0', borderBottom: `1px solid ${T.stone}` }}>
      <span style={{ width: 8, height: 8, borderRadius: 9999, background: statusColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: T.ink, fontWeight: 500 }}>{t.title}</div>
        <div style={{ fontSize: 12, color: T.smoke }}>{t.assignee}</div>
      </div>
      <span style={{ fontSize: 12, color: T.smoke }}>{t.due}</span>
      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 9999, border: `1px solid ${T.stone}`, color: T.graphite }}>{t.priority}</span>
    </div>
  );
}

function ChartPlaceholder({ label, h = 180 }: { label: string; h?: number }) {
  return <div style={{ background: T.taupe, borderRadius: 20, padding: 24, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.smoke, fontSize: 13, border: `1px solid ${T.stone}` }}>{label}</div>;
}

function pillBtn(filled: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 8, padding: filled ? '8px 16px' : '8px 14px', borderRadius: 9999, border: '1px solid #e5e5e5', background: filled ? T.ink : T.eggshell, color: filled ? '#fff' : T.ink, fontSize: 13, fontWeight: 500, cursor: 'pointer' };
}

// ---- Sidebar (real NAV_DATA, token-styled) ----
function Sidebar() {
  return (
    <aside style={{ width: 260, padding: '24px 16px', borderRight: `1px solid ${T.stone}`, background: T.eggshell, minHeight: '100vh', overflowY: 'auto' }}>
      <div style={{ padding: '0 8px 24px', fontFamily: 'Inter', fontWeight: 600, fontSize: 16, color: T.ink }}>JPCO</div>
      {NAV_DATA.map(section => (
        <div key={section.label} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.ash, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px 8px' }}>{section.label}</div>
          {section.items.map((item: any) => {
            const Icon = item.icon;
            const active = item.url === '/dashboard';
            return (
              <Link key={item.title} href={item.url || '#'} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9999, marginBottom: 2, fontSize: 14, color: active ? T.ink : T.smoke, background: active ? T.taupe : 'transparent', fontWeight: active ? 500 : 400, textDecoration: 'none' }}>
                {Icon && <Icon style={{ width: 18, height: 18, flexShrink: 0 }} />}
                <span>{item.title}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

// ---- Header (token-styled) ----
function Header() {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: `1px solid ${T.stone}`, background: T.eggshell, position: 'sticky', top: 0, zIndex: 30 }}>
      <div>
        <h1 style={{ fontFamily: '"Waldenburg", Inter', fontWeight: 300, fontSize: 24, letterSpacing: '-0.02em', color: T.ink, margin: 0, lineHeight: 1.1 }}>Dashboard</h1>
        <p style={{ fontSize: 12, color: T.smoke, margin: 0 }}>JPCO Admin Dashboard Solution</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button style={pillBtn(false)}>Theme</button>
        <button style={pillBtn(false)}>Notifications</button>
        <div style={{ width: 32, height: 32, borderRadius: 9999, background: T.taupe, border: `1px solid ${T.stone}` }} />
      </div>
    </header>
  );
}

// ---- Body ----
function Body({ cfg }: { cfg: Cfg }) {
  const gap = cfg.gap;
  return (
    <div style={{ padding: cfg.dense ? '20px 24px' : '28px 32px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: gap }}>
        {STATS.map(s => <StatCard key={s.label} s={s} cfg={cfg} />)}
      </div>

      {/* MIS form embed */}
      <div style={{ ...cardStyle(cfg), marginBottom: gap, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, color: T.smoke }}>MIS Form Embed</span>
        <button style={pillBtn(true)}>Open</button>
      </div>

      {/* Kanban */}
      <div style={{ ...cardStyle(cfg), marginBottom: gap }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontFamily: '"Waldenburg", Inter', fontWeight: 300, fontSize: cfg.dense ? 22 : 28, letterSpacing: '-0.02em', margin: 0, color: T.ink }}>Kanban Board</h2>
          <span style={{ fontSize: 13, color: T.smoke }}>View Full Board →</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {['Acme Corp', 'Globex'].map((b, i) => (
            <button key={b} style={{ padding: '6px 14px', borderRadius: 9999, border: '1px solid #e5e5e5', background: i === 0 ? T.ink : T.eggshell, color: i === 0 ? '#fff' : T.ink, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {b} <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>12</span>
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {['To Do', 'In Progress', 'Done'].map(col => (
            <div key={col} style={{ background: T.eggshell, borderRadius: 10, padding: 12, border: `1px solid ${T.stone}` }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: T.smoke, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{col}</div>
              {[1, 2].map(n => <div key={n} style={{ background: T.taupe, borderRadius: 8, padding: 10, marginBottom: 8, fontSize: 13, color: T.ink }}>Task card {n}</div>)}
            </div>
          ))}
        </div>
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: gap }}>
        <ChartPlaceholder label="Task Distribution Chart" />
        <div style={cardStyle(cfg)}>
          <div style={{ fontSize: 14, fontWeight: 500, color: T.ink, marginBottom: 12 }}>Quick Actions</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {['Create Task', 'View Team', 'Manage Projects', 'View Reports', 'Attendance'].map(a => (
              <button key={a} style={pillBtn(false)}>{a}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: gap }}>
        <div style={cardStyle(cfg)}>
          <h2 style={{ fontFamily: '"Waldenburg", Inter', fontWeight: 300, fontSize: cfg.dense ? 22 : 28, letterSpacing: '-0.02em', margin: '0 0 12px', color: T.ink }}>Upcoming Deadlines</h2>
          {DEADLINES.map(d => (
            <div key={d.title} style={{ padding: '10px 0', borderBottom: `1px solid ${T.stone}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: T.ink, fontWeight: 500 }}>{d.title}</span>
              <span style={{ fontSize: 12, color: d.warn ? T.orange : T.smoke }}>{d.due}</span>
            </div>
          ))}
        </div>
        <div style={cardStyle(cfg)}>
          <h2 style={{ fontFamily: '"Waldenburg", Inter', fontWeight: 300, fontSize: cfg.dense ? 22 : 28, letterSpacing: '-0.02em', margin: '0 0 12px', color: T.ink }}>Task Overview</h2>
          {TASKS.map(t => <TaskRow key={t.title} t={t} dense={cfg.dense} />)}
        </div>
      </div>

      {/* Row 3 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: gap }}>
        <ChartPlaceholder label="Team Performance Chart" />
        <ChartPlaceholder label="Weekly Progress Chart" />
      </div>
    </div>
  );
}

export default function PrototypeDashboardPage() {
  const searchParams = useSearchParams();
  const variant = (searchParams.get('variant') ?? 'A').toUpperCase();
  const cfg = CFG[variant] ?? CFG.A;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.eggshell, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');`}</style>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <Body cfg={cfg} />
        </main>
      </div>
      <PrototypeSwitcher variants={[...VARIANTS]} current={variant in CFG ? variant : 'A'} names={NAMES} />
    </div>
  );
}