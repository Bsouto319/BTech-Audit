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
 *   31-08 TRF 1250 / 01-09 TRF 1500 / 02-09 TRF 1605,09    → data avulsa (dia único, sem "DE...A")
 */
function parseTRFEntries(obs) {
  if (!obs) return [];
  const upper = obs.toUpperCase();

  // Regex principal: TRF + opcional R$ + número (suporta 4+ dígitos como 2209, 2509)
  const re = /TRF\s*(?:R\$\s*)?(\d+(?:\.\d{3})*(?:,\d{1,2})?)/gi;
  const matches = [];
  let m;
  while ((m = re.exec(upper)) !== null) {
    matches.push({ index: m.index, end: m.index + m[0].length, rawVal: m[1] });
  }
  if (matches.length === 0) return [];

  // Data range: aceita "DE DD A DD/MM", "DE DD/MM A DD/MM" e "DE DD/MM-DD/MM"
  // (hífen como separador é tão comum no PMS quanto a palavra "A"). Pode vir
  // antes ("DE 24/08-25/08 TRF 1.250,00") ou depois ("TRF 2209,00 DE 15 A 16/06")
  // do valor, dependendo de como o PMS exportou.
  const dateRe = /DE\s+(\d{1,2})(?:\/(\d{1,2}))?\s*(?:A|-)\s*(\d{1,2})\/(\d{1,2})/gi;
  const dateMatches = [];
  let dm;
  while ((dm = dateRe.exec(upper)) !== null) {
    const toMonth = parseInt(dm[4]);
    const fromDay = parseInt(dm[1]);
    const toDay = parseInt(dm[3]);
    let fromMonth;
    if (dm[2]) {
      fromMonth = parseInt(dm[2]);
    } else if (fromDay > toDay) {
      // "DE 31 A 01/09" (sem mês no "de") e dia final menor que o dia inicial
      // = virada de mês -- o "31" é do mês ANTERIOR ao "01/09" (31/08), nunca
      // do mesmo mês (não existe "31 de setembro"). Sem essa correção o range
      // ficava invertido (from > to) e nunca batia com nenhuma data real,
      // fazendo o sistema cair no fallback errado (sempre a 1ª tarifa da lista).
      fromMonth = toMonth === 1 ? 12 : toMonth - 1;
    } else {
      fromMonth = toMonth;
    }
    dateMatches.push({
      index: dm.index,
      end: dm.index + dm[0].length,
      kind: 'range',
      dateFrom: { day: fromDay, month: fromMonth },
      dateTo: { day: toDay, month: toMonth },
    });
  }

  // Data avulsa, sem a palavra "DE" (um dia só, não uma faixa):
  // "31-08 TRF 1250 / 01-09 TRF 1500 / 02-09 TRF 1605,09" — cada TRF vale
  // só pra noite daquela data exata. Ignora qualquer trecho já capturado
  // como range acima (senão o "16/06" de "DE 15 A 16/06" seria contado de
  // novo aqui como se fosse uma data avulsa separada).
  const singleDateRe = /\b(\d{1,2})[/-](\d{1,2})\b/g;
  let sdm;
  while ((sdm = singleDateRe.exec(upper)) !== null) {
    const insideRange = dateMatches.some(r => sdm.index >= r.index && sdm.index < r.end);
    if (insideRange) continue;
    dateMatches.push({
      index: sdm.index,
      end: sdm.index + sdm[0].length,
      kind: 'single',
      day: { day: parseInt(sdm[1]), month: parseInt(sdm[2]) },
    });
  }
  dateMatches.sort((a, b) => a.index - b.index);

  // Associa cada data ao TRF mais próximo (antes OU depois), nunca reaproveitando
  // a mesma data pra dois TRFs -- é isso que evita a "tarifa vizinha" ser
  // roubada quando há múltiplas diárias diferentes na mesma observação.
  const dateForTRF = new Array(matches.length).fill(null);
  const usedDates = new Set();
  for (let i = 0; i < matches.length; i++) {
    let best = null, bestDist = Infinity;
    for (let j = 0; j < dateMatches.length; j++) {
      if (usedDates.has(j)) continue;
      const d = dateMatches[j];
      let dist = Infinity;
      if (d.index >= matches[i].end) {
        // data depois do TRF -- só vale se não houver outro TRF no meio
        const nextTRF = matches[i + 1];
        if (!nextTRF || d.index < nextTRF.index) dist = d.index - matches[i].end;
      } else if (d.end <= matches[i].index) {
        // data antes do TRF -- só vale se não houver outro TRF no meio
        const prevTRF = matches[i - 1];
        if (!prevTRF || d.end > prevTRF.end) dist = matches[i].index - d.end;
      }
      if (dist < bestDist) { bestDist = dist; best = j; }
    }
    if (best !== null) {
      dateForTRF[i] = dateMatches[best];
      usedDates.add(best);
    }
  }

  const labelRe = /[\s+%]*([+]?\s*\d+%\s*)?(SGL|DBL|TPL|SINGLE|DOUBLE|TRIPLE|SUITE(?:\s+(?:SGL|DBL|TPL|SINGLE|DOUBLE|TRIPLE))?)/i;

  const entries = [];
  for (let i = 0; i < matches.length; i++) {
    const value = parseBRNum(matches[i].rawVal);
    if (value < 10) continue;

    // Label de tipo de quarto: SGL, DBL, TPL, SINGLE, DOUBLE, TRIPLE, SUITE
    // (procurado só depois do valor, até o próximo TRF -- padrão de escrita comum)
    const spanEnd = i === matches.length - 1 ? upper.length : matches[i + 1].index;
    const afterText = upper.slice(matches[i].end, spanEnd);
    let label = null;
    const lm = afterText.match(labelRe);
    if (lm) {
      label = lm[2].trim().toUpperCase();
      if (label === 'SINGLE') label = 'SGL';
      if (label === 'DOUBLE') label = 'DBL';
      if (label === 'TRIPLE') label = 'TPL';
      if (label.startsWith('SUITE')) label = 'SUITE';
    }

    const assigned = dateForTRF[i];
    let dateFrom = null, dateTo = null, singleDay = false;
    if (assigned) {
      if (assigned.kind === 'single') {
        dateFrom = assigned.day;
        dateTo = assigned.day;
        singleDay = true;
      } else {
        dateFrom = assigned.dateFrom;
        dateTo = assigned.dateTo;
      }
    }
    entries.push({ value, label, dateFrom, dateTo, singleDay });
  }
  return entries;
}

// Retorna número de adultos a partir do campo "Adt | C1 | C2" ou similar
function parseAdultCount(adultos) {
  if (!adultos) return null;
  const first = adultos.split(/[|,;]/)[0];
  const n = parseInt(first?.trim());
  return isNaN(n) ? null : n;
}

// Mapa de contagem de adultos para label de tarifa
function occupancyLabel(adultCount) {
  if (adultCount >= 3) return 'TPL';
  if (adultCount === 2) return 'DBL';
  return 'SGL';
}

// Determina o label esperado usando tipoUH (mais confiável) com fallback em adultos
function expectedOccupancyLabel(adultos, tipoUH) {
  const uh = (tipoUH || '').toUpperCase();
  if (/\bSGL\b|\bSINGLE\b/.test(uh)) return 'SGL';
  if (/\bDBL\b|\bDOUBLE\b|\bTWIN\b/.test(uh)) return 'DBL';
  if (/\bTPL\b|\bTRIPLE\b/.test(uh)) return 'TPL';
  if (/\bSTE\b|\bSUITE\b/.test(uh)) return 'DBL';
  const count = parseAdultCount(adultos);
  if (count === null) return null;
  return occupancyLabel(count);
}

/**
 * extractTRF — versão inteligente
 * @param {string} obs - campo OBSERVACOES
 * @param {string} refDate - data de referência 'YYYY-MM-DD' (data do relatório)
 * @param {string} adultos - campo "Adt | C1 | C2"
 * @param {string} tipoUH - tipo do quarto (SGL, DBL, TPL, SUITE…)
 * @returns {number|null}
 */
export function extractTRF(obs, refDate = null, adultos = null, tipoUH = null) {
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
        // Data avulsa ("31-08 TRF 1250") vale só pra noite exata daquele dia —
        // diferente do range, que é [from, to) exclusivo no fim.
        if (e.singleDay) return refMD === fromMD;
        // Range é [from, to) — diária de "15 a 16/06" vale no check-in do dia 15
        return refMD >= fromMD && refMD < toMD;
      });
      if (applicable.length > 0) pool = applicable;
    }
  }

  // ── 2. Filtra por tipo de quarto ──────────────────────────────────────────
  const oLabel = expectedOccupancyLabel(adultos, tipoUH);

  const labeled = pool.filter(e => e.label !== null);
  if (labeled.length > 0) {
    if (oLabel === null) {
      // Sem informação de ocupação e há múltiplas tarifas — não pode determinar qual usar
      if (labeled.length > 1) return null;
      return labeled[0].value;
    }
    // Tenta match exato
    const exact = labeled.find(e => {
      if (oLabel === 'SGL') return e.label === 'SGL' || e.label === 'SINGLE';
      if (oLabel === 'DBL') return e.label === 'DBL' || e.label === 'DOUBLE' || e.label === 'SUITE';
      if (oLabel === 'TPL') return e.label === 'TPL' || e.label === 'TRIPLE';
      return false;
    });
    if (exact) return exact.value;
    // Sem match exato e há mais de uma opção — retorna null (não quer mostrar divergência errada)
    if (labeled.length > 1) return null;
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

function addDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function subtractDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// Extrai data de auditoria do nome do arquivo VHF (ex: "Reservas-15-06-26.csv" → 2026-06-15)
function parseDateFromFilename(name) {
  const m = (name || '').match(/(\d{2})[-_\.](\d{2})[-_\.](\d{2,4})/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = `20${y}`;
  const dd = parseInt(d), mm = parseInt(mo), yy = parseInt(y);
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12 || yy < 2020 || yy > 2050) return null;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

// Mantido por compatibilidade; use processRows(rows, fileName) sempre que possível
export function getReportRefDate(rows) {
  const partidas = rows
    .filter(r => r.status === 'Checkin')
    .map(r => parseBRDate(r.partida || ''))
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  const minPartida = partidas[0];
  return minPartida ? subtractDay(minPartida) : new Date().toISOString().split('T')[0];
}

// ─── PROCESSAMENTO PRINCIPAL ──────────────────────────────────────────────────

export function processRows(normalizedRows, fileName = '') {
  const checkins = normalizedRows.filter(r => r.status === 'Checkin');

  // ── Determina auditDate (noite sendo auditada) ────────────────────────────
  // 1ª prioridade: data no nome do arquivo (mais confiável — VHF sempre inclui)
  let auditDate = parseDateFromFilename(fileName);

  if (!auditDate) {
    // 2ª: max(chegada) — último hóspede a chegar = provavelmente chegou hoje
    const chegadas = checkins
      .map(r => parseBRDate(r.chegada || ''))
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
    const maxChegada = chegadas[chegadas.length - 1] || null;

    // 3ª: dia anterior à menor partida
    const partidas = checkins
      .map(r => parseBRDate(r.partida || ''))
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort();
    const minPartidaMinus1 = partidas[0] ? subtractDay(partidas[0]) : null;

    // Usa o mais recente entre os dois sinais (robusto quando um está errado)
    if (maxChegada && minPartidaMinus1) {
      auditDate = maxChegada > minPartidaMinus1 ? maxChegada : minPartidaMinus1;
    } else {
      auditDate = maxChegada || minPartidaMinus1 || new Date().toISOString().split('T')[0];
    }
  }

  // refDate = dia seguinte à auditoria = data dos checkouts "hoje cedo"
  // nextDate = dia depois dos checkouts "amanhã"
  const refDate  = addDay(auditDate);
  const nextDate = addDay(refDate);

  const rows = normalizedRows
    .filter(r => r.status === 'Checkin')
    .map(r => {
      const diaria  = parseBRNum(r.diaria);
      const partida = parseBRDate(r.partida);
      const chegada = parseBRDate(r.chegada);
      // auditDate (não refDate) para selecionar TRF da noite correta
      // tipoUH é mais confiável que adultos para SGL/DBL/TPL quando há múltiplas tarifas
      const trf     = extractTRF(r.obs, auditDate, r.adultos, r.tipoUH);
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

  return { rows, checkouts, refDate, nextDate, auditDate };
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
