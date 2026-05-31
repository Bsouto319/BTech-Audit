import { useMemo } from 'react';

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function Card({ r }) {
  return (
    <div style={{ background: '#071428', border: '1px solid #0f2544', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '.78rem', padding: '2px 6px', background: 'rgba(37,99,235,.15)', color: '#60a5fa', borderRadius: 4 }}>{r.uh}</span>
          <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '.85rem' }}>{r.nome}</span>
          {r.confidencial && <span style={{ background: 'rgba(239,68,68,.12)', color: '#ef4444', borderRadius: 6, padding: '1px 6px', fontSize: '.62rem', fontWeight: 700 }}>CONF</span>}
        </div>
        {r.obs && <p style={{ fontSize: '.7rem', color: '#334d6e', marginTop: 4, lineHeight: 1.5 }}>{r.obs.slice(0, 180)}{r.obs.length > 180 ? '...' : ''}</p>}
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#10b981', fontSize: '.9rem' }}>
          R$ {Number(r.diaria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '.68rem', color: '#1e4080', marginTop: 2 }}>{r.tarifa || '—'}</div>
        {r.horaPartida && r.horaPartida !== '30/12/1899 12:00:00' && (
          <div style={{ fontSize: '.68rem', color: '#f59e0b', marginTop: 2 }}>⏰ {r.horaPartida}</div>
        )}
      </div>
    </div>
  );
}

function Section({ title, color, rows, total }) {
  return (
    <div style={{ background: '#071020', border: `1px solid ${color}22`, borderRadius: 12, marginBottom: 14, overflow: 'hidden' }}>
      <div style={{ padding: '13px 18px', borderBottom: `1px solid ${color}22`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: `${color}08` }}>
        <h3 style={{ fontWeight: 700, fontSize: '.9rem', color: '#c7d9f5' }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {rows.length > 0 && <span style={{ fontFamily: 'monospace', color: '#10b981', fontWeight: 700, fontSize: '.82rem' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
          <span style={{ background: `${color}22`, color, borderRadius: 10, padding: '2px 10px', fontSize: '.7rem', fontWeight: 700 }}>{rows.length}</span>
        </div>
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.length === 0
          ? <div style={{ textAlign: 'center', padding: 24, color: '#1e3a5f', fontSize: '.82rem' }}>Nenhuma saída prevista</div>
          : rows.map((r, i) => <Card key={i} r={r} />)}
      </div>
    </div>
  );
}

export default function SaidasView({ rows, refDate, nextDate }) {
  const hoje   = useMemo(() => rows.filter(r => r.isCheckoutToday),    [rows]);
  const amanha = useMemo(() => rows.filter(r => r.isCheckoutTomorrow), [rows]);

  const totalHoje   = hoje.reduce((s, r) => s + r.diaria, 0);
  const totalAmanha = amanha.reduce((s, r) => s + r.diaria, 0);

  const labelHoje   = refDate  ? `🔴 Saídas ${fmtDate(refDate)}`  : '🔴 Saídas do Dia';
  const labelAmanha = nextDate ? `🟡 Saídas ${fmtDate(nextDate)}` : '🟡 Saídas Amanhã';

  return (
    <div>
      <Section title={labelHoje}   color="#ef4444" rows={hoje}   total={totalHoje} />
      <Section title={labelAmanha} color="#f59e0b" rows={amanha} total={totalAmanha} />
    </div>
  );
}
