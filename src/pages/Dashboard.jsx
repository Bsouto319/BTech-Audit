import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import KpiGrid from '../components/KpiGrid';
import UploadZone from '../components/UploadZone';
import RegisterTable from '../components/RegisterTable';
import DivergenciasTable from '../components/DivergenciasTable';
import SaidasView from '../components/SaidasView';

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function Section({ title, right, children }) {
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 10, marginBottom: 12, overflow: 'hidden',
    }}>
      <div style={{
        padding: '11px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--bg2)',
      }}>
        <h3 style={{
          fontWeight: 600, fontSize: '.82rem', color: 'var(--text)',
          fontFamily: 'var(--display)',
        }}>{title}</h3>
        {right}
      </div>
      <div style={{ padding: '16px 18px' }}>{children}</div>
    </div>
  );
}

function AiInsights({ data }) {
  const [apiKey,   setApiKey]   = useState(localStorage.getItem('btaudit_openai') || '');
  const [question, setQuestion] = useState('');
  const [answer,   setAnswer]   = useState('');
  const [loading,  setLoading]  = useState(false);

  function saveKey() { localStorage.setItem('btaudit_openai', apiKey); }

  async function ask(q) {
    if (!apiKey) { alert('Configure a API Key da OpenAI primeiro.'); return; }
    if (!data)   { alert('Carregue um relatório primeiro.'); return; }
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
      setAnswer(`Erro: ${err.message}`);
    } finally { setLoading(false); }
  }

  const inp = {
    flex: 1, padding: '8px 12px', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: 7,
    color: 'var(--text)', fontFamily: 'inherit', fontSize: '.8rem', outline: 'none',
  };
  const btn = (color = 'var(--accent)') => ({
    padding: '8px 16px', borderRadius: 7, border: 'none',
    background: color === 'var(--accent)' ? 'rgba(232,168,56,.15)' : 'rgba(167,139,250,.15)',
    color, fontFamily: 'inherit', fontWeight: 600, fontSize: '.75rem',
    cursor: 'pointer', transition: 'all .15s', whiteSpace: 'nowrap',
  });

  const PROMPTS = ['Resumo geral', 'Divergências críticas', 'Saídas de risco', 'Ações prioritárias'];

  return (
    <div>
      <Section title="API Key OpenAI">
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..." style={inp} />
          <button onClick={saveKey} style={btn()}>Salvar</button>
        </div>
        {apiKey && <p style={{ color: 'var(--green)', fontSize: '.68rem', marginTop: 6, fontFamily: 'var(--mono)' }}>✓ API Key configurada</p>}
      </Section>

      <Section title="Análise Rápida" right={
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {PROMPTS.map(q => (
            <button key={q} onClick={() => ask(q)} style={btn('var(--purple)')}>{q}</button>
          ))}
        </div>
      }>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="Ex: Quais hóspedes têm divergência acima de R$50?"
            onKeyDown={e => e.key === 'Enter' && ask(question)} style={inp} />
          <button onClick={() => ask(question)} disabled={loading} style={{ ...btn('var(--purple)'), opacity: loading ? .5 : 1 }}>
            {loading ? '...' : 'Perguntar'}
          </button>
        </div>
        {answer && (
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '14px 16px', fontSize: '.8rem', color: 'var(--text)',
            whiteSpace: 'pre-wrap', lineHeight: 1.75,
          }}>
            {answer}
          </div>
        )}
      </Section>
    </div>
  );
}

function PageTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h2 style={{
        fontSize: '1.1rem', fontWeight: 700,
        fontFamily: 'var(--display)', color: 'var(--text)',
        letterSpacing: '-.3px',
      }}>{title}</h2>
      {sub && <p style={{ color: 'var(--text3)', fontSize: '.75rem', marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

function Empty() {
  return (
    <div style={{ textAlign: 'center', padding: '56px 0', color: 'var(--text3)', fontSize: '.82rem' }}>
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ marginBottom: 12, opacity: .3 }}>
        <rect x="4" y="4" width="24" height="24" rx="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M4 12h24M12 12v16" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
      <p>Carregue um relatório VHF para visualizar os dados.</p>
    </div>
  );
}

export default function Dashboard({ profile, onSignOut, isAdmin, onOpenAdmin }) {
  const [page, setPage] = useState('dash');
  const [data, setData] = useState(null);

  const reportDate = data?.refDate ? fmtDate(data.refDate) : null;

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', width: '100vw',
      background: 'var(--bg)', fontFamily: 'var(--sans)', color: 'var(--text)',
    }}>
      <Sidebar
        page={page} setPage={setPage}
        hotelName={profile?.hotel_name}
        onSignOut={onSignOut}
        isAdmin={isAdmin} onOpenAdmin={onOpenAdmin}
        alerts={{ divergencias: data?.kpis?.divergencias || 0, saidasHoje: data?.kpis?.saidasHoje || 0 }}
      />

      <main style={{ marginLeft: 200, flex: 1, padding: '18px 24px', minHeight: '100vh', maxWidth: '100%' }}>

        {/* Topbar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, padding: '10px 16px',
          background: 'var(--bg2)', borderRadius: 9, border: '1px solid var(--border)',
          flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {data ? (
              <>
                <span style={{
                  background: 'rgba(38,208,124,.08)', color: 'var(--green)',
                  border: '1px solid rgba(38,208,124,.2)', borderRadius: 5,
                  padding: '2px 9px', fontSize: '.65rem', fontFamily: 'var(--mono)', fontWeight: 600,
                }}>{data.fileName}</span>
                <span style={{ color: 'var(--text3)', fontSize: '.68rem', fontFamily: 'var(--mono)' }}>
                  {data.rows.length} in-house · {data.checkouts?.length || 0} checkouts
                </span>
              </>
            ) : (
              <span style={{ color: 'var(--text3)', fontSize: '.78rem' }}>Nenhum relatório carregado</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {reportDate && (
              <span style={{
                background: 'rgba(232,168,56,.08)', color: 'var(--accent)',
                border: '1px solid rgba(232,168,56,.2)', borderRadius: 5,
                padding: '3px 10px', fontSize: '.65rem', fontFamily: 'var(--mono)', fontWeight: 700,
              }}>
                {reportDate}
              </span>
            )}
            <span style={{
              background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)',
              borderRadius: 5, padding: '3px 10px', fontSize: '.65rem', fontFamily: 'var(--mono)',
            }}>
              {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* DASHBOARD */}
        {page === 'dash' && (
          <div style={{ animation: 'fadeUp .2s ease' }}>
            <PageTitle
              title="Dashboard"
              sub={data
                ? `${data.rows.length} hóspedes in-house${reportDate ? ` — relatório ${reportDate}` : ''}`
                : 'Carregue o relatório VHF para iniciar a auditoria'}
            />
            <KpiGrid kpis={data?.kpis} />
            <Section
              title="Carregar Relatório VHF"
              right={<span style={{ fontSize: '.63rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Consulta Geral · CSV</span>}
            >
              <UploadZone onData={setData} />
            </Section>
            {data?.kpis?.divergencias > 0 && (
              <div onClick={() => setPage('div')} style={{
                background: 'rgba(240,82,82,.05)',
                border: '1px solid rgba(240,82,82,.2)',
                borderRadius: 9, padding: '12px 18px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'background .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,82,82,.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(240,82,82,.05)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', background: 'var(--red)',
                    display: 'inline-block', animation: 'pulse-dot 2s ease infinite',
                  }} />
                  <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: '.82rem' }}>
                    {data.kpis.divergencias} divergências de tarifa detectadas
                  </span>
                  <span style={{ color: 'var(--text3)', fontSize: '.75rem' }}>
                    R$ {Number(data.kpis.divergenciaValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em risco
                  </span>
                </div>
                <span style={{ color: 'var(--red)', fontSize: '.75rem' }}>Ver detalhes →</span>
              </div>
            )}
          </div>
        )}

        {page === 'reg' && (
          <div>
            <PageTitle title="Registros" sub={data ? `${data.rows.length} hóspedes in-house` : 'Carregue um relatório'} />
            {data ? <RegisterTable rows={data.rows} /> : <Empty />}
          </div>
        )}

        {page === 'div' && (
          <div>
            <PageTitle title="Divergências de Tarifa" sub="TRF nas observações ≠ valor lançado no sistema" />
            {data ? <DivergenciasTable rows={data.rows} /> : <Empty />}
          </div>
        )}

        {page === 'sai' && (
          <div>
            <PageTitle
              title="Saídas Previstas"
              sub={data
                ? `${data.kpis?.saidasHoje || 0} em ${fmtDate(data.refDate)} · ${data.kpis?.saidasAmanha || 0} em ${fmtDate(data.nextDate)}`
                : 'Carregue um relatório'}
            />
            {data ? <SaidasView rows={data.rows} refDate={data.refDate} nextDate={data.nextDate} /> : <Empty />}
          </div>
        )}

        {page === 'ai' && (
          <div>
            <PageTitle title="IA Insights" sub="Análise inteligente via OpenAI — requer API Key" />
            <AiInsights data={data} />
          </div>
        )}

        {page === 'cfg' && (
          <div>
            <PageTitle title="Configurações" />
            <Section title="Conta">
              <div style={{ display: 'grid', gap: 6 }}>
                {[
                  ['Hotel', profile?.hotel_name || '—'],
                  ['E-mail', profile?.email || '—'],
                  ['Status', profile?.subscription_status || 'trial'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: '.8rem' }}>
                    <span style={{ color: 'var(--text3)' }}>{k}</span>
                    <span style={{ color: v === 'active' ? 'var(--green)' : 'var(--text)', fontFamily: 'var(--mono)', fontSize: '.75rem' }}>{v}</span>
                  </div>
                ))}
              </div>
              {profile?.subscription_status !== 'active' && (
                <button onClick={() => window.location.href = '/api/checkout'} style={{
                  marginTop: 16, padding: '10px 22px', borderRadius: 8, border: 'none',
                  background: 'var(--accent)', color: 'var(--bg)', fontFamily: 'inherit',
                  fontWeight: 700, fontSize: '.82rem', cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(232,168,56,.25)',
                }}>
                  Assinar — R$ 97/mês
                </button>
              )}
            </Section>
            <Section title="Sistema">
              <p style={{ color: 'var(--text3)', fontSize: '.75rem', lineHeight: 1.9, fontFamily: 'var(--mono)' }}>
                BTech Audit v1.0<br/>
                Parser VHF · Detecção TRF · IA Insights<br/>
                Desenvolvido por BTechSouto
              </p>
            </Section>
          </div>
        )}

      </main>
    </div>
  );
}
