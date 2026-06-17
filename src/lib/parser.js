/**
 * BTech Audit — Parser Universal de Relatórios Hoteleiros
 * Suporta múltiplos formatos de PMS via detecção automática de schema
 */

// ─── SCHEMAS DE COLUNAS POR PMS ──────────────────────────────────────────────

const SCHEMAS = [
  {
    id: 'vhf-opera',
    name: 'VHF/Opera (Meliá Brasil)',
    detect: (headers) =>
      headers.some(h => /vlr\.?\s*di[aá]ria/i.test(h)) &&
      headers.some(h => /\buh\b/i.test(h)) &&
      headers.some(h => /observac[oõ]es/i.test(h)),
    statusValues: ['Checkin', 'Checkout', 'Reserva', 'No Show', 'Cancelada'],
    mapField: {
      hotel:        /^hotel$/i,
      status:       /^status$/i,
      tipoUH:       /tipo\s*uh/i,
      uh:           /^\s*uh\s*$/i,
      diaria:       /vlr\.?\s*di[aá]ria/i,
      hospede:      /h[oó]spede/i,
      chegada:      /^chegada$/i,
      partida:      /^partida$/i,
      reserva:      /no\.?\s*reserva$/i,
      razaoSocial:  /raz[aã]o\s*social/i,
      grupo:        /^grupo$/i,
      tarifa:       /^tarifa$/i,
      origem:       /^origem$/i,
      segmento:     /^segmento$/i,
      tipoHospede:  /tipo\s*h[oó]spede/i,
      confidencial: /^confidencial$/i,
      horaPartida:  /hora\s*partida/i,
      obs:          /observac[oõ]es/i,
      adultos:      /adt\s*[|]\s*c1/i,
    },
  },
  {
    id: 'totvs-hits',
    name: 'Totvs Hospitalidade (HITS)',
    detect: (headers) =>
      headers.some(h => /valor\s*di[aá]ria/i.test(h)) &&
      headers.some(h => /apto|quarto|uh/i.test(h)) &&
      headers.some(h => /observa[cç][aã]o|obs$/i.test(h)),
    statusValues: ['Check-in', 'Check-out', 'Reserva', 'No-Show', 'Cancelado'],
    mapField: {
      hotel:        /hotel|propriedade/i,
      status:       /^status$/i,
      tipoUH:       /tipo\s*(apto|quarto|uh)/i,
      uh:           /^(apto|quarto|uh)$/i,
      diaria:       /valor\s*di[aá]ria/i,
      hospede:      /h[oó]spede|nome\s*h[oó]spede/i,
      chegada:      /entrada|chegada/i,
      partida:      /saída|partida/i,
      reserva:      /n[uú]mero\s*reserva|reserva/i,
      razaoSocial:  /raz[aã]o\s*social|empresa/i,
      grupo:        /^grupo$/i,
      tarifa:       /plano|tarifa/i,
      origem:       /canal|origem/i,
      segmento:     /segmento/i,
      tipoHospede:  /tipo\s*h[oó]spede/i,
      confidencial: /confidencial/i,
      horaPartida:  /hora\s*(saída|partida)/i,
      obs:          /observa[cç][aã]o|obs/i,
      adultos:      /adulto|pax/i,
    },
  },
];

export function detectSchema(headers) {
  return SCHEMAS.find(s => s.detect(headers)) || SCHEMAS[0];
}

// Cria mapa de campo canônico → nome real da coluna no CSV
function buildColumnMap(headers, schema) {
  const map = {};
  for (const [field, pattern] of Object.entries(schema.mapField)) {
    map[field] = headers.find(h => pattern.test(h)) || null;
  }
  return map;
}

// Normaliza uma row bruta para campos canônicos
export function normalizeRow(rawRow, colMap) {
  const get = (field) => (colMap[field] ? (rawRow[colMap[field]] || '') : '');
  return {
    hotel:        get('hotel'),
    status:       get('status'),
    tipoUH:       get('tipoUH'),
    uh:           get('uh'),
    diaria:       get('diaria'),
    hospede:      get('hospede'),
    chegada:      get('chegada'),
    partida:      get('partida'),
    reserva:      get('reserva'),
    razaoSocial:  get('razaoSocial'),
    grupo:        get('grupo'),
    tarifa:       get('tarifa'),
    origem:       get('origem'),
    segmento:     get('segmento'),
    tipoHospede:  get('tipoHospede'),
    confidencial: get('confidencial'),
    horaPartida:  get('horaPartida'),
    obs:          get('obs'),
    adultos:      get('adultos'),
  };
}

// ─── LEITURA DE ARQUIVO ───────────────────────────────────────────────────────

export async function readFileAsText(file) {
  const buf = await file.arrayBuffer();
  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return utf8.startsWith('﻿') ? utf8.slice(1) : utf8;
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

export function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let startIdx = 0;
  if (lines[0]?.toLowerCase().startsWith('sep=')) startIdx = 1;
  const headerLine = lines[startIdx] || '';
  const sep = headerLine.split(';').length > headerLine.split(',').length ? ';' : ',';
  const rawHeaders = splitLine(headerLine, sep).map(h => normalizeKey(h));

  const schema = detectSchema(rawHeaders);
  const colMap = buildColumnMap(rawHeaders, schema);
  const statusValues = schema.statusValues;

  const rows = [];
  let i = startIdx + 1;
  while (i < lines.length) {
    let raw = lines[i];
    while (countQuotes(raw) % 2 !== 0 && i + 1 < lines.length) { i++; raw += '\n' + lines[i]; }
    const cells = splitLine(raw, sep);
    if (cells.length < 5) { i++; continue; }

    const rawRow = {};
    rawHeaders.forEach((h, idx) => { rawRow[h] = (cells[idx] ?? '').trim().replace(/^"|"$/g, '').trim(); });

    const statusCol = colMap['status'];
    const status = statusCol ? rawRow[statusCol] : cells[0]?.trim();
    if (!statusValues.includes(status)) { i++; continue; }

    rows.push(normalizeRow(rawRow, colMap));
    i++;
  }
  return { rows, schema };
}

function countQuotes(s) { return (s.match(/"/g) || []).length; }

function splitLine(line, sep) {
  const result = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (c === sep && !inQ) { result.push(cur); cur = ''; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
}

function normalizeKey(k) { return k.replace(/^﻿/, '').trim(); }

// ─── PARSERS DE VALORES ───────────────────────────────────────────────────────

export function parseBRNum(s) {
  if (s === undefined || s === null || s === '') return 0;
  const str = String(s).trim();
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(str)) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  if (/^\d+,\d{1,2}$/.test(str)) return parseFloat(str.replace(',', '.')) || 0;
  return parseFloat(str.replace(',', '.')) || 0;
}

export function parseBRDate(s) {
  if (!s) return '';
  const p = s.trim().split('/');
  if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
  return s;
}

// ─── EXTRAÇÃO DE TRF (TARIFA CONTRATADA) ─────────────────────────────────────

/**
 * Extrai todas as entradas TRF da string de observações.
 * Retorna array de { value, label, dateFrom, dateTo }
 *
 * Padrões suportados:
 *   TRF 619,00                         → valor simples
 *   TRF749                             → sem espaço
 *   TRF R$ 989,00 +5% SINGLE           → com R$ e tipo de quarto
 *   TRF 569,00+5% SGL                  → com % e SGL
 *   TRF 529+5% SGL // TRF 609+5% DBL  → múltiplos por tipo
 *   TRF 2066,42 DE 15 A 16/06         → com data range
 *   TRF 2209,00 DE 15 A 16/06 - TRF 2509,00 DE 16 A 17/06  → múltiplas datas
 */
function parseTRFEntries(obs) {
  if (!obs) return [];
  const upper = obs.toUpperCase();
  const entries = [];

  // Regex principal: TRF + opcional R$ + número
  const re = /TRF\s*(?:R\$\s*)?([\d]{1,3}(?:\.\d{3})*(?:[,]\d{1,2})?(?:\.\d{2})?)/gi;
  let m;
  while ((m = re.exec(upper)) !== null) {
    const rawVal = m[1];
    const value = parseBRNum(rawVal);
    if (value < 10) continue;

    // Texto após o número (até 100 chars) para extrair label e data
    const after = upper.slice(m.index + m[0].length, m.index + m[0].length + 100);

    // Label de tipo de quarto: SGL, DBL, TPL, SINGLE, DOUBLE, TRIPLE, SUITE
    let label = null;
    const labelRe = /[\s+%]*([+]?\s*\d+%\s*)?(SGL|DBL|TPL|SINGLE|DOUBLE|TRIPLE|SUITE(?:\s+(?:SGL|DBL|TPL|SINGLE|DOUBLE|TRIPLE))?)/i;
    const lm = after.match(labelRe);
    if (lm) {
      label = lm[2].trim().toUpperCase();
      // Normaliza variantes
      if (label === 'SINGLE') label = 'SGL';
      if (label === 'DOUBLE') label = 'DBL';
      if (label === 'TRIPLE') label = 'TPL';
      if (label.startsWith('SUITE')) label = 'SUITE';
    }

    // Data range: DE DD A DD/MM ou DE DD/MM A DD/MM
    let dateFrom = null, dateTo = null;
    const dateRe = /DE\s+(\d{1,2})(?:\/(\d{1,2}))?\s+A\s+(\d{1,2})\/(\d{1,2})/i;
    const dm = after.match(dateRe);
    if (dm) {
      const toMonth = parseInt(dm[4]);
      const fromMonth = dm[2] ? parseInt(dm[2]) : toMonth;
      dateFrom = { day: parseInt(dm[1]), month: fromMonth };
      dateTo   = { day: parseInt(dm[3]), month: toMonth };
    }

    entries.push({ value, label, dateFrom, dateTo });
  }
  return entries;
}

// Retorna número de adultos a partir do campo "Adt | C1 | C2" ou similar
function parseAdultCount(adultos) {
  if (!adultos) return 1;
  const first = adultos.split(/[|,;]/)[0];
  return parseInt(first?.trim()) || 1;
}

// Mapa de contagem de adultos para label de tarifa
function occupancyLabel(adultCount) {
  if (adultCount >= 3) return 'TPL';
  if (adultCount === 2) return 'DBL';
  return 'SGL';
}

/**
 * extractTRF — versão inteligente
 * @param {string} obs - campo OBSERVACOES
 * @param {string} refDate - data de referência 'YYYY-MM-DD' (data do relatório)
 * @param {string} adultos - campo "Adt | C1 | C2"
 * @returns {number|null}
 */
export function extractTRF(obs, refDate = null, adultos = null) {
  const entries = parseTRFEntries(obs);
  if (entries.length === 0) return null;

  // ── 1. Filtra por data de referência ──────────────────────────────────────
  let pool = entries;
  if (refDate) {
    const [year, monthStr, dayStr] = refDate.split('-');
    const refMonth = parseInt(monthStr);
    const refDay   = parseInt(dayStr);
    const refMD    = refMonth * 100 + refDay;

    const dated = entries.filter(e => e.dateFrom !== null);
    if (dated.length > 0) {
      const applicable = dated.filter(e => {
        const fromMD = e.dateFrom.month * 100 + e.dateFrom.day;
        const toMD   = e.dateTo.month   * 100 + e.dateTo.day;
        // Range é [from, to) — diária de "15 a 16/06" vale no check-in do dia 15
        return refMD >= fromMD && refMD < toMD;
      });
      if (applicable.length > 0) pool = applicable;
    }
  }

  // ── 2. Filtra por tipo de quarto ──────────────────────────────────────────
  const adultCount = parseAdultCount(adultos);
  const oLabel     = occupancyLabel(adultCount);

  const labeled = pool.filter(e => e.label !== null);
  if (labeled.length > 0) {
    // Tenta match exato
    const exact = labeled.find(e => {
      if (oLabel === 'SGL') return e.label === 'SGL' || e.label === 'SINGLE';
      if (oLabel === 'DBL') return e.label === 'DBL' || e.label === 'DOUBLE' || e.label === 'SUITE';
      if (oLabel === 'TPL') return e.label === 'TPL' || e.label === 'TRIPLE';
      return false;
    });
    if (exact) return exact.value;
    // Fallback: primeiro com label
    return labeled[0].value;
  }

  // ── 3. Retorna primeiro do pool ───────────────────────────────────────────
  return pool[0]?.value ?? null;
}

// ─── CATEGORIZAÇÃO ────────────────────────────────────────────────────────────

export function categorize(row) {
  const origem   = (row.origem   || '').toUpperCase();
  const segmento = (row.segmento || '').toUpperCase();
  const tipo     = (row.tipoHospede || '').toUpperCase();
  const obs      = (row.obs      || '').toUpperCase();
  const grupo    = (row.grupo    || '').trim();

  // FATURAR na obs = cobrança real → nunca é cortesia, independente do tipo/segmento
  const faturar = obs.includes('FATURAR');

  // ── CORTESIA ────────────────────────────────────────────────────────────────
  // Só marca como CORTESIA quando é explicitamente DIÁRIAS cortesia.
  // "CORTESIA DE EXTRAS" ≠ cortesia de room — room pode ter diária real.
  // "TARIFA CONFIDENCIAL" ≠ cortesia.
  const isCortesiaRoom =
    tipo === 'COURTESY' ||
    segmento.includes('COMPLIMENTARY') ||
    /CORTESIA\s+DE\s+DI[AÁ]RIAS|DI[AÁ]RIAS\s+CORTESIA|CORTESIA\s+DI[AÁ]RIA\b/i.test(obs);

  if (!faturar && isCortesiaRoom) return 'CORTESIA';

  // ── CONFIDENCIAL ─────────────────────────────────────────────────────────────
  // APENAS o campo Confidencial='S' determina hóspede confidencial.
  // "TARIFA CONFIDENCIAL" na obs = tipo de contrato — NÃO é hóspede confidencial.
  if ((row.confidencial || '').toUpperCase() === 'S') return 'CONFIDENCIAL';

  // ── CREWS ────────────────────────────────────────────────────────────────────
  if (segmento.includes('CREWS') || origem.includes('CREWS')) return 'CREWS';

  // ── GRUPO ────────────────────────────────────────────────────────────────────
  if (segmento.includes('GROUP') || segmento.includes('GROUPS') || grupo) return 'GRUPO';

  // ── OTA ──────────────────────────────────────────────────────────────────────
  if (
    segmento.includes('OTA') ||
    origem.includes('AGENCIA ON-LINE') ||
    origem.includes('BOOKING') ||
    origem.includes('EXPEDIA')
  ) return 'OTA';

  // ── DIRETO ───────────────────────────────────────────────────────────────────
  if (
    origem.includes('MELIA.COM') ||
    origem.includes('CALL CENTER') ||
    segmento.includes('DIRECT CLIENT') ||
    segmento.includes('DIRETO') ||
    segmento.includes('MELIAREWARDS')
  ) return 'DIRETO';

  // ── B2B ──────────────────────────────────────────────────────────────────────
  if (
    segmento.includes('TTOO') ||
    segmento.includes('TRAVEL AGENCY') ||
    segmento.includes('BT NEGOTIATED') ||
    segmento.includes('BT DYNAMIC') ||
    segmento.includes('NLRA') ||
    origem.includes('OPERADORA') ||
    origem.includes('MICE') ||
    origem.includes('AGENCIA DE VIAGEM') ||
    origem.includes('AGÊNCIA DE VIAGEM')
  ) return 'B2B';

  return 'OUTROS';
}

// ─── ALERTAS ─────────────────────────────────────────────────────────────────

export function detectAlerts(row, cat, trfEsperado) {
  const alerts = [];
  const diaria = parseBRNum(row.diaria);
  const obs    = (row.obs || '').toUpperCase();

  if (trfEsperado !== null) {
    const diff = Math.abs(diaria - trfEsperado);
    if (diff > 1) {
      const severity = diff >= 50 ? 'critical' : diff >= 20 ? 'high' : 'medium';
      alerts.push({ type: 'DIVERGENCIA_TARIFA', severity, diff, expected: trfEsperado, actual: diaria });
    }
  }
  if (obs.includes('SALDO NEGATIVO') || obs.includes('SALDO NEG'))
    alerts.push({ type: 'SALDO_NEGATIVO', severity: 'high' });
  if (obs.includes('LIMITE DE CREDITO') || obs.includes('LIMITE CREDITO'))
    alerts.push({ type: 'LIMITE_CREDITO', severity: 'high' });
  if (obs.includes('NAO PERTURBAR') || obs.includes('NÃO PERTURBAR') || obs.includes('DND'))
    alerts.push({ type: 'DND', severity: 'info' });
  if (cat === 'CONFIDENCIAL')
    alerts.push({ type: 'CONFIDENCIAL', severity: 'medium' });
  return alerts;
}

// ─── DATA REPORT ─────────────────────────────────────────────────────────────

export function getReportRefDate(rows) {
  const partidas = rows
    .filter(r => r.status === 'Checkin')
    .map(r => parseBRDate(r.partida || ''))
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  return partidas[0] || new Date().toISOString().split('T')[0];
}

function addDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// ─── PROCESSAMENTO PRINCIPAL ──────────────────────────────────────────────────

export function processRows(normalizedRows) {
  const refDate  = getReportRefDate(normalizedRows);
  const nextDate = addDay(refDate);

  const rows = normalizedRows
    .filter(r => r.status === 'Checkin')
    .map(r => {
      const diaria  = parseBRNum(r.diaria);
      const partida = parseBRDate(r.partida);
      const chegada = parseBRDate(r.chegada);
      // Passa refDate e adultos para seleção correta de TRF por data e tipo de quarto
      const trf     = extractTRF(r.obs, refDate, r.adultos);
      const cat     = categorize(r);
      const alerts  = detectAlerts(r, cat, trf);
      return {
        uh: r.uh, nome: r.hospede,
        categoria: cat, tarifa: r.tarifa, diaria, trf, chegada, partida,
        tipoUH: r.tipoUH, adultos: r.adultos,
        origem: r.origem, segmento: r.segmento, grupo: r.grupo,
        confidencial: r.confidencial === 'S', horaPartida: r.horaPartida,
        obs: r.obs, razaoSocial: r.razaoSocial,
        isCheckoutToday: partida === refDate,
        isCheckoutTomorrow: partida === nextDate,
        alerts, raw: r,
      };
    });

  const checkouts = normalizedRows
    .filter(r => r.status === 'Checkout')
    .map(r => ({
      uh: r.uh, nome: r.hospede,
      partida: parseBRDate(r.partida), diaria: parseBRNum(r.diaria),
      tarifa: r.tarifa, obs: r.obs,
    }));

  return { rows, checkouts, refDate, nextDate };
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export function calcKPIs(rows, allRaw, totalUHs = null) {
  const ocupacao = rows.length;
  const byCat = {}; let receita = 0;
  for (const r of rows) { byCat[r.categoria] = (byCat[r.categoria] || 0) + 1; receita += r.diaria; }
  const divergencias  = rows.filter(r => r.trf !== null && Math.abs(r.diaria - r.trf) > 1);
  const saidasHoje    = rows.filter(r => r.isCheckoutToday);
  const saidasAmanha  = rows.filter(r => r.isCheckoutTomorrow);
  const alertasCrit   = rows.flatMap(r => r.alerts).filter(a => a.severity === 'critical' || a.severity === 'high');
  const adr = ocupacao > 0 ? receita / ocupacao : 0;
  const taxaOcup = totalUHs ? (ocupacao / totalUHs) * 100 : null;
  return {
    ocupacao, receita, adr, taxaOcup,
    revpar: totalUHs && taxaOcup ? receita / totalUHs : null,
    divergencias: divergencias.length,
    divergenciaValor: divergencias.reduce((s, r) => s + Math.abs(r.diaria - r.trf), 0),
    saidasHoje: saidasHoje.length, saidasAmanha: saidasAmanha.length,
    alertasCriticos: alertasCrit.length, byCat,
    faturados: (byCat['B2B'] || 0) + (byCat['DIRETO'] || 0),
    grupos: byCat['GRUPO'] || 0, cortesias: byCat['CORTESIA'] || 0,
    online: byCat['OTA'] || 0, confidenciais: byCat['CONFIDENCIAL'] || 0, crews: byCat['CREWS'] || 0,
  };
}
