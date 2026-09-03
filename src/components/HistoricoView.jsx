import { useState, useEffect, useMemo } from 'react';
import { fetchHistory } from '../lib/history';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getPeriodDates(period) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const pad = n => String(n).padStart(2, '0');

  switch (period) {
    case 'month': {
      const y = now.getFullYear(), m = now.getMonth() + 1;
      return [`${y}-${pad(m)}-01`, today];
    }
    case 'lastmonth': {
      const d = new Date(now.getFullYear(), now.getMonth(), 0);
      const y = d.getFullYear(), m = d.getMonth() + 1;
      return [`${y}-${pad(m)}-01`, d.toISOString().split('T')[0]];
    }
    case '3months': {
      const d = new Date(now); d.setMonth(d.getMonth() - 3);
      return [d.toISOString().split('T')[0], today];
    }
    case '6months': {
      const d = new Date(now); d.setMonth(d.getMonth() - 6);
      return [d.toISOString().split('T')[0], today];
    }
    case 'year':
      return [`${now.getFullYear()}-01-01`, today];
    default:
      return [null, null];
  }
}

function fmtBRL(n) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatNome(nome) {
  if (!nome) return '—';
  const parts = nome.split(';');
  const str = parts.length === 2 ? `${parts[1].trim()} ${parts[0].trim()}` : nome;
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const CAT_COLORS = {
  B2B:          '#4b9eff',
  OTA:          '#a78bfa',
  DIRETO:       '#26d07c',
  GRUPO:        '#e8a838',
  CORTESIA:     '#64748b',
  CONFIDENCIAL: '#f05252',
  CREWS:        '#06b6d4',
  OUTROS:       '#475569',
};

// ─── MINI CHART ───────────────────────────────────────────────────────────────

function MiniLineChart({ data, valueKey = 'adr', color = 'var(--accent)' }) {
  if (!data || data.length < 2) return (
    <div style={{ height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: '.7rem' }}>
      Poucos dados para traçar tendência
    </div>
  );
  const W = 400, H = 70, PAD = 6;
  const vals = data.map(d => Number(d[valueKey]));
  const minV = Math.min(...vals), maxV = Math.max(...vals);
  const range = maxV - minV || 1;
  const toX = i => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = v => H - PAD - ((v - minV) / range) * (H - PAD * 2);
  const pts = data.map((d, i) => `${toX(i)},${toY(Number(d[valueKey]))}`).join(' ');
  const area = `${PAD},${H - PAD} ${pts} ${W - PAD},${H - PAD}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 70 }}>
      <defs>
        <linearGradient id="adrGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".18"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#adrGrad)"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* First and last labels */}
      <text x={PAD} y={H - 1} fontSize="7" fill="var(--text3)">{fmtDate(data[0].date)}</text>
      <text x={W - PAD} y={H - 1} fontSize="7" fill="var(--text3)" textAnchor="end">{fmtDate(data[data.length - 1].date)}</text>
    </svg>
  );
}

// ─── BAR ROW ──────────────────────────────────────────────────────────────────

function BarRow({ rank, label, value, total, sub, color = 'var(--accent)' }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
      <span style={{
        fontSize: '.58rem', color: 'var(--text3)', fontFamily: 'var(--mono)',
        width: 16, textAlign: 'right', flexShrink: 0,
      }}>{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{
            fontSize: '.72rem', color: 'var(--text)', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: '65%',
          }} title={label}>{label}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
            {sub && <span style={{ fontSize: '.58rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{sub}</span>}
            <span style={{ fontSize: '.65rem', color, fontFamily: 'var(--mono)', fontWeight: 600 }}>
              R$ {value >= 1000
                ? `${(value / 1000).toFixed(1)}k`
                : fmtBRL(value)}
            </span>
          </div>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 2 }}>
          <div style={{
            height: '100%', width: `${pct}%`, background: color, borderRadius: 2,
            transition: 'width .5s ease',
          }}/>
        </div>
      </div>
    </div>
  );
}

// ─── KPI CARD ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'var(--text)' }) {
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 9, padding: '14px 16px',
    }}>
      <div style={{ fontSize: '.6rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '1.45rem', fontWeight: 700, color, fontFamily: 'var(--mono)', lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '.65rem', color: 'var(--text3)', marginTop: 4, fontFamily: 'var(--mono)' }}>{sub}</div>}
    </div>
  );
}

// ─── SECTION ─────────────────────────────────────────────────────────────────

function Card({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg2)',
        fontSize: '.72rem', fontWeight: 700, color: 'var(--text)',
        fontFamily: 'var(--display)',
      }}>{title}</div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const PERIODS = [
  { id: 'month',     label: 'Este mês' },
  { id: 'lastmonth', label: 'Mês passado' },
  { id: '3months',   label: '3 meses' },
  { id: '6months',   label: '6 meses' },
  { id: 'year',      label: 'Este ano' },
  { id: 'custom',    label: 'Personalizado' },
];

export default function HistoricoView() {
  const [period,      setPeriod]      = useState('3months');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');
  const [rows,        setRows]        = useState([]);
  const [runs,        setRuns]        = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  const [startDate, endDate] = period === 'custom'
    ? [customStart, customEnd]
    : getPeriodDates(period);

  useEffect(() => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    fetchHistory(startDate, endDate)
      .then(({ rows: r, runs: ru }) => { setRows(r); setRuns(ru); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  const stats = useMemo(() => {
    if (!rows.length) return null;

    const totalReceita  = rows.reduce((s, r) => s + Number(r.diaria), 0);
    const adr           = totalReceita / rows.length;
    const uniqueNomes   = new Set(rows.filter(r => r.nome).map(r => r.nome)).size;
    const divergencias  = rows.filter(r => r.has_divergencia).length;
    const totalDivVal   = rows.reduce((s, r) => s + Math.abs(Number(r.diff_value || 0)), 0);

    // Top spenders
    const spenderMap = {};
    for (const r of rows) {
      if (!r.nome) continue;
      spenderMap[r.nome] ??= { nome: r.nome, total: 0, noites: 0 };
      spenderMap[r.nome].total  += Number(r.diaria);
      spenderMap[r.nome].noites += 1;
    }
    const topSpenders = Object.values(spenderMap).sort((a, b) => b.total - a.total).slice(0, 10);
    const maxSpend = topSpenders[0]?.total || 1;

    // Top frequent
    const freqMap = {};
    for (const r of rows) {
      if (!r.nome) continue;
      freqMap[r.nome] ??= { nome: r.nome, dates: new Set(), total: 0 };
      freqMap[r.nome].dates.add(r.ref_date);
      freqMap[r.nome].total += Number(r.diaria);
    }
    const topFrequent = Object.values(freqMap)
      .map(f => ({ nome: f.nome, visitas: f.dates.size, total: f.total }))
      .sort((a, b) => b.visitas - a.visitas || b.total - a.total)
      .slice(0, 10);
    const maxVisitas = topFrequent[0]?.visitas || 1;

    // By category
    const catMap = {};
    for (const r of rows) {
      const c = r.categoria || 'OUTROS';
      catMap[c] ??= { cat: c, receita: 0, count: 0 };
      catMap[c].receita += Number(r.diaria);
      catMap[c].count   += 1;
    }
    const byCat = Object.values(catMap).sort((a, b) => b.receita - a.receita);
    const maxCatRec = byCat[0]?.receita || 1;

    // Top companies
    const compMap = {};
    for (const r of rows) {
      const k = (r.razao_social || '').trim().slice(0, 50);
      if (!k) continue;
      compMap[k] ??= { name: k, receita: 0, noites: 0 };
      compMap[k].receita += Number(r.diaria);
      compMap[k].noites  += 1;
    }
    const topCompanies = Object.values(compMap).sort((a, b) => b.receita - a.receita).slice(0, 8);
    const maxCompRec = topCompanies[0]?.receita || 1;

    // ADR by date
    const dateMap = {};
    for (const r of rows) {
      dateMap[r.ref_date] ??= { date: r.ref_date, receita: 0, count: 0 };
      dateMap[r.ref_date].receita += Number(r.diaria);
      dateMap[r.ref_date].count   += 1;
    }
    const byDate = Object.values(dateMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({ ...d, adr: d.receita / d.count }));

    return {
      totalReceita, adr, uniqueNomes, divergencias, totalDivVal,
      totalNoites: rows.length,
      topSpenders, maxSpend,
      topFrequent, maxVisitas,
      byCat, maxCatRec,
      topCompanies, maxCompRec,
      byDate,
    };
  }, [rows]);

  const inpStyle = {
    padding: '5px 10px', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 6, color: 'var(--text)', fontFamily: 'inherit', fontSize: '.75rem',
    outline: 'none',
  };

  return (
    <div style={{ animation: 'fadeUp .2s ease' }}>

      {/* Period selector */}
      <div style={{
        display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 18,
        alignItems: 'center',
      }}>
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)} style={{
            padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontFamily: 'inherit', fontWeight: 500, fontSize: '.73rem',
            background: period === p.id ? 'var(--accent)' : 'var(--bg3)',
            color: period === p.id ? 'var(--bg)' : 'var(--text3)',
            border: `1px solid ${period === p.id ? 'var(--accent)' : 'var(--border)'}`,
            transition: 'all .15s',
          }}>{p.label}</button>
        ))}
        {period === 'custom' && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 4 }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={inpStyle}/>
            <span style={{ color: 'var(--text3)', fontSize: '.7rem' }}>até</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={inpStyle}/>
          </div>
        )}
        {startDate && endDate && (
          <span style={{ marginLeft: 'auto', fontSize: '.63rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {fmtDate(startDate)} → {fmtDate(endDate)} · {runs.length} relatórios
          </span>
        )}
      </div>

      {/* Loading / Error / Empty */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)', fontSize: '.8rem' }}>
          Carregando histórico...
        </div>
      )}
      {error && (
        <div style={{
          background: 'rgba(240,82,82,.07)', border: '1px solid rgba(240,82,82,.2)',
          borderRadius: 8, padding: '12px 16px', color: 'var(--red)', fontSize: '.8rem', marginBottom: 14,
        }}>
          Erro ao carregar: {error}
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div style={{
          background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
          padding: 48, textAlign: 'center', color: 'var(--text3)', fontSize: '.8rem',
        }}>
          <div style={{ marginBottom: 12, opacity: .3 }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="14" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 18h12M18 12v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 6 }}>Sem dados neste período</p>
          <p style={{ fontSize: '.72rem' }}>Carregue relatórios VHF e use o botão "Salvar no histórico" para acumular dados.</p>
        </div>
      )}

      {!loading && stats && (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 14 }}>
            <KpiCard label="Noites auditadas"  value={stats.totalNoites.toLocaleString('pt-BR')} />
            <KpiCard label="Receita total"     value={`R$ ${stats.totalReceita >= 100000 ? (stats.totalReceita/1000).toFixed(0)+'k' : (stats.totalReceita/1000).toFixed(1)+'k'}`} color="var(--green)" />
            <KpiCard label="ADR médio"         value={`R$ ${stats.adr.toFixed(0)}`} sub="diária média" />
            <KpiCard label="Hóspedes únicos"   value={stats.uniqueNomes.toLocaleString('pt-BR')} />
            <KpiCard label="Divergências"      value={stats.divergencias} sub={`R$ ${(stats.totalDivVal/1000).toFixed(1)}k em risco`} color={stats.divergencias > 0 ? 'var(--red)' : 'var(--green)'} />
          </div>

          {/* Row 1: Top Spenders + Top Frequentes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <Card title={`Top Gastadores (${startDate ? fmtDate(startDate) : ''} → ${endDate ? fmtDate(endDate) : ''})`}>
              {stats.topSpenders.length === 0
                ? <p style={{ color: 'var(--text3)', fontSize: '.75rem' }}>Sem dados</p>
                : stats.topSpenders.map((s, i) => (
                  <BarRow
                    key={i} rank={i + 1}
                    label={formatNome(s.nome)}
                    value={s.total}
                    total={stats.maxSpend}
                    sub={`${s.noites}n`}
                    color="var(--accent)"
                  />
                ))}
            </Card>

            <Card title="Hóspedes Mais Frequentes">
              {stats.topFrequent.length === 0
                ? <p style={{ color: 'var(--text3)', fontSize: '.75rem' }}>Sem dados</p>
                : stats.topFrequent.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
                    <span style={{ fontSize: '.58rem', color: 'var(--text3)', fontFamily: 'var(--mono)', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: '.72rem', color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '62%' }} title={formatNome(f.nome)}>
                          {formatNome(f.nome)}
                        </span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: '.65rem', color: 'var(--blue)', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                            {f.visitas}x
                          </span>
                          <span style={{ fontSize: '.6rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
                            R${(f.total/1000).toFixed(1)}k
                          </span>
                        </div>
                      </div>
                      <div style={{ height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${(f.visitas / stats.maxVisitas) * 100}%`, background: 'var(--blue)', borderRadius: 2 }}/>
                      </div>
                    </div>
                  </div>
                ))}
            </Card>
          </div>

          {/* Row 2: Receita por Categoria + Tendência ADR */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <Card title="Receita por Categoria">
              {stats.byCat.map((c, i) => (
                <div key={i} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: 2, background: CAT_COLORS[c.cat] || '#475569', flexShrink: 0 }}/>
                      <span style={{ fontSize: '.72rem', color: 'var(--text)', fontWeight: 500 }}>{c.cat}</span>
                      <span style={{ fontSize: '.6rem', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{c.count}n</span>
                    </div>
                    <span style={{ fontSize: '.65rem', color: CAT_COLORS[c.cat] || 'var(--text3)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                      R$ {c.receita >= 1000 ? `${(c.receita/1000).toFixed(1)}k` : fmtBRL(c.receita)}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,.05)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${(c.receita / stats.maxCatRec) * 100}%`, background: CAT_COLORS[c.cat] || '#475569', borderRadius: 2 }}/>
                  </div>
                </div>
              ))}
            </Card>

            <Card title="Tendência de ADR">
              <MiniLineChart data={stats.byDate} valueKey="adr" color="var(--accent)" />
              {stats.byDate.length > 1 && (() => {
                const first = stats.byDate[0].adr;
                const last  = stats.byDate[stats.byDate.length - 1].adr;
                const delta = ((last - first) / first) * 100;
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                    <div>
                      <div style={{ fontSize: '.6rem', color: 'var(--text3)' }}>ADR inicial</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '.82rem', color: 'var(--text)' }}>R$ {first.toFixed(0)}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '.6rem', color: 'var(--text3)' }}>Variação</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '.82rem', color: delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '.6rem', color: 'var(--text3)' }}>ADR atual</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '.82rem', color: 'var(--text)' }}>R$ {last.toFixed(0)}</div>
                    </div>
                  </div>
                );
              })()}
              {/* Ocupação média */}
              {stats.byDate.length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '.6rem', color: 'var(--text3)', marginBottom: 6 }}>Ocupação por noite</div>
                  <div style={{ display: 'flex', gap: 2, height: 28, alignItems: 'flex-end' }}>
                    {stats.byDate.map((d, i) => {
                      const maxOcup = Math.max(...stats.byDate.map(x => x.count));
                      const h = (d.count / maxOcup) * 100;
                      return (
                        <div key={i} title={`${fmtDate(d.date)}: ${d.count} UHs`} style={{
                          flex: 1, minWidth: 0, height: `${h}%`, background: 'rgba(75,158,255,.5)',
                          borderRadius: '1px 1px 0 0', cursor: 'default',
                        }}/>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Row 3: Top Empresas */}
          {stats.topCompanies.length > 0 && (
            <Card title="Top Empresas / Razão Social">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                {stats.topCompanies.map((c, i) => (
                  <BarRow
                    key={i} rank={i + 1}
                    label={c.name}
                    value={c.receita}
                    total={stats.maxCompRec}
                    sub={`${c.noites}n`}
                    color="var(--purple)"
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Runs table */}
          {runs.length > 0 && (
            <Card title={`Relatórios Importados (${runs.length})`}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {runs.map((r, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 8px', background: 'var(--bg)', borderRadius: 6, fontSize: '.7rem',
                  }}>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{fmtDate(r.ref_date)}</span>
                    <span style={{ color: 'var(--text3)', flex: 1, marginLeft: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.file_name}</span>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--text3)', flexShrink: 0 }}>{r.total_rows} UHs</span>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--green)', flexShrink: 0, marginLeft: 12 }}>
                      R$ {Number(r.total_receita).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
