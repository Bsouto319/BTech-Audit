import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

const ADMIN_EMAIL = 'brunosouto1108@gmail.com';

export default function App() {
  const { user, profile, isActive, signOut } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  if (user === undefined) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: "'DM Sans', sans-serif" }}>
        Carregando...
      </div>
    );
  }

  if (!user) return <Login />;

  // Admin panel — só para Bruno
  if (user.email === ADMIN_EMAIL && showAdmin) {
    return <Admin onBack={() => setShowAdmin(false)} />;
  }

  if (user && profile && !isActive) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ background: '#111827', border: '1px solid #2a3550', borderRadius: 16, padding: 36, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
          <h2 style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 8 }}>Assinatura inativa</h2>
          <p style={{ color: '#64748b', fontSize: '.85rem', marginBottom: 20 }}>Reative para continuar usando o BTech Audit.</p>
          <button onClick={() => window.location.href = '/api/checkout'} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: '.9rem', cursor: 'pointer', display: 'block', width: '100%', marginBottom: 10 }}>
            Reativar assinatura
          </button>
          <button onClick={signOut} style={{ padding: '8px 0', background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.8rem' }}>Sair</button>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      profile={profile}
      onSignOut={signOut}
      isAdmin={user.email === ADMIN_EMAIL}
      onOpenAdmin={() => setShowAdmin(true)}
    />
  );
}
