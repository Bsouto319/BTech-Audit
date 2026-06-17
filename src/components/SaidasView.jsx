import { useMemo, useState } from 'react';

// ─── CLASSIFICAÇÃO DE AÇÃO PÓS-AUDITORIA ─────────────────────────────────────

function classifyAcao(row) {
  const obs    = (row.obs         || '').toUpperCase();
  const razao  = (row.razaoSocial || '').toUpperCase();
  const origem = (row.origem      || '').toUpperCase();
  const faturar = obs.includes('FATURAR');

  const isBooking   = razao.includes('BOOKING');
  const guestPays   = obs.includes('A PAGAR PELO CLIENTE') || obs.includes('PAGTO NO VOUCHER: A PAGAR');

  const isPortal =
    razao.includes('TRAVELSCAPE') || obs.includes('TRAVELSCAPE') ||
    obs.includes('BEE2PAY') ||
    razao.includes('E HTL') || obs.includes('E-HTL') || obs.includes('EHTL') ||
    razao.includes('DECOLAR') || obs.includes('DECOLAR') ||
    obs.includes('VIRTUAL CARD WILL BE ACTIVATED') ||
    (isBooking && !guestPays);

  const isDireto =
    guestPays ||
    origem.includes('MELIA.COM') ||
    origem.includes('CALL CENTER') ||
    row.categoria === 'DIRETO' ||
    (isBooking && guestPays);

  if (isPortal) return 'PORTAL';
  if (row.confidencial && faturar) return 'CONF_FATURAR';
  if (faturar) return 'FATURAR';
  if (isDireto) return 'SEM_ACAO';
  return 'VERIFICAR';
}

function getPortalName(row) {
  const obs  = (row.obs         || '').toUpperCase();
  const razao = (row.razaoSocial || '').toUpperCase();
  if (razao.includes('TRAVELSCAPE') || obs.includes('TRAVELSCAPE')) return 'Expedia / TravelScape';
  if (obs.includes('BEE2PAY'))   return 'Bee2Pay';
  if (razao.includes('E HTL') || obs.includes('EHTL') || obs.includes('E-HTL')) return 'e-HTL';
  if (razao.includes('DECOLAR') || obs.includes('DECOLAR')) return 'Decolar';
  if (razao.includes('BOOKING')) return 'Booking.com';
  return 'Portal OTA';
}

function getBillingTarget(row) {
  const obs = row.obs || '';
  const m = obs.match(/CNPJ\s+([\d.\/\-]+)/i);
  if (m) return m[1].trim();
  return (row.razaoSocial || '').split(' ').slice(0, 4).join(' ') || '—';
}

function fmtDate(iso) {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

function fmtHora(h) {
  if (!h || h.startsWith('30/12/1899')) return null;
  const t = h.split(' ')[1];
  return t ? t.slice(0, 5) : null;
}

// ─── CARD DE UH ──────────────────────────────────────────────────────────────

function UHCard({ row, acao }) {
  const hora = fmtHora(row.horaPartida);
  const sub = acao === 'PORTAL'
    ? getPortalName(row)
    : acao === 'FATURAR' || acao === 'CONF_FATURAR'
    ? getBillingTarget(row)
    : row.tarifa || row.segmento || '';

  const obsSnippet = (() => {
    const o = row.obs || '';
    // Pega a parte mais relevante da obs (começa após "NO POST" se existir)
    const idx = o.toUpperCase().indexOf('FATURAR');
    const start = idx > 0 ? Math.max(0, idx) : 0;
    const snippet = o.slice(start, start + 140);
    return snippet.trim() + (o.length > start + 140 ? '…' : '');
  })();

  return (
    <div style={{
      background: 'var(--bg)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 13px',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      transition: 'border-color .15s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* UH Badge */}
      <div style={{
        flexShrink: 0, textAlign: 'center',
        padding: '5px 10px', borderRadius: 6,
        background: 'rgba(75,158,255,.12)',
        border: '1px solid rgba(75,158,255,.25)',
        minWidth: 48,
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontWeight: 700,
          color: 'var(--blue)', fontSize: '.82rem', letterSpacing: '.5px',
        }}>{row.uh}</div>
        {hora && (
          <div style={{ fontSize: '.6rem', color: 'var(--accent)', marginTop: 2, fontFamily: 'var(--mono)' }}>
            {hora}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontWeight: 600, fontSize: '.8rem', color: 'var(--text)' }}>
            {row.nome}
          </span>
          {row.confidencial && (
            <span style={{
              background: 'rgba(240,82,82,.12)', color: 'var(--red)',
              borderRadius: 3, padding: '1px 5px', fontSize: '.55rem',
              fontFamily: 'var(--mono)', fontWeight: 700,
            }}>CONF</span>
          )}
        </div>
        {sub && (
          <div style={{ fontSize: '.67rem', color: 'var(--text2)', marginBottom: 2, fontWeight: 500 }}>
            {sub}
          </div>
        )}
        {obsSnippet && (
          <div style={{ fontSize: '.64rem', color: 'var(--text3)', lineHeight: 1.45 }}>
            {obsSnippet}
          </div>
        )}
      </div>

      {/* Diária */}
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        <div style={{
          fontFamily: 'var(--mono)', fontWeight: 700,
          color: 'var(--green)', fontSize: '.85rem',
        }}>
          {Number(row.diaria).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '.6rem', color: 'var(--text3)', marginTop: 1 }}>
          {row.tipoUH?.split('/')[0]?.trim() || ''}
        </div>
      </div>
    </div>
  );
}

// ─── SEÇÃO DE AÇÃO ────────────────────────────────────────────────────────────

const ACAO_CONFIG = {
  FATURAR: {
    label: 'Imprimir + Faturar',
    desc:  'Emitir NF e enviar à empresa',
    icon:  '🖨️',
    accent: '#4b9eff',
    bg:    'rgba(75,158,255,.07)',
    border:'rgba(75,158,255,.25)',
  },
  PORTAL: {
    label: 'Cobrar via Portal',
    desc:  'Acessar portal da OTA/intermediária e lançar cobrança',
    icon:  '💳',
    accent: '#a78bfa',
    bg:    'rgba(167,139,250,.07)',
    border:'rgba(167,139,250,.25)',
  },
  CONF_FATURAR: {
    label: 'Confidencial — Faturar',
    desc:  'Faturar após rodar a auditoria (reserva sigilosa)',
    icon:  '🔴',
    accent: '#f05252',
    bg:    'rgba(240,82,82,.06)',
    border:'rgba(240,82,82,.25)',
  },
  SEM_ACAO: {
    label: 'Sem Ação',
    desc:  'Booking.com guest-pay, Melia.com direto, pagamento no balcão',
    icon:  '✓',
    accent: '#64748b',
    bg:    'rgba(100,116,139,.05)',
    border:'rgba(100,116,139,.18)',
  },
  VERIFICAR: {
    label: 'Verificar',
    desc:  'Tipo de pagamento não identificado — conferir no sistema',
    icon:  '⚠',
    accent: '#e8a838',
    bg:    'rgba(232,168,56,.06)',
    border:'rgba(232,168,56,.25)',
  },
};

function AcaoSection({ acao, rows }) {
  const cfg = ACAO_CONFIG[acao];
  const total = rows.reduce((s, r) => s + r.diaria, 0);

  function copyUHs() {
    const txt = rows.map(r => `UH ${r.uh} — ${r.nome}`).join('\n');
    navigator.clipboard?.writeText(txt);
  }

  return (
    <div style={{
      border: `1px solid ${cfg.border}`,
      borderRadius: 10,
      marginBottom: 10,
      overflow: 'hidden',
      background: cfg.bg,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 15px',
        borderBottom: `1px solid ${cfg.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: `${cfg.bg}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '.85rem' }}>{cfg.icon}</span>
          <div>
            <span style={{ fontWeight: 700, fontSize: '.8rem', color: cfg.accent, fontFamily: 'var(--display)' }}>
              {cfg.label}
            </span>
            <span style={{ fontSize: '.65rem', color: 'var(--text3)', marginLeft: 8 }}>
              {cfg.desc}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {rows.length > 0 && (
            <>
              <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)', fontWeight: 600, fontSize: '.75rem' }}>
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              {(acao === 'FATURAR' || acao === 'CONF_FATURAR') && (
                <button onClick={copyUHs} style={{
                  padding: '3px 9px', borderRadius: 5, border: `1px solid ${cfg.border}`,
                  background: 'transparent', color: cfg.accent, cursor: 'pointer',
                  fontSize: '.6rem', fontFamily: 'inherit', fontWeight: 600,
                }}>
                  Copiar UHs
                </button>
              )}
            </>
          )}
          <span style={{
            background: `${cfg.accent}22`, color: cfg.accent,
            borderRadius: 20, padding: '1px 9px',
            fontSize: '.65rem', fontFamily: 'var(--mono)', fontWeight: 700,
          }}>
            {rows.length}
          </span>
        </div>
      </div>

      {/* Rows */}
      <div style={{ padding: rows.length > 0 ? '8px 10px' : 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {rows.length === 0 ? (
          <div style={{
            padding: '14px 16px', textAlign: 'center',
            color: 'var(--text3)', fontSize: '.72rem',
          }}>
            Nenhuma saída nesta categoria
          </div>
        ) : (
          rows.map((r, i) => <UHCard key={i} row={r} acao={acao} />)
        )}
      </div>
    </div>
  );
}

// ─── KPI BAR ─────────────────────────────────────────────────────────────────

function KpiBar({ classified, total }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 8, marginBottom: 14,
    }}>
      {[
        { key: 'FATURAR',      label: 'Faturar',       add: 'CONF_FATURAR' },
        { key: 'PORTAL',       label: 'Portal' },
        { key: 'SEM_ACAO',     label: 'Sem Ação' },
        { key: 'VERIFICAR',    label: 'Verificar' },
      ].map(({ key, label, add }) => {
        const cfg = ACAO_CONFIG[key];
        const count = (classified[key] || []).length + (add ? (classified[add] || []).length : 0);
        return (
          <div key={key} style={{
            background: cfg.bg, border: `1px solid ${cfg.border}`,
            borderRadius: 8, padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '.65rem', color: 'var(--text3)', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: cfg.accent, fontFamily: 'var(--mono)', lineHeight: 1 }}>
              {count}
            </div>
            <div style={{ fontSize: '.58rem', color: 'var(--text3)', marginTop: 2, fontFamily: 'var(--mono)' }}>
              de {total}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── VIEW PRINCIPAL ───────────────────────────────────────────────────────────

const ORDER = ['FATURAR', 'PORTAL', 'CONF_FATURAR', 'SEM_ACAO', 'VERIFICAR'];

export default function SaidasView({ rows, refDate, nextDate }) {
  const [dia, setDia] = useState('hoje');

  const selected = useMemo(
    () => rows.filter(r => dia === 'hoje' ? r.isCheckoutToday : r.isCheckoutTomorrow),
    [rows, dia]
  );

  const classified = useMemo(() => {
    const out = {};
    for (const acao of ORDER) out[acao] = [];
    for (const r of selected) {
      const acao = classifyAcao(r);
      if (!out[acao]) out[acao] = [];
      out[acao].push(r);
    }
    return out;
  }, [selected]);

  const hoje   = rows.filter(r => r.isCheckoutToday).length;
  const amanha = rows.filter(r => r.isCheckoutTomorrow).length;

  function fmtD(iso) {
    if (!iso) return '';
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  }

  return (
    <div style={{ animation: 'fadeUp .25s ease' }}>

      {/* Tabs Hoje / Amanhã */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 14,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 9, padding: 4, width: 'fit-content',
      }}>
        {[
          { key: 'hoje',   label: `Hoje ${refDate ? fmtD(refDate) : ''}`,   count: hoje },
          { key: 'amanha', label: `Amanhã ${nextDate ? fmtD(nextDate) : ''}`, count: amanha },
        ].map(({ key, label, count }) => (
          <button key={key} onClick={() => setDia(key)} style={{
            padding: '6px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
            background: dia === key ? 'var(--accent)' : 'transparent',
            color: dia === key ? 'var(--bg)' : 'var(--text3)',
            fontFamily: 'inherit', fontWeight: 600, fontSize: '.75rem',
            transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {label}
            <span style={{
              background: dia === key ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.08)',
              borderRadius: 10, padding: '1px 7px',
              fontSize: '.65rem', fontFamily: 'var(--mono)',
            }}>{count}</span>
          </button>
        ))}
      </div>

      {selected.length === 0 ? (
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 10, padding: 48, textAlign: 'center',
          color: 'var(--text3)', fontSize: '.82rem',
        }}>
          Nenhuma saída prevista
        </div>
      ) : (
        <>
          <KpiBar classified={classified} total={selected.length} />
          {ORDER.map(acao => (
            <AcaoSection key={acao} acao={acao} rows={classified[acao] || []} />
          ))}
        </>
      )}
    </div>
  );
}
