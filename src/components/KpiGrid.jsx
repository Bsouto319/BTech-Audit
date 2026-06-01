function fmt(v, type = 'num') {
  if (v === null || v === undefined) return '—';
  if (type === 'brl') return 'R$\u00a0' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  if (type === 'pct') return Number(v).toFixed(1) + '%';
  return String(v);
}

const KPI_DEF = [
  { key: 'ocupacao',      label: 'In-House',       type: 'num', color: 'var(--blue)',
    sub: (k) => k.taxaOcup ? `${k.taxaOcup.toFixed(1)}% ocupação` : 'hóspedes ativos',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="8" width="2.5" height="6" rx=".5" fill="currentColor" opacity=".4"/>
        <rect x="6" y="5" width="2.5" height="9" rx=".5" fill="currentColor" opacity=".7"/>
        <rect x="10.5" y="2" width="2.5" height="12" rx=".5" fill="currentColor"/>
      </svg>
    ),
  },
  { key: 'receita',       label: 'Receita Diária', type: 'brl', color: 'var(--green)',
    sub: (k) => `ADR ${fmt(k.adr, 'brl')}`,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1v2M8 13v2M4 8H2M14 8h-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".5"/>
        <circle cx="8" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M6.5 9.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5S8.83 8 8 8s-1.5-.67-1.5-1.5S7.17 5 8 5s1.5.67 1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  { key: 'faturados',     label: 'Faturados',      type: 'num', color: 'var(--cyan)',
    sub: () => 'direto + agências',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <line x1="2" y1="6.5" x2="14" y2="6.5" stroke="currentColor" strokeWidth="1.4"/>
        <line x1="5" y1="10" x2="7.5" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  },
  { key: 'grupos',        label: 'Grupos',         type: 'num', color: 'var(--purple)',
    sub: () => 'reservas em grupo',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
        <circle cx="11" cy="5.5" r="1.5" stroke="currentColor" strokeWidth="1.3" opacity=".6"/>
        <path d="M2 12.5c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M11 9.5c1.66 0 3 1.34 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity=".6"/>
      </svg>
    ),
  },
  { key: 'online',        label: 'OTA / Online',   type: 'num', color: 'var(--orange)',
    sub: () => 'Booking, Expedia...',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
        <ellipse cx="8" cy="8" rx="2.5" ry="5.5" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="2.5" y1="6" x2="13.5" y2="6" stroke="currentColor" strokeWidth="1.3"/>
        <line x1="2.5" y1="10" x2="13.5" y2="10" stroke="currentColor" strokeWidth="1.3"/>
      </svg>
    ),
  },
  { key: 'cortesias',     label: 'Cortesias',      type: 'num', color: 'var(--accent)',
    sub: () => 'complimentary',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 3C6 1 2.5 2 2.5 5c0 2 1.5 3.5 5.5 7 4-3.5 5.5-5 5.5-7 0-3-3.5-4-5.5-2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
  { key: 'divergencias',  label: 'Divergências',   type: 'num',
    color: (k) => k.divergencias > 0 ? 'var(--red)' : 'var(--green)',
    sub: (k) => k.divergencias > 0
      ? `R$ ${Number(k.divergenciaValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em risco`
      : 'Tarifas OK',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 1.5L14.5 13.5H1.5L8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <line x1="8" y1="6" x2="8" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="8" cy="11.2" r=".7" fill="currentColor"/>
      </svg>
    ),
  },
  { key: 'saidasHoje',    label: 'Saídas Hoje',    type: 'num', color: 'var(--accent2)',
    sub: (k) => `+ ${k.saidasAmanha} amanhã`,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10.5 1.5H14.5V14.5H10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M6 11L10 8L6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="1.5" y1="8" x2="10" y2="8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
];

function KpiCard({ def, kpis }) {
  const value = kpis[def.key];
  const color = typeof def.color === 'function' ? def.color(kpis) : def.color;
  const sub   = def.sub(kpis);

  return (
    <div style={{
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '14px 16px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'border-color .2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = color + '66'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* accent bar top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: .6 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: '.62rem', color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.8px' }}>
          {def.label}
        </span>
        <span style={{ color, opacity: .7 }}>{def.icon}</span>
      </div>

      <div style={{ fontFamily: 'var(--mono)', fontSize: '1.45rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1 }}>
        {fmt(value, def.type)}
      </div>

      <div style={{ fontSize: '.62rem', color: 'var(--text3)', marginTop: 5, fontFamily: 'var(--sans)' }}>
        {sub}
      </div>
    </div>
  );
}

export default function KpiGrid({ kpis }) {
  if (!kpis) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 8, marginBottom: 20 }}>
      {KPI_DEF.map(def => <KpiCard key={def.key} def={def} kpis={kpis} />)}
    </div>
  );
}
