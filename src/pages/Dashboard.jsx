import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import KpiGrid from '../components/KpiGrid';
import UploadZone from '../components/UploadZone';
import RegisterTable from '../components/RegisterTable';
import DivergenciasTable from '../components/DivergenciasTable';
import SaidasView from '../components/SaidasView';

const mono = "'JetBrains Mono',monospace";

function Sec({ title, right, children }) {
  return (
    <div style={{background:'#111827',border:'1px solid #2a3550',borderRadius:12,marginBottom:14,overflow:'hidden'}}>
      <div style={{padding:'13px 18px',borderBottom:'1px solid #2a3550',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#1a2235'}}>
        <h3 style={{fontWeight:600,fontSize:'.9rem'}}>{title}</h3>
        {right}
      </div>
      <div style={{padding:'14px 18px'}}>{children}</div>
    </div>
  );
}

function AiInsights({ data }) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('btaudit_openai') || '');
  const [question, setQuestion] = useState('');
  const [answer,   setAnswer]   = useState('');
  const [loading,  setLoading]  = useState(false);

  function saveKey() { localStorage.setItem('btaudit_openai', apiKey); }

  async function ask(q) {
    if (!apiKey) { alert('Configure a API Key da OpenAI primeiro.'); return; }
    if (!data) { alert('Carregue um relatório primeiro.'); return; }
    setLoading(true);
    setAnswer('');
    const summary = data.rows.slice(0, 80).map(r =>
      `UH ${r.uh} | ${r.nome} | ${r.categoria} | R$${r.diaria.toFixed(2)} | TRF:${r.trf ?? 'N/A'} | saída:${r.partida}`
    ).join('\n');

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role:'system', content:`Você é um auditor noturno hoteleiro especialista. Analise os dados e responda em português de forma objetiva e direta. Dados do relatório:\n${summary}` },
            { role:'user', content: q },
          ],
          max_tokens: 600,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error?.message || 'Erro OpenAI');
      setAnswer(j.choices[0].message.content);
    } catch (err) {
      setAnswer(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Sec title="🔑 API Key OpenAI">
        <div style={{display:'flex',gap:8}}>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..." style={{flex:1,padding:'8px 12px',background:'#1a2235',border:'1px solid #2a3550',borderRadius:8,color:'#e2e8f0',fontFamily:'inherit',fontSize:'.82rem',outline:'none'}} />
          <button onClick={saveKey} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#3b82f6',color:'#fff',fontFamily:'inherit',fontWeight:600,fontSize:'.78rem',cursor:'pointer'}}>Salvar</button>
        </div>
        {apiKey && <p style={{color:'#10b981',fontSize:'.72rem',marginTop:6}}>✅ API Key configurada</p>}
      </Sec>

      <Sec title="🤖 Análise Rápida" right={
        <div style={{display:'flex',gap:6}}>
          {['Resumo geral','Divergências críticas','Saídas de risco','Ações prioritárias'].map(q => (
            <button key={q} onClick={() => ask(q)} style={{padding:'5px 10px',borderRadius:8,border:'1px solid rgba(139,92,246,.3)',background:'rgba(139,92,246,.1)',color:'#8b5cf6',cursor:'pointer',fontSize:'.7rem',fontFamily:'inherit',fontWeight:600}}>
              {q}
            </button>
          ))}
        </div>
      }>
        <div style={{display:'flex',gap:8,marginBottom:12}}>
          <input value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="Ex: Quais hóspedes têm divergência acima de R$50?"
            onKeyDown={e => e.key === 'Enter' && ask(question)}
            style={{flex:1,padding:'8px 12px',background:'#1a2235',border:'1px solid #2a3550',borderRadius:8,color:'#e2e8f0',fontFamily:'inherit',fontSize:'.82rem',outline:'none'}} />
          <button onClick={() => ask(question)} disabled={loading} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'#8b5cf6',color:'#fff',fontFamily:'inherit',fontWeight:600,fontSize:'.78rem',cursor:'pointer',opacity:loading?0.6:1}}>
            {loading ? '...' : 'Perguntar'}
          </button>
        </div>
        {answer && (
          <div style={{background:'#0a0e1a',border:'1px solid #2a3550',borderRadius:8,padding:'14px 16px',fontSize:'.82rem',color:'#e2e8f0',whiteSpace:'pre-wrap',lineHeight:1.6}}>
            {answer}
          </div>
        )}
      </Sec>
    </div>
  );
}

export default function Dashboard({ profile, onSignOut }) {
  const [page,   setPage]   = useState('dash');
  const [data,   setData]   = useState(null);

  const ph = (title, sub) => (
    <div style={{marginBottom:20}}>
      <h2 style={{fontSize:'1.3rem',fontWeight:700,letterSpacing:'-.5px',color:'#e2e8f0'}}>{title}</h2>
      {sub && <p style={{color:'#64748b',fontSize:'.82rem',marginTop:3}}>{sub}</p>}
    </div>
  );

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#0a0e1a',fontFamily:"'DM Sans',sans-serif",color:'#e2e8f0'}}>
      <Sidebar page={page} setPage={setPage} hotelName={profile?.hotel_name} onSignOut={onSignOut}
        alerts={{ divergencias: data?.kpis?.divergencias || 0, saidasHoje: data?.kpis?.saidasHoje || 0 }} />

      <main style={{marginLeft:200,flex:1,padding:'24px 28px',minHeight:'100vh'}}>

        {/* Topbar */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            {data && <span style={{background:'rgba(16,185,129,.1)',color:'#10b981',border:'1px solid rgba(16,185,129,.2)',borderRadius:20,padding:'4px 12px',fontSize:'.72rem',fontFamily:mono,fontWeight:600}}>{data.fileName}</span>}
            {data && <span style={{color:'#475569',fontSize:'.7rem'}}>carregado {data.loadedAt.toLocaleTimeString('pt-BR')}</span>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{background:'rgba(59,130,246,.1)',color:'#3b82f6',border:'1px solid rgba(59,130,246,.2)',borderRadius:20,padding:'4px 12px',fontSize:'.72rem',fontFamily:mono,fontWeight:600}}>
              {new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'})}
            </span>
          </div>
        </div>

        {/* DASHBOARD */}
        {page === 'dash' && (
          <div>
            {ph('📊 Dashboard', data ? `${data.rows.length} hóspedes in-house · auditoria ${new Date().toLocaleDateString('pt-BR')}` : 'Carregue o relatório VHF para iniciar')}
            <KpiGrid kpis={data?.kpis} />
            <Sec title="📁 Carregar Relatório" right={<span style={{fontSize:'.68rem',color:'#475569'}}>VHF · Consulta Geral de Reservas</span>}>
              <UploadZone onData={setData} />
            </Sec>
            {data?.kpis?.divergencias > 0 && (
              <div onClick={() => setPage('div')} style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',borderRadius:12,padding:'14px 18px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',transition:'.2s'}}>
                <div>
                  <span style={{color:'#ef4444',fontWeight:700}}>⚠️ {data.kpis.divergencias} divergências de tarifa detectadas</span>
                  <span style={{color:'#94a3b8',fontSize:'.82rem',marginLeft:8}}>· R$ {Number(data.kpis.divergenciaValor).toLocaleString('pt-BR',{minimumFractionDigits:2})} em risco</span>
                </div>
                <span style={{color:'#ef4444',fontSize:'.78rem'}}>Ver detalhes →</span>
              </div>
            )}
          </div>
        )}

        {/* REGISTROS */}
        {page === 'reg' && (
          <div>
            {ph('📋 Registros', data ? `${data.rows.length} hóspedes in-house` : 'Carregue um relatório')}
            {data ? <RegisterTable rows={data.rows} /> : <p style={{color:'#64748b'}}>Nenhum dado carregado.</p>}
          </div>
        )}

        {/* DIVERGÊNCIAS */}
        {page === 'div' && (
          <div>
            {ph('⚠️ Divergências de Tarifa', 'TRF nas observações ≠ valor lançado no sistema')}
            {data ? <DivergenciasTable rows={data.rows} /> : <p style={{color:'#64748b'}}>Nenhum dado carregado.</p>}
          </div>
        )}

        {/* SAÍDAS */}
        {page === 'sai' && (
          <div>
            {ph('🚪 Saídas Previstas', `${data?.kpis?.saidasHoje || 0} hoje · ${data?.kpis?.saidasAmanha || 0} amanhã`)}
            {data ? <SaidasView rows={data.rows} /> : <p style={{color:'#64748b'}}>Nenhum dado carregado.</p>}
          </div>
        )}

        {/* IA */}
        {page === 'ai' && (
          <div>
            {ph('🤖 IA Insights', 'Análise inteligente via OpenAI · requer API Key')}
            <AiInsights data={data} />
          </div>
        )}

        {/* CONFIG */}
        {page === 'cfg' && (
          <div>
            {ph('⚙️ Configurações')}
            <Sec title="Conta">
              <p style={{color:'#94a3b8',fontSize:'.85rem',marginBottom:4}}>Hotel: <strong>{profile?.hotel_name || '—'}</strong></p>
              <p style={{color:'#94a3b8',fontSize:'.85rem',marginBottom:4}}>Status: <strong style={{color: profile?.subscription_status === 'active' ? '#10b981' : '#f59e0b'}}>{profile?.subscription_status || 'trial'}</strong></p>
              {profile?.subscription_status !== 'active' && (
                <button onClick={() => window.location.href='/api/checkout'} style={{marginTop:12,padding:'9px 18px',borderRadius:8,border:'none',background:'#3b82f6',color:'#fff',fontFamily:'inherit',fontWeight:700,fontSize:'.85rem',cursor:'pointer'}}>
                  🚀 Assinar — R$ 97/mês
                </button>
              )}
            </Sec>
            <Sec title="Sobre">
              <p style={{color:'#64748b',fontSize:'.8rem',lineHeight:1.6}}>
                BTech Audit v1.0 — Auditoria Hoteleira Inteligente<br/>
                Parser VHF · Detecção de divergências · IA Insights<br/>
                Desenvolvido por BTechSouto
              </p>
            </Sec>
          </div>
        )}
      </main>
    </div>
  );
}
