import { useMemo } from 'react';

function SevBadge({ sev }) {
  const s = { critical:['#7f1d1d','#fca5a5'], high:['#7c2d12','#fb923c'], medium:['#78350f','#fbbf24'] }[sev] || ['#1e293b','#64748b'];
  return <span style={{background:s[0],color:s[1],borderRadius:6,padding:'2px 7px',fontSize:'.62rem',fontWeight:700,textTransform:'uppercase'}}>{sev}</span>;
}

export default function DivergenciasTable({ rows }) {
  const divs = useMemo(() =>
    rows.filter(r => r.trf !== null && Math.abs(r.diaria - r.trf) > 1)
        .map(r => ({ ...r, diff: r.diaria - r.trf, absDiff: Math.abs(r.diaria - r.trf) }))
        .sort((a, b) => b.absDiff - a.absDiff),
    [rows]
  );

  const totalRisco = divs.reduce((s, r) => s + r.absDiff, 0);

  if (divs.length === 0) return (
    <div style={{background:'#111827',border:'1px solid #2a3550',borderRadius:12,padding:40,textAlign:'center',color:'#64748b'}}>
      <div style={{fontSize:32,marginBottom:8}}>✅</div>
      <p style={{fontWeight:600}}>Nenhuma divergência encontrada</p>
      <p style={{fontSize:'.78rem',marginTop:4}}>Todas as tarifas estão dentro do esperado</p>
    </div>
  );

  return (
    <div>
      <div style={{background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.2)',borderRadius:12,padding:'12px 18px',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <span style={{color:'#ef4444',fontWeight:700}}>{divs.length} divergências detectadas</span>
          <span style={{color:'#94a3b8',fontSize:'.82rem',marginLeft:8}}>— TRF nas observações ≠ valor lançado no sistema</span>
        </div>
        <span style={{color:'#ef4444',fontFamily:'monospace',fontWeight:700}}>
          R$ {totalRisco.toLocaleString('pt-BR',{minimumFractionDigits:2})} em risco
        </span>
      </div>

      <div style={{background:'#111827',border:'1px solid #2a3550',borderRadius:12,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.78rem'}}>
            <thead>
              <tr>
                {['UH','Hóspede','Sistema (lançado)','TRF (observação)','Diferença','Severidade','Observação'].map(h => (
                  <th key={h} style={{padding:'9px 10px',color:'#64748b',fontWeight:600,fontSize:'.68rem',textTransform:'uppercase',background:'#1a2235',borderBottom:'1px solid #2a3550',textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {divs.map((r, i) => {
                const sev = r.absDiff >= 50 ? 'critical' : r.absDiff >= 20 ? 'high' : 'medium';
                return (
                  <tr key={i} style={{borderBottom:'1px solid #1a2235',background: sev==='critical' ? 'rgba(239,68,68,.04)' : 'transparent'}}>
                    <td style={{padding:'7px 10px'}}><span style={{fontFamily:'monospace',fontWeight:700,padding:'1px 5px',background:'#1f2a40',borderRadius:3}}>{r.uh}</span></td>
                    <td style={{padding:'7px 10px',fontWeight:500}}>{r.nome}</td>
                    <td style={{padding:'7px 10px',fontFamily:'monospace'}}>R$ {Number(r.diaria).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                    <td style={{padding:'7px 10px',fontFamily:'monospace',color:'#10b981'}}>R$ {Number(r.trf).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                    <td style={{padding:'7px 10px',fontFamily:'monospace',color: r.diff > 0 ? '#ef4444' : '#10b981',fontWeight:700}}>
                      {r.diff > 0 ? '+' : ''}{Number(r.diff).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                    </td>
                    <td style={{padding:'7px 10px'}}><SevBadge sev={sev} /></td>
                    <td style={{padding:'7px 10px',maxWidth:280}}>
                      <span title={r.obs} style={{fontSize:'.68rem',color:'#64748b',display:'block',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:280,cursor:'help'}}>{r.obs || '—'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
