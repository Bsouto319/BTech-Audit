import { useRef, useState } from 'react';
import { readFileAsText, parseCSV, processRows, calcKPIs } from '../lib/parser';

export default function UploadZone({ onData }) {
  const inputRef  = useRef();
  const [drag,    setDrag]    = useState(false);
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    setLoading(true);
    setStatus(null);
    try {
      if (name.endsWith('.csv')) {
        const text = await readFileAsText(file);
        const raw  = parseCSV(text);
        if (raw.length === 0) throw new Error('Nenhum registro encontrado. Verifique se o arquivo é a Consulta Geral de Reservas do VHF.');
        const { rows, checkouts } = processRows(raw);
        const kpis = calcKPIs(rows, raw);
        setStatus({ type: 'ok', msg: `✅ ${raw.length} linhas processadas → ${rows.length} in-house, ${checkouts.length} checkouts` });
        onData({ rows, checkouts, kpis, fileName: file.name, loadedAt: new Date() });
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        setStatus({ type: 'warn', msg: '⚠️ Para melhor precisão, exporte como CSV no VHF: Consulta Geral de Reservas → Exportar CSV' });
        setLoading(false);
        return;
      } else {
        throw new Error('Formato não suportado. Use CSV exportado do VHF.');
      }
    } catch (err) {
      setStatus({ type: 'err', msg: `❌ ${err.message}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div
        onClick={() => !loading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
        style={{
          border: `2px dashed ${drag ? '#3b82f6' : '#2a3550'}`,
          borderRadius: 12, padding: '32px 20px', textAlign: 'center',
          cursor: loading ? 'default' : 'pointer', transition: '.2s',
          background: drag ? 'rgba(59,130,246,.04)' : 'transparent',
        }}>
        <div style={{fontSize:32,marginBottom:8}}>{loading ? '⏳' : '📁'}</div>
        <p style={{color:'#94a3b8',fontWeight:600,fontSize:'.9rem'}}>
          {loading ? 'Processando...' : 'Arraste ou clique para carregar'}
        </p>
        <p style={{color:'#475569',fontSize:'.75rem',marginTop:4}}>
          Consulta Geral de Reservas — VHF FrontOffice (CSV)
        </p>
        <div style={{display:'flex',gap:6,justifyContent:'center',marginTop:12}}>
          {['CSV'].map(f => (
            <span key={f} style={{background:'rgba(59,130,246,.1)',color:'#3b82f6',border:'1px solid rgba(59,130,246,.2)',borderRadius:6,padding:'2px 8px',fontSize:'.68rem',fontWeight:700}}>{f}</span>
          ))}
        </div>
      </div>
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{display:'none'}} onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />

      {status && (
        <div style={{
          marginTop:10, padding:'9px 12px', borderRadius:8, fontSize:'.78rem',
          background: status.type === 'ok' ? 'rgba(16,185,129,.1)' : status.type === 'warn' ? 'rgba(245,158,11,.1)' : 'rgba(239,68,68,.1)',
          color:      status.type === 'ok' ? '#10b981'              : status.type === 'warn' ? '#f59e0b'              : '#ef4444',
          border:     `1px solid ${status.type === 'ok' ? 'rgba(16,185,129,.2)' : status.type === 'warn' ? 'rgba(245,158,11,.2)' : 'rgba(239,68,68,.2)'}`,
        }}>{status.msg}</div>
      )}
    </div>
  );
}
