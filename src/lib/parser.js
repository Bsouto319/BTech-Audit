/**
 * BTech Audit — Parser VHF (Consulta Geral de Reservas)
 * Suporta: CSV com sep=; ou auto-detect, encoding CP1252/UTF-8, campos multiline
 */

export async function readFileAsText(file) {
  const buf = await file.arrayBuffer();
  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return utf8.startsWith('\uFEFF') ? utf8.slice(1) : utf8;
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

export function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let startIdx = 0;
  if (lines[0]?.toLowerCase().startsWith('sep=')) startIdx = 1;
  const headerLine = lines[startIdx] || '';
  const sep = (headerLine.split(';').length > headerLine.split(',').length) ? ';' : ',';
  const header = splitLine(headerLine, sep).map(h => normalizeKey(h));
  const rows = [];
  const statusIdx = header.findIndex(h => h.toLowerCase() === 'status');

  let i = startIdx + 1;
  while (i < lines.length) {
    let raw = lines[i];
    while (countQuotes(raw) % 2 !== 0 && i + 1 < lines.length) { i++; raw += '\n' + lines[i]; }
    const cells = splitLine(raw, sep);
    if (cells.length < 5) { i++; continue; }
    const statusCell = statusIdx >= 0 ? cells[statusIdx] : cells[0];
    const status = statusCell?.trim().replace(/^"|"$/g, '').trim();
    if (!['Checkin', 'Checkout', 'Reserva', 'No Show', 'Cancelada'].includes(status)) { i++; continue; }
    const row = {};
    header.forEach((h, idx) => { row[h] = (cells[idx] ?? '').trim().replace(/^"|"$/g, '').trim(); });
    rows.push(row);
    i++;
  }
  return rows;
}

function countQuotes(s) { return (s.match(/"/g) || []).length; }

function splitLine(line, sep) {
  const result = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === sep && !inQ) { result.push(cur); cur = ''; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
}

function normalizeKey(k) { return k.replace(/^\uFEFF/, '').trim(); }

export function parseBRNum(s) {
  if (s === undefined || s === null || s === '') return 0;
  const str = String(s).trim();
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(str)) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  if (/^\d+,\d{1,2}$/.test(str)) return parseFloat(str.replace(',', '.')) || 0;
  return parseFloat(str) || 0;
}

export function parseBRDate(s) {
  if (!s) return '';
  const p = s.trim().split('/');
  if (p.length === 3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
  return s;
}

export function extractTRF(obs) {
  if (!obs) return null;
  const patterns = [
    /\bTRF\s+([\d]{1,3}(?:\.\d{3})*(?:,\d{1,2})?)\b/gi,
    /\bTRF\s+(\d+,\d{1,2})\b/gi,
    /\bTRF\s+(\d+\.\d{1,2})\b/gi,
    /\bTRF\s+(\d{3,6})\b/gi,
  ];
  for (const pat of patterns) {
    const matches = [...obs.matchAll(pat)];
    for (const m of matches) { const val = parseBRNum(m[1]); if (val >= 10) return val; }
  }
  return null;
}

export function categorize(row) {
  const origem   = (row['Origem'] || '').toUpperCase();
  const segmento = (row['Segmento'] || '').toUpperCase();
  const tipo     = (row['Tipo h\xF3spede'] || row['Tipo hospede'] || '').toUpperCase();
  const obs      = (row['OBSERVACOES'] || '').toUpperCase();
  const conf     = (row['Confidencial'] || '').toUpperCase();
  const grupo    = (row['Grupo'] || '').trim();
  if (tipo === 'COURTESY' || segmento.includes('COMPLIMENTARY') || obs.includes('CORTESIA')) return 'CORTESIA';
  if (conf === 'S' || obs.includes('CONFIDENCIAL') || segmento.includes('CONFIDENTIAL')) return 'CONFIDENCIAL';
  if (segmento.includes('CREWS') || origem.includes('CREWS')) return 'CREWS';
  if (segmento.includes('GROUP') || segmento.includes('GROUPS') || grupo) return 'GRUPO';
  if (segmento.includes('OTA') || origem.includes('AGENCIA ON-LINE') || origem.includes('BOOKING') || origem.includes('EXPEDIA')) return 'OTA';
  if (origem.includes('MELIA.COM') || origem.includes('CALL CENTER') || segmento.includes('DIRECT CLIENT') || segmento.includes('DIRETO')) return 'DIRETO';
  if (segmento.includes('TTOO') || segmento.includes('TRAVEL AGENCY') || origem.includes('OPERADORA') || origem.includes('MICE')) return 'B2B';
  return 'OUTROS';
}

export function detectAlerts(row, cat, trfEsperado) {
  const alerts = [];
  const diaria = parseBRNum(row['Vlr. di\xE1ria'] || row['Vlr. diaria'] || 0);
  const obs    = (row['OBSERVACOES'] || '').toUpperCase();
  if (trfEsperado !== null) {
    const diff = Math.abs(diaria - trfEsperado);
    if (diff > 1) {
      const severity = diff >= 50 ? 'critical' : diff >= 20 ? 'high' : 'medium';
      alerts.push({ type: 'DIVERGENCIA_TARIFA', severity, diff, expected: trfEsperado, actual: diaria });
    }
  }
  if (obs.includes('SALDO NEGATIVO') || obs.includes('SALDO NEG')) alerts.push({ type: 'SALDO_NEGATIVO', severity: 'high' });
  if (obs.includes('LIMITE DE CREDITO') || obs.includes('LIMITE CREDITO')) alerts.push({ type: 'LIMITE_CREDITO', severity: 'high' });
  if (obs.includes('NAO PERTURBAR') || obs.includes('NÃO PERTURBAR') || obs.includes('DND')) alerts.push({ type: 'DND', severity: 'info' });
  if (cat === 'CONFIDENCIAL') alerts.push({ type: 'CONFIDENCIAL', severity: 'medium' });
  return alerts;
}

export function getReportRefDate(rawRows) {
  const partidas = rawRows.filter(r => r['Status'] === 'Checkin').map(r => parseBRDate(r['Partida'] || '')).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  return partidas[0] || new Date().toISOString().split('T')[0];
}

function addDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0];
}

export function processRows(rawRows) {
  const refDate  = getReportRefDate(rawRows);
  const nextDate = addDay(refDate);
  const rows = rawRows.filter(r => r['Status'] === 'Checkin').map(r => {
    const diaria  = parseBRNum(r['Vlr. di\xE1ria'] || r['Vlr. diaria'] || 0);
    const partida = parseBRDate(r['Partida'] || '');
    const chegada = parseBRDate(r['Chegada'] || '');
    const trf     = extractTRF(r['OBSERVACOES'] || '');
    const cat     = categorize(r);
    const alerts  = detectAlerts(r, cat, trf);
    return {
      uh: r['UH'] || '', nome: r['H\xF3spede'] || r['Hóspede'] || '',
      categoria: cat, tarifa: r['Tarifa'] || '', diaria, trf, chegada, partida,
      origem: r['Origem'] || '', segmento: r['Segmento'] || '', grupo: r['Grupo'] || '',
      confidencial: (r['Confidencial'] || '') === 'S', horaPartida: r['Hora partida'] || '',
      obs: r['OBSERVACOES'] || '', razaoSocial: r['Raz\xE3o social'] || r['Razao social'] || '',
      isCheckoutToday: partida === refDate, isCheckoutTomorrow: partida === nextDate,
      alerts, raw: r,
    };
  });
  const checkouts = rawRows.filter(r => r['Status'] === 'Checkout').map(r => ({
    uh: r['UH'] || '', nome: r['H\xF3spede'] || r['Hóspede'] || '',
    partida: parseBRDate(r['Partida'] || ''), diaria: parseBRNum(r['Vlr. di\xE1ria'] || r['Vlr. diaria'] || 0),
    tarifa: r['Tarifa'] || '', obs: r['OBSERVACOES'] || '',
  }));
  return { rows, checkouts, refDate, nextDate };
}

export function calcKPIs(rows, allRaw, totalUHs = null) {
  const inHouse = rows; const ocupacao = inHouse.length;
  const byCat = {}; let receita = 0;
  for (const r of inHouse) { byCat[r.categoria] = (byCat[r.categoria] || 0) + 1; receita += r.diaria; }
  const divergencias = inHouse.filter(r => r.trf !== null && Math.abs(r.diaria - r.trf) > 1);
  const saidasHoje   = inHouse.filter(r => r.isCheckoutToday);
  const saidasAmanha = inHouse.filter(r => r.isCheckoutTomorrow);
  const alertasCrit  = inHouse.flatMap(r => r.alerts).filter(a => a.severity === 'critical' || a.severity === 'high');
  const adr = ocupacao > 0 ? receita / ocupacao : 0;
  const taxaOcup = totalUHs ? (ocupacao / totalUHs) * 100 : null;
  return {
    ocupacao, receita, adr, taxaOcup, revpar: (totalUHs && taxaOcup) ? (receita / totalUHs) : null,
    divergencias: divergencias.length,
    divergenciaValor: divergencias.reduce((s, r) => s + Math.abs(r.diaria - r.trf), 0),
    saidasHoje: saidasHoje.length, saidasAmanha: saidasAmanha.length,
    alertasCriticos: alertasCrit.length, byCat,
    faturados: (byCat['B2B'] || 0) + (byCat['DIRETO'] || 0),
    grupos: byCat['GRUPO'] || 0, cortesias: byCat['CORTESIA'] || 0,
    online: byCat['OTA'] || 0, confidenciais: byCat['CONFIDENCIAL'] || 0, crews: byCat['CREWS'] || 0,
  };
}
