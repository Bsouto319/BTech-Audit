export default function Sidebar({ page, setPage, hotelName, onSignOut, onOpenAdmin, isAdmin, alerts }) {
  const nav = [
    { id: 'dash', icon: '📊', label: 'Dashboard' },
    { id: 'reg',  icon: '📋', label: 'Registros' },
    { id: 'div',  icon: '⚠️', label: 'Divergências', badge: alerts?.divergencias },
    { id: 'sai',  icon: '🚪', label: 'Saídas',        badge: alerts?.saidasHoje },
    { id: 'ai',   icon: '🤖', label: 'IA Insights' },
    { id: 'cfg',  icon: '⚙️', label: 'Configurações' },
  ];

  return (
    <div style={{ width: 220, background: 'linear-gradient(180deg,#040c18 0%,#050e1c 100%)', borderRight: '1px solid #0f2544', padding: '0', position: 'fixed', height: '100vh', zIndex: 10, display: 'flex', flexDirection: 'column' }}>

      {/* Brand */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid #0f2544' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>🏨</div>
          <div>
            <div style={{ fontSize: '.9rem', color: '#60a5fa', fontWeight: 700, letterSpacing: '-.3px' }}>BTech Audit</div>
            <div style={{ fontSize: '.62rem', color: '#1e4080', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Enterprise</div>
          </div>
        </div>
        {hotelName && (
          <div style={{ marginTop: 8, padding: '5px 8px', background: 'rgba(37,99,235,.1)', borderRadius: 6, border: '1px solid rgba(37,99,235,.2)' }}>
            <p style={{ fontSize: '.68rem', color: '#60a5fa', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hotelName}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
        {nav.map(n => (
          <div key={n.id} onClick={() => setPage(n.id)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
              background: page === n.id ? 'linear-gradient(135deg,rgba(29,78,216,.6),rgba(37,99,235,.4))' : 'transparent',
              color: page === n.id ? '#93c5fd' : '#4a6a9c',
              borderLeft: page === n.id ? '2px solid #3b82f6' : '2px solid transparent',
              transition: '.15s', fontSize: '.82rem', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1rem' }}>{n.icon}</span>{n.label}
            </span>
            {n.badge > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: '.6rem', fontWeight: 700, fontFamily: 'monospace' }}>{n.badge}</span>
            )}
          </div>
        ))}

        {isAdmin && (
          <div onClick={onOpenAdmin}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', marginTop: 12, background: 'rgba(37,99,235,.08)', color: '#3b82f6', fontSize: '.82rem', fontWeight: 600, border: '1px solid rgba(37,99,235,.15)', borderLeft: '2px solid #3b82f6' }}>
            <span>🛠️</span> Admin
          </div>
        )}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid #0f2544' }}>
        <button onClick={onSignOut} style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid #0f2544', background: 'transparent', color: '#2d4a6e', cursor: 'pointer', fontSize: '.75rem', fontFamily: 'inherit', fontWeight: 600, transition: '.15s' }}>
          Sair
        </button>
      </div>
    </div>
  );
}
