import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [hotel,    setHotel]    = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  async function handle(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        if (!hotel.trim()) { setError('Informe o nome do hotel.'); setLoading(false); return; }
        const result = await signUp(email, password, hotel);
        if (result?.user && !result?.session) {
          setDone(true);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('E-mail já cadastrado. Use a aba "Entrar" para fazer login.');
      } else if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
        setError('E-mail ou senha incorretos.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.');
      } else {
        setError(msg || 'Erro de autenticação.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div style={outer}>
        <div style={card}>
          <div style={{ fontSize: 48, marginBottom: 16, textAlign: 'center' }}>📧</div>
          <h2 style={{ color: '#e2e8f0', fontWeight: 700, textAlign: 'center', marginBottom: 10 }}>Confirme seu e-mail</h2>
          <p style={{ color: '#64748b', fontSize: '.85rem', textAlign: 'center', lineHeight: 1.6 }}>
            Enviamos um link de confirmação para <strong style={{ color: '#94a3b8' }}>{email}</strong>.<br />
            Clique no link e volte para fazer login.
          </p>
          <button onClick={() => { setDone(false); setMode('login'); }} style={{ ...btn, marginTop: 24 }}>
            Voltar para Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={outer}>
      {/* Blue glow decorations */}
      <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 700, height: 500, background: 'radial-gradient(ellipse, rgba(37,99,235,.25) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '20%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(59,130,246,.12) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '30%', right: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(96,165,250,.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <div style={card}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 14px' }}>
            🏨
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-.5px', margin: 0 }}>BTech Audit</h1>
          <p style={{ color: '#475569', fontSize: '.8rem', marginTop: 5 }}>Auditoria Hoteleira Inteligente</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#0d1525', borderRadius: 10, padding: 3, marginBottom: 24, border: '1px solid #1e2d45' }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 600, fontSize: '.8rem',
              background: mode === m ? 'linear-gradient(135deg,#1d4ed8,#3b82f6)' : 'transparent',
              color: mode === m ? '#fff' : '#475569', transition: '.2s',
              boxShadow: mode === m ? '0 2px 8px rgba(59,130,246,.3)' : 'none',
            }}>
              {m === 'login' ? 'Entrar' : 'Criar Conta'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handle}>
          {mode === 'signup' && (
            <Field label="Nome do Hotel">
              <input value={hotel} onChange={e => setHotel(e.target.value)} placeholder="Ex: Hotel Meliá Brasil XXI" style={input} required />
            </Field>
          )}
          <Field label="E-mail">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="auditor@hotel.com" style={input} required />
          </Field>
          <Field label="Senha">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" style={input} required minLength={6} />
          </Field>

          {error && (
            <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '10px 14px', color: '#f87171', fontSize: '.78rem', marginBottom: 16, lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={btn}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        {mode === 'login' && (
          <p style={{ textAlign: 'center', marginTop: 18, fontSize: '.75rem', color: '#334155' }}>
            Sem conta?{' '}
            <span onClick={() => { setMode('signup'); setError(''); }} style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}>
              Cadastre seu hotel
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: '.72rem', fontWeight: 700, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</label>
      {children}
    </div>
  );
}

const outer = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0a1628 0%, #0d2045 40%, #0a1a38 70%, #071020 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'DM Sans', sans-serif",
  position: 'relative',
  overflow: 'hidden',
};

const card = {
  width: 380,
  background: '#0f172a',
  border: '1px solid #1e3a5f',
  borderRadius: 20,
  padding: '36px 32px',
  position: 'relative',
  zIndex: 1,
  boxShadow: '0 25px 50px rgba(0,0,0,.5), 0 0 0 1px rgba(59,130,246,.1)',
};

const input = {
  width: '100%',
  padding: '10px 14px',
  background: '#0d1525',
  border: '1px solid #1e3a5f',
  borderRadius: 9,
  color: '#e2e8f0',
  fontFamily: 'inherit',
  fontSize: '.85rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const btn = {
  width: '100%',
  padding: '11px',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 700,
  fontSize: '.88rem',
  background: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
  color: '#fff',
  boxShadow: '0 4px 14px rgba(59,130,246,.35)',
  transition: '.2s',
};
