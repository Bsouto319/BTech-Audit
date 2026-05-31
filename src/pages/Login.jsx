import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function Login({ onLogin }) {
  const { signIn, signUp } = useAuth();
  const [mode,     setMode]     = useState('login');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [hotel,    setHotel]    = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handle(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        if (!hotel.trim()) { setError('Informe o nome do hotel.'); setLoading(false); return; }
        await signUp(email, password, hotel);
      }
    } catch (err) {
      setError(err.message || 'Erro de autenticação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{minHeight:'100vh',background:'#0a0e1a',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{width:380,background:'#111827',border:'1px solid #2a3550',borderRadius:16,padding:36}}>
        <div style={{marginBottom:28,textAlign:'center'}}>
          <div style={{fontSize:28,marginBottom:8}}>🏨</div>
          <h1 style={{fontSize:'1.4rem',fontWeight:700,color:'#e2e8f0',letterSpacing:'-.5px'}}>BTech Audit</h1>
          <p style={{color:'#64748b',fontSize:'.82rem',marginTop:4}}>Auditoria Hoteleira Inteligente</p>
        </div>

        <div style={{display:'flex',gap:4,background:'#0a0e1a',padding:4,borderRadius:8,marginBottom:24}}>
          {['login','signup'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{flex:1,padding:'7px 0',borderRadius:6,border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:600,fontSize:'.78rem',background: mode===m ? '#3b82f6' : 'transparent',color: mode===m ? '#fff' : '#64748b',transition:'.15s'}}>
              {m === 'login' ? 'Entrar' : 'Cadastrar'}
            </button>
          ))}
        </div>

        <form onSubmit={handle}>
          {mode === 'signup' && (
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:'.75rem',fontWeight:600,color:'#94a3b8',marginBottom:5}}>Nome do Hotel</label>
              <input value={hotel} onChange={e => setHotel(e.target.value)} placeholder="Ex: Hotel Meliá Brasil XXI" style={inputStyle} />
            </div>
          )}
          <div style={{marginBottom:14}}>
            <label style={{display:'block',fontSize:'.75rem',fontWeight:600,color:'#94a3b8',marginBottom:5}}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="auditor@hotel.com" style={inputStyle} />
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:'.75rem',fontWeight:600,color:'#94a3b8',marginBottom:5}}>Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
          </div>

          {error && <div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,padding:'9px 12px',color:'#ef4444',fontSize:'.78rem',marginBottom:14}}>{error}</div>}

          <button type="submit" disabled={loading} style={{width:'100%',padding:'10px',borderRadius:8,border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:700,fontSize:'.88rem',background:'#3b82f6',color:'#fff',opacity:loading?0.7:1}}>
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        {mode === 'login' && (
          <p style={{textAlign:'center',marginTop:20,fontSize:'.72rem',color:'#475569'}}>
            Sem conta? <span onClick={() => setMode('signup')} style={{color:'#3b82f6',cursor:'pointer'}}>Cadastre seu hotel</span>
          </p>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  width:'100%',padding:'9px 12px',background:'#1a2235',border:'1px solid #2a3550',
  borderRadius:8,color:'#e2e8f0',fontFamily:'inherit',fontSize:'.82rem',outline:'none',
};
