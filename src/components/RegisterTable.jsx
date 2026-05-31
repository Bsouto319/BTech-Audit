import { useState, useMemo } from 'react';

const CAT_COLORS = {
  OTA:          { bg:'rgba(249,115,22,.12)', color:'#f97316' },
  DIRETO:       { bg:'rgba(59,130,246,.12)',  color:'#3b82f6' },
  B2B:          { bg:'rgba(6,182,212,.12)',   color:'#06b6d4' },
  GRUPO:        { bg:'rgba(139,92,246,.12)',  color:'#8b5cf6' },
  CORTESIA:     { bg:'rgba(245,158,11,.12)',  color:'#f59e0b' },
  CONFIDENCIAL: { bg:'rgba(239,68,68,.12)',   color:'#ef4444' },
  CREWS:        { bg:'rgba(16,185,129,.12)',  color:'#10b981' },
  OUTROS:       { bg:'rgba(100,116,139,.12)', color:'#64748b' },
};

function Badge({ cat }) {
  const s = CAT_COLORS[cat] || CAT_COLORS.OUTROS;
  return <span style={{...s,borderRadius:12,padding:'2px 7px',fontSize:'.6rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'.3px',whiteSpace:'nowrap'}}>{cat}</span>;
}

function AlertBadge({ alert }) {
  const label = { DIVERGENCIA_TARIFA:'TRF', SALDO_NEGATIVO:'SALDO', LIMITE_CREDITO:'LIMITE', CONFIDENCIAL:'CONF', DND:'DND' }[alert.type] || alert.type;
  return <span style={{background:'rgba(239,68,68,.12)',color:'#ef4444',borderRadius:8,padding:'1px 5px',fontSize:'.6rem',fontWeight:700,margin:'1px',display:'inline-block'}}>{label}</span>;
}

const FILTERS = ['todos','OTA','DIRETO','B2B','GRUPO','CORTESIA','CONFIDENCIAL','CREWS'];

export default function RegisterTable({ rows }) {
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [sort,   setSort]   = useState({ col: 'uh', dir: 1 });

  const filtered = useMemo(() => {
    let r = filter === 'todos' ? rows : rows.filter(x => x.categoria === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(x => x.nome.toLowerCase().includes(q) || x.uh.includes(q) || x.obs.toLowerCase().includes(q));
    }
    return [...r].sort((a, b) => {
      const va = a[sort.col] ?? '';
      const vb = b[sort.col] ?? '';
      if (typeof va === 'number') return (va - vb) * sort.dir;
      return String(va).localeCompare(String(vb)) * sort.dir;
    });
  }, [rows, filter, search, sort]);

  function toggleSort(col) {
    setSort(s => s.col === col ? { col, dir: -s.dir } : { col, dir: 1 });
  }

  function exportCSV() {
    const cols = ['UH','Nome','Categoria','Tarifa','Diária','TRF Esperado','Chegada','Partida','Origem','Segmento','Observações'];
    const lines = [cols.join(';'), ...filtered.map(r => [
      r.uh, r.nome, r.categoria, r.tarifa,
      r.diaria.toString().replace('.', ','),
      r.trf ?? '',
      r.chegada, r.partida, r.origem, r.segmento,
      `"${r.obs.replace(/"/g, '""')}"`,
    ].join(';'))];
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `registros_auditoria.csv`;
    a.click();
  }

  const th = (label, col) => (
    <th onClick={() => toggleSort(col)} style={{cursor:'pointer',userSelect:'none',padding:'9px 10px',color:'#64748b',fontWeight:600,fontSize:'.68rem',textTransform:'uppercase',letterSpacing:'.5px',background:'#1a2235',borderBottom:'1px solid #2a3550',textAlign:'left',whiteSpace:'nowrap'}}>
      {label} {sort.col === col ? (sort.dir > 0 ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,gap:12,flexWrap:'wrap'}}>
        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{padding:'4px 10px',borderRadius:16,border:'1px solid #2a3550',background: filter===f ? '#3b82f6' : 'transparent',color: filter===f ? '#fff' : '#64748b',cursor:'pointer',fontSize:'.68rem',fontWeight:600,fontFamily:'inherit',transition:'.15s'}}>
              {f === 'todos' ? 'Todos' : f}
            </button>
          ))}
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome, UH..." style={{padding:'6px 10px',background:'#1a2235',border:'1px solid #2a3550',borderRadius:8,color:'#e2e8f0',fontFamily:'inherit',fontSize:'.78rem',outline:'none',width:200}} />
          <button onClick={exportCSV} style={{padding:'6px 12px',borderRadius:8,border:'1px solid #2a3550',background:'transparent',color:'#94a3b8',cursor:'pointer',fontSize:'.75rem',fontFamily:'inherit',fontWeight:600}}>📊 CSV</button>
          <span style={{color:'#64748b',fontSize:'.72rem'}}>{filtered.length} registros</span>
        </div>
      </div>

      <div style={{background:'#111827',border:'1px solid #2a3550',borderRadius:12,overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'.78rem'}}>
            <thead>
              <tr>
                {th('UH','uh')}{th('Hóspede','nome')}{th('Categoria','categoria')}
                {th('Tarifa','diaria')}{th('TRF Obs','trf')}{th('Partida','partida')}
                <th style={{padding:'9px 10px',color:'#64748b',fontWeight:600,fontSize:'.68rem',textTransform:'uppercase',background:'#1a2235',borderBottom:'1px solid #2a3550',textAlign:'left'}}>Alertas</th>
                <th style={{padding:'9px 10px',color:'#64748b',fontWeight:600,fontSize:'.68rem',textTransform:'uppercase',background:'#1a2235',borderBottom:'1px solid #2a3550',textAlign:'left',maxWidth:260}}>Observação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{padding:32,textAlign:'center',color:'#64748b'}}>Nenhum registro encontrado</td></tr>
              )}
              {filtered.map((r, i) => (
                <tr key={i} style={{borderBottom:'1px solid #1a2235'}}>
                  <td style={{padding:'7px 10px'}}><span style={{fontFamily:'monospace',fontWeight:600,fontSize:'.78rem',padding:'1px 5px',background:'#1f2a40',borderRadius:3}}>{r.uh}</span></td>
                  <td style={{padding:'7px 10px',fontWeight:500}}>{r.nome}</td>
                  <td style={{padding:'7px 10px'}}><Badge cat={r.categoria} /></td>
                  <td style={{padding:'7px 10px',fontFamily:'monospace'}}>
                    R$ {Number(r.diaria).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                  </td>
                  <td style={{padding:'7px 10px',fontFamily:'monospace',color: r.trf !== null && Math.abs(r.diaria - r.trf) > 1 ? '#ef4444' : '#64748b'}}>
                    {r.trf !== null ? `R$ ${Number(r.trf).toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'}
                  </td>
                  <td style={{padding:'7px 10px',fontFamily:'monospace',color: r.isCheckoutToday ? '#ef4444' : r.isCheckoutTomorrow ? '#f59e0b' : '#94a3b8'}}>
                    {r.partida || '—'}
                  </td>
                  <td style={{padding:'7px 10px'}}>
                    {r.alerts.map((a, j) => <AlertBadge key={j} alert={a} />)}
                  </td>
                  <td style={{padding:'7px 10px',maxWidth:260}}>
                    <span title={r.obs} style={{fontSize:'.68rem',color:'#64748b',display:'block',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:250,cursor:'help'}}>{r.obs || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
