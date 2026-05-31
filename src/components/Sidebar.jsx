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
    <div style={{ width: 200, background: '#111827', borderRight: '1px solid #2a3550', padding: '20px 0', position: 'fixed', height: '100vh', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 16px 20px', borderBottom: '1px solid #2a3550' }}>
        <div style={{ fontSize: 20, marginBottom: 4 }}>🏨</div>
        <h1 style={{ fontSize: '1rem', color: '#3b82f6', fontWeight: 700, letterSpacing: '-.3px' }}>BTech Audit</h1>
        <p style={{ fontSize: '.68rem', color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hotelName || 'Auditoria Hoteleira'}</p>
      </div>

      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {nav.map(n => (
          <div key={n.id} onClick={() => setPage(n.id)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: page === n.id ? '#1d4ed8' : 'transparent', color: page === n.id ? '#fff' : '#94a3b8', transition: '.15s', fontSize: '.82rem', fontWeight: 500 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{n.icon}</span>{n.label}
            </span>
            {n.badge > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: '.6rem', fontWeight: 700, fontFamily: 'monospace' }}>{n.badge}</span>
            )}
          </div>
        ))}

        {isAdmin && (
          <div onClick={onOpenAdmin}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 8, cursor: 'pointer', marginTop: 8, background: 'rgba(59,130,246,.08)', color: '#3b82f6', fontSize: '.82rem', fontWeight: 600, border: '1px solid rgba(59,130,246,.2)' }}>
            <span>🛠️</span> Admin
          </div>
        )}
      </nav>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #2a3550' }}>
        <button onClick={onSignOut} style={{ width: '100%', padding: '7px', borderRadius: 8, border: '1px solid #2a3550', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '.75rem', fontFamily: 'inherit', fontWeight: 600 }}>
          Sair
        </button>
      </div>
    </div>
  );
}
