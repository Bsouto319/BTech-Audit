import { useMemo } from 'react';

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function Card({ r }) {
  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '11px 14px',
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', gap: 12,
      transition: 'border-color .15s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--mono)', fontWeight: 600, fontSize: '.7rem',
            padding: '1px 6px', background: 'rgba(75,158,255,.1)',
            color: 'var(--blue)', borderRadius: 4, flexShrink: 0,
          }}>{r.uh}</span>
          <span style={{ fontWeight: 500, color: 'var(--text)', fontSize: '.82rem' }}>{r.nome}</span>
          {r.confidencial && (
            <span style={{
              background: 'rgba(240,82,82,.1)', color: 'var(--red)',
              borderRadius: 4, padding: '1px 5px', fontSize: '.58rem',
              fontFamily: 'var(--mono)', fontWeight: 600,
            }}>CONF</span>
          )}
        </div>
        {r.obs && (
          <p style={{ fontSize: '.67rem', color: 'var(--text3)', marginTop: 2, lineHeight: 1.5 }}>
            {r.obs.slice(0, 160)}{r.obs.length > 160 ? '…' : ''}
          </p>
        )}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green)', fontSize: '.88rem' }}>
          {Number(r.diaria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '.63rem', color: 'var(--text3)', marginTop: 1 }}>{r.tarifa || '—'}</div>
        {r.horaPartida && r.horaPartida !== '30/12/1899 12:00:00' && (
          <div style={{ fontSize: '.63rem', color: 'var(--accent)', marginTop: 2 }}>⏱ {r.horaPartida}</div>
        )}
      </div>
    </div>
  );
}

function Section({ title, dot, rows, total }) {
  const dotColor = dot === 'red' ? 'var(--red)' : 'var(--accent)';
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 10, marginBottom: 12, overflow: 'hidden',
    }}>
      <div style={{
        padding: '11px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--bg2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: dotColor,
            display: 'inline-block', flexShrink: 0,
            animation: dot === 'red' ? 'pulse-dot 2s ease infinite' : 'none',
          }} />
          <h3 style={{ fontWeight: 600, fontSize: '.82rem', color: 'var(--text)', fontFamily: 'var(--display)' }}>{title}</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {rows.length > 0 && (
            <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)', fontWeight: 600, fontSize: '.75rem' }}>
              {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
          <span style={{
            background: `${dotColor}22`, color: dotColor,
            borderRadius: 10, padding: '1px 8px', fontSize: '.65rem',
            fontFamily: 'var(--mono)', fontWeight: 700,
          }}>{rows.length}</span>
        </div>
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.length === 0
          ? <div style={{ textAlign: 'center', padding: 24, color: 'var(--text3)', fontSize: '.78rem' }}>Nenhuma saída prevista</div>
          : rows.map((r, i) => <Card key={i} r={r} />)
        }
      </div>
    </div>
  );
}

export default function SaidasView({ rows, refDate, nextDate }) {
  const hoje   = useMemo(() => rows.filter(r => r.isCheckoutToday),    [rows]);
  const amanha = useMemo(() => rows.filter(r => r.isCheckoutTomorrow), [rows]);
  const totalHoje   = hoje.reduce((s, r) => s + r.diaria, 0);
  const totalAmanha = amanha.reduce((s, r) => s + r.diaria, 0);

  return (
    <div style={{ animation: 'fadeUp .25s ease' }}>
      <Section title={`Saídas ${refDate ? fmtDate(refDate) : 'do Dia'}`}  dot="red"    rows={hoje}   total={totalHoje} />
      <Section title={`Saídas ${nextDate ? fmtDate(nextDate) : 'Amanhã'}`} dot="amber" rows={amanha} total={totalAmanha} />
    </div>
  );
}
