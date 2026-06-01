import { useMemo } from 'react';

function SevBadge({ sev }) {
  const map = {
    critical: { bg: 'rgba(240,82,82,.12)', color: 'var(--red)',    label: 'CRÍTICA'  },
    high:     { bg: 'rgba(251,146,60,.12)', color: 'var(--orange)', label: 'ALTA'     },
    medium:   { bg: 'rgba(232,168,56,.12)', color: 'var(--accent)', label: 'MÉDIA'    },
  };
  const s = map[sev] || map.medium;
  return (
    <span style={{
      background: s.bg, color: s.color,
      borderRadius: 4, padding: '2px 6px',
      fontSize: '.58rem', fontFamily: 'var(--mono)',
      fontWeight: 600, letterSpacing: '.5px',
    }}>{s.label}</span>
  );
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
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 10, padding: 48, textAlign: 'center',
    }}>
      <div style={{ marginBottom: 10 }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ color: 'var(--green)', opacity: .6 }}>
          <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10 16l4 4 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p style={{ color: 'var(--text2)', fontWeight: 600, fontSize: '.88rem', marginBottom: 4 }}>Nenhuma divergência encontrada</p>
      <p style={{ color: 'var(--text3)', fontSize: '.75rem' }}>Todas as tarifas estão dentro do esperado</p>
    </div>
  );

  return (
    <div style={{ animation: 'fadeUp .25s ease' }}>
      {/* Summary banner */}
      <div style={{
        background: 'rgba(240,82,82,.06)',
        border: '1px solid rgba(240,82,82,.2)',
        borderRadius: 10, padding: '12px 18px', marginBottom: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--red)', flexShrink: 0 }}>
            <path d="M7 1L13 12H1L7 1Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            <line x1="7" y1="5" x2="7" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="7" cy="10" r=".6" fill="currentColor"/>
          </svg>
          <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: '.8rem' }}>{divs.length} divergências detectadas</span>
          <span style={{ color: 'var(--text3)', fontSize: '.75rem' }}>— TRF nas obs ≠ valor lançado</span>
        </div>
        <span style={{ color: 'var(--red)', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '.82rem' }}>
          R$ {totalRisco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em risco
        </span>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.75rem' }}>
            <thead>
              <tr>
                {['UH','Hóspede','Lançado','TRF Esperado','Δ Diferença','Sev.','Observação'].map(h => (
                  <th key={h} style={{
                    padding: '9px 12px', color: 'var(--text3)', fontWeight: 600,
                    fontSize: '.6rem', textTransform: 'uppercase', letterSpacing: '.8px',
                    background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
                    textAlign: 'left', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {divs.map((r, i) => {
                const sev = r.absDiff >= 50 ? 'critical' : r.absDiff >= 20 ? 'high' : 'medium';
                return (
                  <tr key={i} style={{
                    borderBottom: '1px solid var(--border)',
                    background: sev === 'critical' ? 'rgba(240,82,82,.03)' : 'transparent',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = sev === 'critical' ? 'rgba(240,82,82,.03)' : 'transparent'}
                  >
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{
                        fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '.72rem',
                        padding: '2px 6px', background: 'rgba(75,158,255,.1)',
                        color: 'var(--blue)', borderRadius: 4,
                      }}>{r.uh}</span>
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text)' }}>{r.nome}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', color: 'var(--text2)' }}>
                      {Number(r.diaria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px 12px', fontFamily: 'var(--mono)', color: 'var(--green)', fontWeight: 500 }}>
                      {Number(r.trf).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{
                      padding: '8px 12px', fontFamily: 'var(--mono)', fontWeight: 700,
                      color: r.diff > 0 ? 'var(--red)' : 'var(--green)',
                    }}>
                      {r.diff > 0 ? '+' : ''}{Number(r.diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px 12px' }}><SevBadge sev={sev} /></td>
                    <td style={{ padding: '8px 12px', maxWidth: 260 }}>
                      <span title={r.obs} style={{
                        fontSize: '.68rem', color: 'var(--text3)',
                        display: 'block', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: 260, cursor: 'help',
                      }}>{r.obs || '—'}</span>
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
