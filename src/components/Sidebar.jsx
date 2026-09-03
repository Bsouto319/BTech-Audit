const ICONS = {
  dash: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  reg: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="1.5" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="4" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="4" y1="7.5" x2="11" y2="7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="4" y1="10" x2="8" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  div: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5L13.5 12.5H1.5L7.5 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      <line x1="7.5" y1="5.5" x2="7.5" y2="9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="7.5" cy="10.5" r=".6" fill="currentColor"/>
    </svg>
  ),
  sai: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M9.5 1.5H13.5V13.5H9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.5 10.5L9.5 7.5L5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="1.5" y1="7.5" x2="9.5" y2="7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  ai: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <line x1="7.5" y1="1" x2="7.5" y2="5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="7.5" y1="9.5" x2="7.5" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="1" y1="7.5" x2="5.5" y2="7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="9.5" y1="7.5" x2="14" y2="7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  hist: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1.5A6 6 0 1 1 1.5 7.5H1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M1 4.5L1.5 7.5L4.5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.5 4.5V8L9.5 9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  cfg: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7.5 1v1.5M7.5 12.5V14M14 7.5h-1.5M2.5 7.5H1M12 3L11 4M4 11l-1 1M12 12l-1-1M4 4L3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  admin: (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1L9.5 5.5H14L10.5 8.5L12 13L7.5 10.5L3 13L4.5 8.5L1 5.5H5.5L7.5 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  ),
};

export default function Sidebar({ page, setPage, hotelName, onSignOut, onOpenAdmin, isAdmin, alerts }) {
  const nav = [
    { id: 'dash', label: 'Dashboard' },
    { id: 'reg',  label: 'Registros' },
    { id: 'div',  label: 'Divergências', badge: alerts?.divergencias },
    { id: 'sai',  label: 'Saídas',       badge: alerts?.saidasHoje },
    // 'hist' (Histórico) e 'ai' (IA Insights) desativados de propósito: as duas enviam
    // dado de hóspede/reserva pra fora do navegador (Supabase e OpenAI, respectivamente).
    // Reativar só com aviso/consentimento claro sobre onde o dado vai parar.
    { id: 'cfg',  label: 'Config' },
  ];

  const s = {
    sidebar: {
      width: 200, background: 'var(--bg2)', borderRight: '1px solid var(--border)',
      padding: 0, position: 'fixed', height: '100vh', zIndex: 10,
      display: 'flex', flexDirection: 'column',
    },
    brand: { padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' },
    logo: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 },
    logoBox: {
      width: 28, height: 28, borderRadius: 6,
      background: 'var(--accent)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
    },
    logoText: { fontSize: '.82rem', color: 'var(--text)', fontFamily: 'var(--display)', fontWeight: 700, letterSpacing: '-.2px' },
    logoSub: { fontSize: '.58rem', color: 'var(--text3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '1px' },
    hotel: { marginTop: 10, padding: '4px 8px', background: 'rgba(232,168,56,.06)', borderRadius: 5, border: '1px solid rgba(232,168,56,.15)' },
    hotelText: { fontSize: '.62rem', color: 'var(--accent)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    nav: { padding: '10px 8px', flex: 1, overflowY: 'auto' },
    navItem: (active) => ({
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 1,
      background: active ? 'rgba(232,168,56,.1)' : 'transparent',
      color: active ? 'var(--accent)' : 'var(--text3)',
      transition: 'all .15s',
    }),
    navLeft: { display: 'flex', alignItems: 'center', gap: 9 },
    navLabel: { fontSize: '.78rem', fontWeight: 500 },
    badge: { background: 'var(--red)', color: '#fff', borderRadius: 8, padding: '1px 5px', fontSize: '.58rem', fontFamily: 'var(--mono)', fontWeight: 600 },
    footer: { padding: '12px', borderTop: '1px solid var(--border)' },
    signout: { width: '100%', padding: '7px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontSize: '.72rem', fontFamily: 'inherit', fontWeight: 500, transition: '.15s' },
  };

  return (
    <div style={s.sidebar}>
      <div style={s.brand}>
        <div style={s.logo}>
          <div style={s.logoBox}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="7" width="3" height="6" rx=".8" fill="#0a0b0e"/>
              <rect x="5.5" y="4" width="3" height="9" rx=".8" fill="#0a0b0e"/>
              <rect x="10" y="1" width="3" height="12" rx=".8" fill="#0a0b0e"/>
            </svg>
          </div>
          <div>
            <div style={s.logoText}>BTech Audit</div>
            <div style={s.logoSub}>v1.0</div>
          </div>
        </div>
        {hotelName && <div style={s.hotel}><p style={s.hotelText}>{hotelName}</p></div>}
      </div>
      <nav style={s.nav}>
        {nav.map(n => (
          <div key={n.id} onClick={() => setPage(n.id)} style={s.navItem(page === n.id)}>
            <span style={s.navLeft}>
              <span style={{ opacity: page === n.id ? 1 : 0.5 }}>{ICONS[n.id]}</span>
              <span style={s.navLabel}>{n.label}</span>
            </span>
            {n.badge > 0 && <span style={s.badge}>{n.badge}</span>}
          </div>
        ))}
        {isAdmin && (
          <div onClick={onOpenAdmin} style={{ ...s.navItem(false), marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
            <span style={s.navLeft}>
              <span style={{ opacity: .5 }}>{ICONS.admin}</span>
              <span style={s.navLabel}>Admin</span>
            </span>
          </div>
        )}
      </nav>
      <div style={s.footer}>
        <button style={s.signout}
          onMouseEnter={e => { e.target.style.color = 'var(--text)'; e.target.style.borderColor = 'var(--border2)'; }}
          onMouseLeave={e => { e.target.style.color = 'var(--text3)'; e.target.style.borderColor = 'var(--border)'; }}
          onClick={onSignOut}>
          Sair da conta
        </button>
      </div>
    </div>
  );
}
