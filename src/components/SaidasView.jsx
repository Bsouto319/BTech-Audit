import { useMemo } from 'react';

function Card({ r }) {
  return (
    <div style={{background:'#1a2235',border:'1px solid #2a3550',borderRadius:10,padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
      <div style={{flex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
          <span style={{fontFamily:'monospace',fontWeight:700,fontSize:'.78rem',padding:'1px 5px',background:'#111827',borderRadius:3}}>{r.uh}</span>
          <span style={{fontWeight:600,color:'#e2e8f0'}}>{r.nome}</span>
          {r.confidencial && <span style={{background:'rgba(239,68,68,.12)',color:'#ef4444',borderRadius:6,padding:'1px 6px',fontSize:'.62rem',fontWeight:700}}>CONF</span>}
        </div>
        {r.obs && <p style={{fontSize:'.7rem',color:'#64748b',marginTop:4,lineHeight:1.5}}>{r.obs.slice(0, 180)}{r.obs.length > 180 ? '...' : ''}</p>}
      </div>
      <div style={{textAlign:'right',flexShrink:0}}>
        <div style={{fontFamily:'monospace',fontWeight:700,color:'#10b981',fontSize:'.9rem'}}>
          R$ {Number(r.diaria).toLocaleString('pt-BR',{minimumFractionDigits:2})}
        </div>
        <div style={{fontSize:'.68rem',color:'#64748b',marginTop:2}}>{r.tarifa || '—'}</div>
        {r.horaPartida && r.horaPartida !== '30/12/1899 12:00:00' && (
          <div style={{fontSize:'.68rem',color:'#f59e0b',marginTop:2}}>⏰ {r.horaPartida}</div>
        )}
      </div>
    </div>
  );
}

function Section({ title, color, rows }) {
  return (
    <div style={{background:'#111827',border:'1px solid #2a3550',borderRadius:12,marginBottom:14,overflow:'hidden'}}>
      <div style={{padding:'13px 18px',borderBottom:'1px solid #2a3550',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#1a2235'}}>
        <h3 style={{fontWeight:600,fontSize:'.9rem'}}>{title}</h3>
        <span style={{background:`rgba(${color},.12)`,color:`rgb(${color})`,borderRadius:10,padding:'2px 8px',fontSize:'.68rem',fontWeight:700}}>
          {rows.length}
        </span>
      </div>
      <div style={{padding:'12px 14px',display:'flex',flexDirection:'column',gap:8}}>
        {rows.length === 0
          ? <div style={{textAlign:'center',padding:20,color:'#475569',fontSize:'.82rem'}}>Nenhuma saída</div>
          : rows.map((r, i) => <Card key={i} r={r} />)}
      </div>
    </div>
  );
}

export default function SaidasView({ rows }) {
  const hoje   = useMemo(() => rows.filter(r => r.isCheckoutToday),    [rows]);
  const amanha = useMemo(() => rows.filter(r => r.isCheckoutTomorrow), [rows]);

  const totalHoje   = hoje.reduce((s, r) => s + r.diaria, 0);
  const totalAmanha = amanha.reduce((s, r) => s + r.diaria, 0);

  return (
    <div>
      {hoje.length > 0 && (
        <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:10,padding:'10px 16px',marginBottom:14,display:'flex',justifyContent:'space-between'}}>
          <span style={{color:'#ef4444',fontWeight:600}}>{hoje.length} saídas hoje</span>
          <span style={{fontFamily:'monospace',color:'#ef4444',fontWeight:700}}>R$ {totalHoje.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        </div>
      )}

      <Section title="🔴 Saídas Hoje"   color="239,68,68"   rows={hoje} />
      <Section title="🟡 Saídas Amanhã" color="245,158,11" rows={amanha} />

      {amanha.length > 0 && (
        <div style={{background:'rgba(245,158,11,.06)',border:'1px solid rgba(245,158,11,.15)',borderRadius:10,padding:'10px 16px',display:'flex',justifyContent:'space-between'}}>
          <span style={{color:'#f59e0b',fontWeight:600}}>{amanha.length} saídas amanhã</span>
          <span style={{fontFamily:'monospace',color:'#f59e0b',fontWeight:700}}>R$ {totalAmanha.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        </div>
      )}
    </div>
  );
}
