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
        const { rows, checkouts, refDate, nextDate } = processRows(raw);
        const kpis = calcKPIs(rows, raw);
        setStatus({ type: 'ok', msg: `${raw.length} linhas processadas — ${rows.length} in-house, ${checkouts.length} checkouts` });
        onData({ rows, checkouts, kpis, refDate, nextDate, fileName: file.name, loadedAt: new Date() });
      } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        setStatus({ type: 'warn', msg: 'Exporte como CSV no VHF: Consulta Geral de Reservas → Exportar CSV' });
        setLoading(false);
        return;
      } else {
        throw new Error('Formato não suportado. Use CSV exportado do VHF.');
      }
    } catch (err) {
      setStatus({ type: 'err', msg: err.message });
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
          border: `1.5px dashed ${drag ? 'var(--accent)' : 'var(--border2)'}`,
          borderRadius: 10,
          padding: '28px 20px',
          textAlign: 'center',
          cursor: loading ? 'default' : 'pointer',
          transition: 'all .2s',
          background: drag ? 'rgba(232,168,56,.04)' : 'var(--bg)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {drag && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at center, rgba(232,168,56,.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{ marginBottom: 10, color: drag ? 'var(--accent)' : 'var(--text3)' }}>
          {loading ? (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="2" strokeDasharray="50 20" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="5" y="3" width="18" height="22" rx="2" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M9 8h6M9 12h10M9 16h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M19 18v5M17 21l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <p style={{ color: 'var(--text2)', fontWeight: 500, fontSize: '.83rem', marginBottom: 4 }}>
          {loading ? 'Processando arquivo...' : 'Arraste ou clique para carregar'}
        </p>
        <p style={{ color: 'var(--text3)', fontSize: '.7rem' }}>
          Consulta Geral de Reservas — VHF FrontOffice
        </p>

        {!loading && (
          <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 12 }}>
            {['CSV'].map(f => (
              <span key={f} style={{
                background: 'rgba(232,168,56,.08)', color: 'var(--accent)',
                border: '1px solid rgba(232,168,56,.2)', borderRadius: 4,
                padding: '2px 7px', fontSize: '.62rem', fontFamily: 'var(--mono)', fontWeight: 600,
              }}>{f}</span>
            ))}
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
        onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />

      {status && (
        <div style={{
          marginTop: 8,
          padding: '8px 12px',
          borderRadius: 7,
          fontSize: '.72rem',
          fontFamily: 'var(--mono)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: status.type === 'ok'
            ? 'rgba(38,208,124,.07)'
            : status.type === 'warn'
            ? 'rgba(232,168,56,.07)'
            : 'rgba(240,82,82,.07)',
          color: status.type === 'ok' ? 'var(--green)'
            : status.type === 'warn' ? 'var(--accent)'
            : 'var(--red)',
          border: `1px solid ${status.type === 'ok' ? 'rgba(38,208,124,.2)' : status.type === 'warn' ? 'rgba(232,168,56,.2)' : 'rgba(240,82,82,.2)'}`,
        }}>
          <span style={{ flexShrink: 0 }}>
            {status.type === 'ok' ? '✓' : status.type === 'warn' ? '!' : '✕'}
          </span>
          {status.msg}
        </div>
      )}
    </div>
  );
}
