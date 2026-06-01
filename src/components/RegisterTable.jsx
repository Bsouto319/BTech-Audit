import { useState, useMemo } from 'react';

const CAT_COLORS = {
  OTA:          { bg: 'rgba(251,146,60,.1)',  color: '#fb923c' },
  DIRETO:       { bg: 'rgba(75,158,255,.1)',  color: '#4b9eff' },
  B2B:          { bg: 'rgba(34,211,238,.1)',  color: '#22d3ee' },
  GRUPO:        { bg: 'rgba(167,139,250,.1)', color: '#a78bfa' },
  CORTESIA:     { bg: 'rgba(232,168,56,.1)',  color: '#e8a838' },
  CONFIDENCIAL: { bg: 'rgba(240,82,82,.1)',   color: '#f05252' },
  CREWS:        { bg: 'rgba(38,208,124,.1)',  color: '#26d07c' },
  OUTROS:       { bg: 'rgba(100,116,139,.1)', color: '#64748b' },
};

function Badge({ cat }) {
  const s = CAT_COLORS[cat] || CAT_COLORS.OUTROS;
  return (
    <span style={{
      ...s, borderRadius: 4, padding: '2px 6px',
      fontSize: '.58rem', fontFamily: 'var(--mono)',
      fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px',
      whiteSpace: 'nowrap',
    }}>{cat}</span>
  );
}

function AlertDot({ alerts }) {
  if (!alerts?.length) return null;
  const hasCrit = alerts.some(a => a.severity === 'critical' || a.severity === 'high');
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
      background: hasCrit ? 'var(--red)' : 'var(--accent)',
      boxShadow: hasCrit ? '0 0 0 2px rgba(240,82,82,.2)' : '0 0 0 2px rgba(232,168,56,.2)',
    }} title={alerts.map(a => a.type).join(', ')} />
  );
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
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'registros_auditoria.csv'; a.click();
  }

  const TH = ({ label, col }) => (
    <th onClick={() => toggleSort(col)} style={{
      cursor: 'pointer', userSelect: 'none',
      padding: '9px 12px', color: sort.col === col ? 'var(--accent)' : 'var(--text3)',
      fontWeight: 600, fontSize: '.6rem', textTransform: 'uppercase',
      letterSpacing: '.8px', background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap',
    }}>
      {label}{sort.col === col ? (sort.dir > 0 ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div style={{ animation: 'fadeUp .25s ease' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '4px 10px', borderRadius: 5,
              border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
              background: filter === f ? 'rgba(232,168,56,.1)' : 'transparent',
              color: filter === f ? 'var(--accent)' : 'var(--text3)',
              cursor: 'pointer', fontSize: '.65rem', fontWeight: 600,
              fontFamily: 'inherit', transition: 'all .15s',
            }}>
              {f === 'todos' ? 'Todos' : f}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar UH, nome, obs..."
            style={{
              padding: '6px 12px', borderRadius: 6, width: 200,
              border: '1px solid var(--border)', background: 'var(--bg)',
              color: 'var(--text)', fontSize: '.75rem', outline: 'none',
              fontFamily: 'inherit', transition: 'border-color .15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button onClick={exportCSV} style={{
            padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'var(--bg)',
            color: 'var(--text2)', fontSize: '.7rem', fontFamily: 'inherit',
            fontWeight: 500, transition: 'all .15s', whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)'; }}
          >
            ↓ Exportar
          </button>
        </div>
      </div>

      {/* Count */}
      <div style={{ marginBottom: 8, fontSize: '.68rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
        {filtered.length} de {rows.length} registros
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.75rem' }}>
            <thead>
              <tr>
                <TH label="UH"       col="uh" />
                <TH label="Hóspede"  col="nome" />
                <TH label="Cat."     col="categoria" />
                <TH label="Diária"   col="diaria" />
                <TH label="TRF"      col="trf" />
                <TH label="Chegada"  col="chegada" />
                <TH label="Saída"    col="partida" />
                <TH label="Alertas"  col="alerts" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.018)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '7px 12px' }}>
                    <span style={{
                      fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '.7rem',
                      padding: '1px 5px', background: 'rgba(75,158,255,.1)',
                      color: 'var(--blue)', borderRadius: 4,
                    }}>{r.uh}</span>
                  </td>
                  <td style={{ padding: '7px 12px', fontWeight: 500, color: 'var(--text)', maxWidth: 180 }}>
                    <span style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.nome}
                    </span>
                  </td>
                  <td style={{ padding: '7px 12px' }}><Badge cat={r.categoria} /></td>
                  <td style={{ padding: '7px 12px', fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                    {Number(r.diaria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '7px 12px', fontFamily: 'var(--mono)', color: r.trf ? 'var(--green)' : 'var(--text3)' }}>
                    {r.trf ? Number(r.trf).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td style={{ padding: '7px 12px', fontFamily: 'var(--mono)', color: 'var(--text3)', fontSize: '.7rem' }}>
                    {r.chegada ? r.chegada.split('-').reverse().join('/') : '—'}
                  </td>
                  <td style={{ padding: '7px 12px', fontFamily: 'var(--mono)', color: r.isCheckoutToday ? 'var(--red)' : r.isCheckoutTomorrow ? 'var(--accent)' : 'var(--text3)', fontSize: '.7rem' }}>
                    {r.partida ? r.partida.split('-').reverse().join('/') : '—'}
                  </td>
                  <td style={{ padding: '7px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <AlertDot alerts={r.alerts} />
                      {r.alerts?.length > 0 && (
                        <span style={{ fontSize: '.63rem', color: 'var(--text3)' }}>
                          {r.alerts.length}
                        </span>
                      )}
                    </div>
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
