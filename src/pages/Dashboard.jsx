import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import KpiGrid from '../components/KpiGrid';
import UploadZone from '../components/UploadZone';
import RegisterTable from '../components/RegisterTable';
import DivergenciasTable from '../components/DivergenciasTable';
import SaidasView from '../components/SaidasView';

const mono = "'JetBrains Mono',monospace";

const C = {
  bg:      '#050d1a',
  card:    '#071020',
  cardAlt: '#071828',
  border:  '#0f2544',
  accent:  '#2563eb',
  accentL: '#3b82f6',
  text:    '#c7d9f5',
  muted:   '#2d4a6e',
};

function Sec({ title, right, children }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ padding: '13px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#060f1e' }}>
        <h3 style={{ fontWeight: 700, fontSize: '.88rem', color: C.text }}>{title}</h3>
        {right}
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function AiInsights({ data }) {
  const [apiKey,   setApiKey]   = useState(localStorage.getItem('btaudit_openai') || '');
  const [question, setQuestion] = useState('');
  const [answer,   setAnswer]   = useState('');
  const [loading,  setLoading]  = useState(false);

  function saveKey() { localStorage.setItem('btaudit_openai', apiKey); }

  async function ask(q) {
    if (!apiKey) { alert('Configure a API Key da OpenAI primeiro.'); return; }
    if (!data) { alert('Carregue um relatório primeiro.'); return; }
    setLoading(true); setAnswer('');
    const summary = data.rows.slice(0, 80).map(r =>
      `UH ${r.uh} | ${r.nome} | ${r.categoria} | R$${r.diaria.toFixed(2)} | TRF:${r.trf ?? 'N/A'} | saída:${r.partida}`
    ).join('\n');
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o', messages: [
          { role: 'system', content: `Você é um auditor noturno hoteleiro especialista. Analise os dados e responda em português de forma objetiva.\n\n${summary}` },
          { role: 'user', content: q },
        ], max_tokens: 600 }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error?.message || 'Erro OpenAI');
      setAnswer(j.choices[0].message.content);
    } catch (err) {
      setAnswer(`❌ ${err.message}`);
    } finally { setLoading(false); }
  }

  const inp = { flex: 1, padding: '9px 14px', background: '#060f1e', border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: 'inherit', fontSize: '.83rem', outline: 'none' };

  return (
    <div>
      <Sec title="🔑 API Key OpenAI">
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." style={inp} />
          <button onClick={saveKey} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: '.78rem', cursor: 'pointer' }}>Salvar</button>
        </div>
        {apiKey && <p style={{ color: '#10b981', fontSize: '.72rem', marginTop: 6 }}>✅ API Key configurada</p>}
      </Sec>

      <Sec title="🤖 Análise Rápida" right={
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Resumo geral', 'Divergências críticas', 'Saídas de risco', 'Ações prioritárias'].map(q => (
            <button key={q} onClick={() => ask(q)} style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid rgba(139,92,246,.3)', background: 'rgba(139,92,246,.08)', color: '#8b5cf6', cursor: 'pointer', fontSize: '.7rem', fontFamily: 'inherit', fontWeight: 600 }}>{q}</button>
          ))}
        </div>
      }>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ex: Quais hóspedes têm divergência acima de R$50?" onKeyDown={e => e.key === 'Enter' && ask(question)} style={inp} />
          <button onClick={() => ask(question)} disabled={loading} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: '.78rem', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? '...' : 'Perguntar'}
          </button>
        </div>
        {answer && (
          <div style={{ background: '#060f1e', border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', fontSize: '.83rem', color: C.text, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
            {answer}
          </div>
        )}
      </Sec>
    </div>
  );
}

export default function Dashboard({ profile, onSignOut, isAdmin, onOpenAdmin }) {
  const [page, setPage] = useState('dash');
  const [data, setData] = useState(null);

  const ph = (title, sub) => (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-.5px', color: C.text }}>{title}</h2>
      {sub && <p style={{ color: C.muted, fontSize: '.8rem', marginTop: 4 }}>{sub}</p>}
    </div>
  );

  const reportDate = data?.refDate ? fmtDate(data.refDate) : null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100vw', background: `linear-gradient(160deg,#050d1a 0%,#071020 60%,#050c18 100%)`, fontFamily: "'DM Sans',sans-serif", color: C.text }}>
      <Sidebar page={page} setPage={setPage} hotelName={profile?.hotel_name} onSignOut={onSignOut}
        isAdmin={isAdmin} onOpenAdmin={onOpenAdmin}
        alerts={{ divergencias: data?.kpis?.divergencias || 0, saidasHoje: data?.kpis?.saidasHoje || 0 }} />

      <main style={{ marginLeft: 220, flex: 1, padding: '20px 28px', minHeight: '100vh', maxWidth: '100%' }}>

        {/* Topbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, padding: '12px 18px', background: '#060f1e', borderRadius: 12, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {data
              ? <>
                  <span style={{ background: 'rgba(16,185,129,.1)', color: '#10b981', border: '1px solid rgba(16,185,129,.2)', borderRadius: 20, padding: '3px 12px', fontSize: '.7rem', fontFamily: mono, fontWeight: 600 }}>{data.fileName}</span>
                  <span style={{ color: C.muted, fontSize: '.7rem' }}>· {data.rows.length} in-house · {data.checkouts?.length || 0} checkouts</span>
                </>
              : <span style={{ color: C.muted, fontSize: '.82rem' }}>Nenhum relatório carregado</span>
            }
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {reportDate && (
              <span style={{ background: 'rgba(37,99,235,.12)', color: '#60a5fa', border: '1px solid rgba(37,99,235,.2)', borderRadius: 8, padding: '4px 12px', fontSize: '.72rem', fontFamily: mono, fontWeight: 700 }}>
                📅 Relatório: {reportDate}
              </span>
            )}
            <span style={{ background: 'rgba(37,99,235,.06)', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 12px', fontSize: '.72rem', fontFamily: mono }}>
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* DASHBOARD */}
        {page === 'dash' && (
          <div>
            {ph('📊 Dashboard', data ? `${data.rows.length} hóspedes in-house — ${reportDate ? `relatório ${reportDate}` : 'auditoria ativa'}` : 'Carregue o relatório VHF para iniciar a auditoria')}
            <KpiGrid kpis={data?.kpis} />
            <Sec title="📁 Carregar Relatório VHF" right={<span style={{ fontSize: '.68rem', color: C.muted }}>Consulta Geral de Reservas · CSV</span>}>
              <UploadZone onData={setData} />
            </Sec>
            {data?.kpis?.divergencias > 0 && (
              <div onClick={() => setPage('div')} style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, padding: '14px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ {data.kpis.divergencias} divergências de tarifa detectadas</span>
                  <span style={{ color: '#60748b', fontSize: '.8rem', marginLeft: 10 }}>R$ {Number(data.kpis.divergenciaValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em risco</span>
                </div>
                <span style={{ color: '#ef4444', fontSize: '.78rem' }}>Ver detalhes →</span>
              </div>
            )}
          </div>
        )}

        {/* REGISTROS */}
        {page === 'reg' && (
          <div>
            {ph('📋 Registros', data ? `${data.rows.length} hóspedes in-house` : 'Carregue um relatório')}
            {data ? <RegisterTable rows={data.rows} /> : <Empty />}
          </div>
        )}

        {/* DIVERGÊNCIAS */}
        {page === 'div' && (
          <div>
            {ph('⚠️ Divergências de Tarifa', 'TRF nas observações ≠ valor lançado no sistema')}
            {data ? <DivergenciasTable rows={data.rows} /> : <Empty />}
          </div>
        )}

        {/* SAÍDAS */}
        {page === 'sai' && (
          <div>
            {ph('🚪 Saídas Previstas',
              data
                ? `${data.kpis?.saidasHoje || 0} em ${fmtDate(data.refDate)} · ${data.kpis?.saidasAmanha || 0} em ${fmtDate(data.nextDate)}`
                : 'Carregue um relatório'
            )}
            {data
              ? <SaidasView rows={data.rows} refDate={data.refDate} nextDate={data.nextDate} />
              : <Empty />
            }
          </div>
        )}

        {/* IA */}
        {page === 'ai' && (
          <div>
            {ph('🤖 IA Insights', 'Análise inteligente via OpenAI — requer API Key')}
            <AiInsights data={data} />
          </div>
        )}

        {/* CONFIG */}
        {page === 'cfg' && (
          <div>
            {ph('⚙️ Configurações')}
            <Sec title="Conta">
              <p style={{ color: '#60748b', fontSize: '.85rem', marginBottom: 6 }}>Hotel: <strong style={{ color: C.text }}>{profile?.hotel_name || '—'}</strong></p>
              <p style={{ color: '#60748b', fontSize: '.85rem', marginBottom: 6 }}>E-mail: <strong style={{ color: C.text }}>{profile?.email || '—'}</strong></p>
              <p style={{ color: '#60748b', fontSize: '.85rem' }}>Status: <strong style={{ color: profile?.subscription_status === 'active' ? '#10b981' : '#f59e0b' }}>{profile?.subscription_status || 'trial'}</strong></p>
              {profile?.subscription_status !== 'active' && (
                <button onClick={() => window.location.href = '/api/checkout'} style={{ marginTop: 16, padding: '10px 22px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#1d4ed8,#2563eb)', color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: '.88rem', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,.3)' }}>
                  🚀 Assinar — R$ 97/mês
                </button>
              )}
            </Sec>
            <Sec title="Sobre o Sistema">
              <p style={{ color: C.muted, fontSize: '.8rem', lineHeight: 1.8 }}>
                <strong style={{ color: C.text }}>BTech Audit v1.0</strong><br />
                Auditoria Hoteleira Inteligente<br />
                Parser VHF · Detecção de divergências TRF · IA Insights<br />
                Desenvolvido por BTechSouto
              </p>
            </Sec>
          </div>
        )}
      </main>
    </div>
  );
}

function Empty() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#1e3a5f', fontSize: '.9rem' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
      Carregue um relatório VHF para visualizar os dados.
    </div>
  );
}
