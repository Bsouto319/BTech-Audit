function fmt(v, type = 'num') {
  if (v === null || v === undefined) return '—';
  if (type === 'brl') return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  if (type === 'pct') return Number(v).toFixed(1) + '%';
  return String(v);
}

const COLORS = { b: '#3b82f6', g: '#10b981', y: '#f59e0b', r: '#ef4444', p: '#8b5cf6', c: '#06b6d4', o: '#f97316', pk: '#ec4899' };

function Kpi({ label, value, sub, color, icon, type }) {
  const c = COLORS[color] || COLORS.b;
  return (
    <div style={{background:'#111827',border:'1px solid #2a3550',borderRadius:12,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:c}} />
      <div style={{fontSize:'.68rem',color:'#64748b',fontWeight:500,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>{label}</div>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:'1.3rem',fontWeight:700,color:'#e2e8f0',lineHeight:1}}>{fmt(value, type)}</div>
      {sub && <div style={{fontSize:'.65rem',color:'#64748b',marginTop:4}}>{sub}</div>}
      {icon && <div style={{position:'absolute',top:14,right:14,fontSize:'1.1rem',opacity:.5}}>{icon}</div>}
    </div>
  );
}

export default function KpiGrid({ kpis }) {
  if (!kpis) return null;
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10,marginBottom:20}}>
      <Kpi label="In-House"       value={kpis.ocupacao}          sub={kpis.taxaOcup ? `${kpis.taxaOcup.toFixed(1)}% ocupação` : 'hóspedes'} color="b" icon="🏨" />
      <Kpi label="Receita Diária" value={kpis.receita}           sub={`ADR ${fmt(kpis.adr,'brl')}`}  color="g" icon="💰" type="brl" />
      <Kpi label="Faturados/B2B"  value={kpis.faturados}         sub="direto + agências"             color="c" icon="📋" />
      <Kpi label="Grupos"         value={kpis.grupos}            sub="reservas em grupo"             color="p" icon="👥" />
      <Kpi label="Online/OTA"     value={kpis.online}            sub="Booking, Expedia..."           color="o" icon="🌐" />
      <Kpi label="Cortesias"      value={kpis.cortesias}         sub="complimentary"                 color="y" icon="🎁" />
      <Kpi label="Divergências"   value={kpis.divergencias}      sub={kpis.divergencias > 0 ? `R$ ${Number(kpis.divergenciaValor).toLocaleString('pt-BR',{minimumFractionDigits:2})} em risco` : 'OK'} color={kpis.divergencias > 0 ? 'r' : 'g'} icon="⚠️" />
      <Kpi label="Saídas Hoje"    value={kpis.saidasHoje}        sub={`+${kpis.saidasAmanha} amanhã`} color="pk" icon="🚪" />
    </div>
  );
}
