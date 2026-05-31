import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const STATUS_COLORS = {
  active:   { bg: 'rgba(34,197,94,.12)',  color: '#22c55e', label: 'Ativo' },
  trial:    { bg: 'rgba(251,191,36,.12)', color: '#fbbf24', label: 'Trial' },
  canceled: { bg: 'rgba(239,68,68,.12)',  color: '#ef4444', label: 'Cancelado' },
};

export default function Admin({ onBack }) {
  const [profiles, setProfiles] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [toast,    setToast]    = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc('audit_admin_list_profiles');
    if (!error) setProfiles(data || []);
    setLoading(false);
  }

  async function setStatus(id, status) {
    await supabase.rpc('audit_admin_set_status', { p_id: id, p_status: status });
    showToast(`Status alterado para ${status}`);
    load();
  }

  async function resetTrial(id) {
    await supabase.rpc('audit_admin_reset_trial', { p_id: id });
    showToast('Trial resetado');
    load();
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const filtered = profiles.filter(p =>
    p.hotel_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total:    profiles.length,
    active:   profiles.filter(p => p.subscription_status === 'active').length,
    trial:    profiles.filter(p => p.subscription_status === 'trial').length,
    canceled: profiles.filter(p => p.subscription_status === 'canceled').length,
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', fontFamily: "'DM Sans', sans-serif", padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button onClick={onBack} style={{ background: '#1a2235', border: '1px solid #2a3550', borderRadius: 8, color: '#94a3b8', padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.82rem' }}>
          ← Voltar
        </button>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#e2e8f0' }}>Painel Admin</h1>
          <p style={{ color: '#475569', fontSize: '.78rem' }}>BTech Audit — Gestão de Clientes</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Hotéis', value: stats.total,    color: '#3b82f6' },
          { label: 'Ativos',       value: stats.active,   color: '#22c55e' },
          { label: 'Em Trial',     value: stats.trial,    color: '#fbbf24' },
          { label: 'Cancelados',   value: stats.canceled, color: '#ef4444' },
        ].map(k => (
          <div key={k.label} style={{ background: '#111827', border: '1px solid #2a3550', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ color: '#64748b', fontSize: '.75rem', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por hotel ou e-mail..."
          style={{ width: '100%', maxWidth: 400, padding: '9px 14px', background: '#1a2235', border: '1px solid #2a3550', borderRadius: 8, color: '#e2e8f0', fontFamily: 'inherit', fontSize: '.82rem', outline: 'none' }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#111827', border: '1px solid #2a3550', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e2d45' }}>
                {['Hotel', 'E-mail', 'Status', 'UHs', 'Stripe Customer', 'Cadastro', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', color: '#64748b', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Nenhum hotel encontrado.</td></tr>
              ) : filtered.map(p => {
                const sc = STATUS_COLORS[p.subscription_status] || STATUS_COLORS.trial;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #1a2235' }}>
                    <td style={{ padding: '12px 16px', color: '#e2e8f0', fontWeight: 600 }}>
                      {p.hotel_name || <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{p.email}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 20, fontSize: '.72rem', fontWeight: 700 }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{p.total_uh ?? '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {p.stripe_customer_id
                        ? <a href={`https://dashboard.stripe.com/customers/${p.stripe_customer_id}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '.72rem', fontFamily: 'monospace' }}>{p.stripe_customer_id.slice(0, 16)}…</a>
                        : <span style={{ color: '#475569' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                      {new Date(p.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {p.subscription_status !== 'active' && (
                          <button onClick={() => setStatus(p.id, 'active')} style={btnStyle('#22c55e')}>Ativar</button>
                        )}
                        {p.subscription_status !== 'trial' && (
                          <button onClick={() => resetTrial(p.id)} style={btnStyle('#fbbf24')}>Trial</button>
                        )}
                        {p.subscription_status !== 'canceled' && (
                          <button onClick={() => setStatus(p.id, 'canceled')} style={btnStyle('#ef4444')}>Cancelar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refresh */}
      <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={load} style={{ background: '#1a2235', border: '1px solid #2a3550', borderRadius: 8, color: '#94a3b8', padding: '6px 16px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.78rem' }}>
          ↻ Atualizar
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#22c55e', color: '#fff', padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: '.82rem', boxShadow: '0 4px 20px rgba(0,0,0,.4)' }}>
          {toast}
        </div>
      )}
    </div>
  );
}

const btnStyle = color => ({
  background: 'transparent',
  border: `1px solid ${color}`,
  borderRadius: 6,
  color,
  padding: '4px 10px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '.72rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
});
