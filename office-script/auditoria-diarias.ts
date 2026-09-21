// ============================================================================
// BTech Audit — Auditoria de Diárias (Office Script)
// ============================================================================
// Plataforma PRÓPRIA (Bruno + Filipe), independente do Meliá — não usa nenhum
// código, dado ou artefato do A.R.I (automação interna do Meliá). O único
// ponto compartilhado é o ESTILO de escrita de observação de PMS hoteleiro em
// geral (abreviação SGL/DBL/TPL pra tipo de quarto é praticamente universal
// no setor) — não é algo proprietário de nenhum hotel específico.
//
// Cada hotel pode escrever a observação de um jeito diferente (ex: usar
// "DIARIA 450 SGL" em vez de "TRF 450 SGL"). Por isso o parsing é dirigido
// por SCHEMA (ver array SCHEMAS abaixo, mesmo padrão do parser.js do BTech
// Audit): pra suportar um hotel novo com convenção diferente, basta adicionar
// um novo Schema (mapeamento de coluna + `tariffKeyword`) — nunca precisa
// reescrever a lógica de extração de tarifa, data ou severidade.
//
// Como usar:
// 1. Abra a planilha exportada do PMS (relatório de reservas, salva em .xlsx)
//    no Excel Online.
// 2. Aba "Automatizar" > Novo Script > cole este arquivo inteiro.
// 3. No Power Automate, ação "Executar script" (Excel Online Business),
//    apontando pra esse arquivo, passando o nome do arquivo disparador em
//    "fileName" (Conteúdo dinâmico do gatilho "Quando um arquivo é criado").
// 4. A aba "Auditoria" é criada/recriada na mesma planilha com o resultado.
// ============================================================================

interface ColumnMap { [field: string]: string | null }

interface Schema {
  id: string
  name: string
  detect: (headers: string[]) => boolean
  statusValues: string[]
  mapField: { [field: string]: RegExp }
  // Palavra-chave de tarifa na observação (ex: "TRF" no Meliá/VHF). Cada hotel
  // pode escrever diferente ("DIARIA", "TARIFA", "RATE"...) — trocar aqui, ou
  // adicionar um novo Schema inteiro, nunca precisa mexer na lógica de parsing.
  tariffKeyword: string
}

interface NormalizedRow {
  hotel: string; status: string; tipoUH: string; uh: string; diaria: string
  hospede: string; chegada: string; partida: string; reserva: string
  razaoSocial: string; grupo: string; tarifa: string; origem: string
  segmento: string; tipoHospede: string; confidencial: string
  horaPartida: string; obs: string; adultos: string
}

interface TRFEntry {
  value: number
  label: string | null
  dateFrom: { day: number; month: number } | null
  dateTo: { day: number; month: number } | null
  singleDay: boolean
}

interface Alert { type: string; severity: string; diff?: number; expected?: number; actual?: number }

interface ResultRow {
  uh: string; nome: string; categoria: string; tarifa: string
  diaria: number; trf: number | null; chegada: string; partida: string
  tipoUH: string; obs: string; reserva: string
  diferenca: number | null; severidade: string
}

// ─── SCHEMAS DE COLUNAS POR PMS (mesmo do parser.js) ───────────────────────

const SCHEMAS: Schema[] = [
  {
    id: 'vhf-opera',
    name: 'VHF/Opera (Meliá Brasil)',
    detect: (headers) =>
      headers.some(h => /vlr\.?\s*di[aá]ria/i.test(h)) &&
      headers.some(h => /\buh\b/i.test(h)) &&
      headers.some(h => /observac[oõ]es/i.test(h)),
    statusValues: ['Checkin', 'Checkout', 'Reserva', 'No Show', 'Cancelada'],
    mapField: {
      hotel: /^hotel$/i,
      status: /^status$/i,
      tipoUH: /tipo\s*uh/i,
      uh: /^\s*uh\s*$/i,
      diaria: /vlr\.?\s*di[aá]ria/i,
      hospede: /h[oó]spede/i,
      chegada: /^chegada$/i,
      partida: /^partida$/i,
      reserva: /no\.?\s*reserva$/i,
      razaoSocial: /raz[aã]o\s*social/i,
      grupo: /^grupo$/i,
      tarifa: /^tarifa$/i,
      origem: /^origem$/i,
      segmento: /^segmento$/i,
      tipoHospede: /tipo\s*h[oó]spede/i,
      confidencial: /^confidencial$/i,
      horaPartida: /hora\s*partida/i,
      obs: /observac[oõ]es/i,
      adultos: /adt\s*[|]\s*c1/i,
    },
    tariffKeyword: 'TRF',
  },
  // Exemplo de como adicionar outro hotel/PMS no futuro, sem tocar na lógica
  // de parsing — só copiar este bloco, ajustar os regex de coluna e a palavra
  // de tarifa observada na prática daquele hotel, e a IA de matching de data,
  // rótulo (SGL/DBL/TPL/SUITE) e severidade continua igual:
  //
  // {
  //   id: 'outro-hotel',
  //   name: 'Nome do outro hotel/PMS',
  //   detect: (headers) => headers.some(h => /.../i.test(h)),
  //   statusValues: ['Checkin', 'Checkout', ...],
  //   mapField: { ... mesmos campos, regex de coluna própria ... },
  //   tariffKeyword: 'DIARIA', // ou "TARIFA", "RATE" etc — o que aquele hotel escreve na observação
  // },
]

function detectSchema(headers: string[]): Schema {
  return SCHEMAS.find(s => s.detect(headers)) || SCHEMAS[0]
}

function buildColumnMap(headers: string[], schema: Schema): ColumnMap {
  const map: ColumnMap = {}
  for (const field of Object.keys(schema.mapField)) {
    const pattern = schema.mapField[field]
    map[field] = headers.find(h => pattern.test(h)) || null
  }
  return map
}

function normalizeRow(rawRow: { [key: string]: string }, colMap: ColumnMap): NormalizedRow {
  const get = (field: string): string => {
    const col = colMap[field]
    return col ? (rawRow[col] || '') : ''
  }
  return {
    hotel: get('hotel'), status: get('status'), tipoUH: get('tipoUH'), uh: get('uh'),
    diaria: get('diaria'), hospede: get('hospede'), chegada: get('chegada'), partida: get('partida'),
    reserva: get('reserva'), razaoSocial: get('razaoSocial'), grupo: get('grupo'), tarifa: get('tarifa'),
    origem: get('origem'), segmento: get('segmento'), tipoHospede: get('tipoHospede'),
    confidencial: get('confidencial'), horaPartida: get('horaPartida'), obs: get('obs'), adultos: get('adultos'),
  }
}

function normalizeKey(k: string): string { return k.replace(/^﻿/, '').trim() }

// ─── PARSERS DE VALORES (mesmo do parser.js) ───────────────────────────────

function parseBRNum(s: string | number | null | undefined): number {
  if (s === undefined || s === null || s === '') return 0
  const str = String(s).trim()
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(str)) return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
  if (/^\d+,\d{1,2}$/.test(str)) return parseFloat(str.replace(',', '.')) || 0
  return parseFloat(str.replace(',', '.')) || 0
}

function parseBRDate(s: string): string {
  if (!s) return ''
  const p = s.trim().split('/')
  if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`
  return s
}

// ─── EXTRAÇÃO DE TRF — idêntico ao parser.js (mesmas correções SGL/DBL/JED) ─

function parseTRFEntries(obs: string, tariffKeyword: string): TRFEntry[] {
  if (!obs) return []
  const upper = obs.toUpperCase()

  const re = new RegExp('\\b' + tariffKeyword.toUpperCase() + '\\s*(?:R\\$\\s*)?(\\d+(?:\\.\\d{3})*(?:,\\d{1,2})?)', 'gi')
  const matches: { index: number; end: number; rawVal: string }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(upper)) !== null) {
    matches.push({ index: m.index, end: m.index + m[0].length, rawVal: m[1] })
  }
  if (matches.length === 0) return []

  const dateRe = /DE\s+(\d{1,2})(?:[/.](\d{1,2}))?\s*(?:A|-)\s*(\d{1,2})[/.](\d{1,2})/gi
  type DateMatch = { index: number; end: number; kind: 'range' | 'single'; dateFrom?: { day: number; month: number }; dateTo?: { day: number; month: number }; day?: { day: number; month: number } }
  const dateMatches: DateMatch[] = []
  let dm: RegExpExecArray | null
  while ((dm = dateRe.exec(upper)) !== null) {
    const toMonth = parseInt(dm[4])
    const fromDay = parseInt(dm[1])
    const toDay = parseInt(dm[3])
    let fromMonth: number
    if (dm[2]) {
      fromMonth = parseInt(dm[2])
    } else if (fromDay > toDay) {
      fromMonth = toMonth === 1 ? 12 : toMonth - 1
    } else {
      fromMonth = toMonth
    }
    dateMatches.push({
      index: dm.index, end: dm.index + dm[0].length, kind: 'range',
      dateFrom: { day: fromDay, month: fromMonth }, dateTo: { day: toDay, month: toMonth },
    })
  }

  const singleDateRe = /\b(\d{1,2})[/.-](\d{1,2})\b/g
  let sdm: RegExpExecArray | null
  while ((sdm = singleDateRe.exec(upper)) !== null) {
    const insideRange = dateMatches.some(r => sdm!.index >= r.index && sdm!.index < r.end)
    if (insideRange) continue
    dateMatches.push({
      index: sdm.index, end: sdm.index + sdm[0].length, kind: 'single',
      day: { day: parseInt(sdm[1]), month: parseInt(sdm[2]) },
    })
  }
  dateMatches.sort((a, b) => a.index - b.index)

  const MAX_DATE_DISTANCE = 20
  const dateForTRF: (DateMatch | null)[] = new Array(matches.length).fill(null)
  const usedDates = new Set<number>()
  for (let i = 0; i < matches.length; i++) {
    let best: number | null = null, bestDist = Infinity
    for (let j = 0; j < dateMatches.length; j++) {
      if (usedDates.has(j)) continue
      const d = dateMatches[j]
      let dist = Infinity
      if (d.index >= matches[i].end) {
        const nextTRF = matches[i + 1]
        if (!nextTRF || d.index < nextTRF.index) dist = d.index - matches[i].end
      } else if (d.end <= matches[i].index) {
        const prevTRF = matches[i - 1]
        if (!prevTRF || d.end > prevTRF.end) dist = matches[i].index - d.end
      }
      if (dist < bestDist) { bestDist = dist; best = j }
    }
    if (best !== null && bestDist <= MAX_DATE_DISTANCE) {
      dateForTRF[i] = dateMatches[best]
      usedDates.add(best)
    }
  }

  // Achado real 20/09 (UH 1903 e outras 21): observação escreve "DUPLO" em vez
  // de "DBL"/"DOUBLE" (o VHF mistura inglês e português no mesmo texto -- ex:
  // "TRF 559,00 SINGLE // TRF 619,00 DUPLO"). Sem reconhecer "DUPLO"/"TRIPLO",
  // só o candidato em inglês tinha rótulo, e o sistema devolvia ele mesmo pra
  // quem estava no quarto duplo -- daí a diária certa (619) sempre "divergia"
  // contra o valor do single (559).
  const labelRe = /[\s+%]*([+]?\s*\d+%\s*)?(SGL|DBL|TPL|SINGLE|DOUBLE|TRIPLE|DUPLO|TRIPLO|SUITE(?:\s+(?:SGL|DBL|TPL|SINGLE|DOUBLE|TRIPLE|DUPLO|TRIPLO))?)/i

  const entries: TRFEntry[] = []
  for (let i = 0; i < matches.length; i++) {
    const value = parseBRNum(matches[i].rawVal)
    // Descarta valores implausíveis como diária -- achado real (UH 1019, 09/09):
    // observação "TRF 40756462000158" onde alguém colou um CNPJ/telefone logo
    // depois de "TRF" sem separador. Sem esse teto, o regex captura o número
    // inteiro e gera uma "divergência crítica" de trilhões de reais.
    if (value < 10 || value > 50000) continue

    const spanEnd = i === matches.length - 1 ? upper.length : matches[i + 1].index
    const afterText = upper.slice(matches[i].end, spanEnd)
    let label: string | null = null
    const lm = afterText.match(labelRe)
    if (lm) {
      label = lm[2].trim().toUpperCase()
      if (label === 'SINGLE') label = 'SGL'
      if (label === 'DOUBLE' || label === 'DUPLO') label = 'DBL'
      if (label === 'TRIPLE' || label === 'TRIPLO') label = 'TPL'
      if (label.startsWith('SUITE')) label = 'SUITE'
    }

    const assigned = dateForTRF[i]
    let dateFrom: { day: number; month: number } | null = null
    let dateTo: { day: number; month: number } | null = null
    let singleDay = false
    if (assigned) {
      if (assigned.kind === 'single') {
        dateFrom = assigned.day!
        dateTo = assigned.day!
        singleDay = true
      } else {
        dateFrom = assigned.dateFrom!
        dateTo = assigned.dateTo!
      }
    }
    entries.push({ value, label, dateFrom, dateTo, singleDay })
  }
  return entries
}

function parseAdultCount(adultos: string): number | null {
  if (!adultos) return null
  const first = adultos.split(/[|,;]/)[0]
  const n = parseInt(first?.trim())
  return isNaN(n) ? null : n
}

function occupancyLabel(adultCount: number): string {
  if (adultCount >= 3) return 'TPL'
  if (adultCount === 2) return 'DBL'
  return 'SGL'
}

function expectedOccupancyLabel(adultos: string, tipoUH: string): string | null {
  const uh = (tipoUH || '').toUpperCase()
  if (/\bSGL\b|\bSINGLE\b/.test(uh)) return 'SGL'
  if (/\bDBL\b|\bDOUBLE\b|\bTWIN\b/.test(uh)) return 'DBL'
  if (/\bTPL\b|\bTRIPLE\b/.test(uh)) return 'TPL'
  if (/\bSTE\b|\bSUITE\b/.test(uh)) return 'DBL'
  const count = parseAdultCount(adultos)
  if (count === null) return null
  return occupancyLabel(count)
}

// Quando não há SGL/DBL/data pra desambiguar múltiplas tarifas na mesma
// observação (ex: "TRF 995,65 // TRF 993,65 (COMISSIONADA)"), prefere o
// candidato que bate com o valor realmente lançado em vez de chutar o
// primeiro da lista -- nunca esconde uma divergência real (se nenhum
// candidato bater, cai no comportamento antigo de não reportar nada).
function pickByActualValue(candidates: TRFEntry[], diariaLancada: number | null): number | null {
  if (diariaLancada === null || diariaLancada === undefined) return null
  const match = candidates.find(e => Math.abs(e.value - diariaLancada) <= 1)
  return match ? match.value : null
}

function extractTRF(obs: string, refDate: string | null, adultos: string, tipoUH: string, tariffKeyword: string, diariaLancada: number | null = null): number | null {
  const entries = parseTRFEntries(obs, tariffKeyword)
  if (entries.length === 0) return null

  if (tipoUH) {
    const uhCode = (tipoUH.split(/[\s/]+/)[0] || '').toUpperCase().trim()
    if (uhCode && !/^(SGL|DBL|TPL|STE|SUITE)$/.test(uhCode)) {
      const codeRe = new RegExp('\\b' + tariffKeyword.toUpperCase() + '\\s*(?:R\\$\\s*)?(\\d+(?:\\.\\d{3})*(?:,\\d{1,2})?).{0,20}?\\b' + uhCode + '\\b', 'i')
      const codeMatch = obs.toUpperCase().match(codeRe)
      if (codeMatch) {
        const codeValue = parseBRNum(codeMatch[1])
        if (codeValue >= 10) return codeValue
      }
    }
  }

  let pool = entries
  if (refDate) {
    const parts = refDate.split('-')
    const refMonth = parseInt(parts[1])
    const refDay = parseInt(parts[2])
    const refMD = refMonth * 100 + refDay

    const dated = entries.filter(e => e.dateFrom !== null)
    if (dated.length > 0) {
      const applicable = dated.filter(e => {
        const fromMD = e.dateFrom!.month * 100 + e.dateFrom!.day
        const toMD = e.dateTo!.month * 100 + e.dateTo!.day
        if (e.singleDay) return refMD === fromMD
        return refMD >= fromMD && refMD < toMD
      })
      if (applicable.length > 0) pool = applicable
    }
  }

  const oLabel = expectedOccupancyLabel(adultos, tipoUH)
  const labeled = pool.filter(e => e.label !== null)
  if (labeled.length > 0) {
    if (oLabel === null) {
      if (labeled.length > 1) return null
      return labeled[0].value
    }
    const exact = labeled.find(e => {
      if (oLabel === 'SGL') return e.label === 'SGL' || e.label === 'SINGLE'
      if (oLabel === 'DBL') return e.label === 'DBL' || e.label === 'DOUBLE' || e.label === 'SUITE'
      if (oLabel === 'TPL') return e.label === 'TPL' || e.label === 'TRIPLE'
      return false
    })
    if (exact) return exact.value
    if (labeled.length > 1) return null
    return labeled[0].value
  }

  if (pool.length > 1) {
    const byActual = pickByActualValue(pool, diariaLancada)
    if (byActual !== null) return byActual
    return null
  }
  return pool[0]?.value ?? null
}

// ─── CATEGORIZAÇÃO (mesmo do parser.js) ────────────────────────────────────

function categorize(row: NormalizedRow): string {
  const origem = (row.origem || '').toUpperCase()
  const segmento = (row.segmento || '').toUpperCase()
  const tipo = (row.tipoHospede || '').toUpperCase()
  const obs = (row.obs || '').toUpperCase()
  const grupo = (row.grupo || '').trim()

  const faturar = obs.includes('FATURAR')

  const isCortesiaRoom =
    tipo === 'COURTESY' ||
    segmento.includes('COMPLIMENTARY') ||
    /CORTESIA\s+DE\s+DI[AÁ]RIAS|DI[AÁ]RIAS\s+CORTESIA|CORTESIA\s+DI[AÁ]RIA\b/i.test(obs)

  if (!faturar && isCortesiaRoom) return 'CORTESIA'
  if ((row.confidencial || '').toUpperCase() === 'S') return 'CONFIDENCIAL'
  if (segmento.includes('CREWS') || origem.includes('CREWS')) return 'CREWS'
  if (segmento.includes('GROUP') || segmento.includes('GROUPS') || grupo) return 'GRUPO'
  if (segmento.includes('OTA') || origem.includes('AGENCIA ON-LINE') || origem.includes('BOOKING') || origem.includes('EXPEDIA')) return 'OTA'
  if (origem.includes('MELIA.COM') || origem.includes('CALL CENTER') || segmento.includes('DIRECT CLIENT') || segmento.includes('DIRETO') || segmento.includes('MELIAREWARDS')) return 'DIRETO'
  if (segmento.includes('TTOO') || segmento.includes('TRAVEL AGENCY') || segmento.includes('BT NEGOTIATED') || segmento.includes('BT DYNAMIC') || segmento.includes('NLRA') ||
      origem.includes('OPERADORA') || origem.includes('MICE') || origem.includes('AGENCIA DE VIAGEM') || origem.includes('AGÊNCIA DE VIAGEM')) return 'B2B'
  return 'OUTROS'
}

function severidade(diff: number): string {
  if (diff >= 50) return 'CRÍTICA'
  if (diff >= 20) return 'ALTA'
  return 'MÉDIA'
}

// ─── DATA DE AUDITORIA ──────────────────────────────────────────────────────

function subtractDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function parseDateFromFilename(name: string): string | null {
  const m = (name || '').match(/(\d{2})[-_.](\d{2})[-_.](\d{2,4})/)
  if (!m) return null
  let d = m[1], mo = m[2], y = m[3]
  if (y.length === 2) y = `20${y}`
  const dd = parseInt(d), mm = parseInt(mo), yy = parseInt(y)
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12 || yy < 2020 || yy > 2050) return null
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

// ============================================================================
// MAIN — chamado pelo Power Automate
// ============================================================================

function main(workbook: ExcelScript.Workbook, fileName: string = ''): string {
  const sheets = workbook.getWorksheets()
  const inputSheet = sheets[0]
  const used = inputSheet.getUsedRange()
  if (!used) return 'Planilha vazia — nada pra auditar.'

  const values = used.getValues() as string[][]
  const rawHeaders = values[0].map(h => normalizeKey(String(h)))
  const schema = detectSchema(rawHeaders)
  const colMap = buildColumnMap(rawHeaders, schema)

  const normalized: NormalizedRow[] = []
  for (let i = 1; i < values.length; i++) {
    const rawRow: { [key: string]: string } = {}
    rawHeaders.forEach((h, idx) => { rawRow[h] = String(values[i][idx] ?? '').trim() })
    normalized.push(normalizeRow(rawRow, colMap))
  }

  const checkins = normalized.filter(r => r.status === 'Checkin')

  let auditDate = parseDateFromFilename(fileName)
  if (!auditDate) {
    const chegadas = checkins.map(r => parseBRDate(r.chegada)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
    auditDate = chegadas[chegadas.length - 1] || new Date().toISOString().split('T')[0]
  }

  const resultados: ResultRow[] = []
  for (const r of checkins) {
    const diaria = parseBRNum(r.diaria)
    const trf = extractTRF(r.obs, auditDate, r.adultos, r.tipoUH, schema.tariffKeyword, diaria)
    const cat = categorize(r)
    const diff = trf !== null ? Math.abs(diaria - trf) : null
    resultados.push({
      uh: r.uh, nome: r.hospede, categoria: cat, tarifa: r.tarifa,
      diaria, trf, chegada: r.chegada, partida: r.partida, tipoUH: r.tipoUH,
      obs: r.obs, reserva: r.reserva,
      diferenca: diff, severidade: diff !== null && diff > 1 ? severidade(diff) : '',
    })
  }

  // ── Escreve aba "Auditoria" ────────────────────────────────────────────
  const existing = workbook.getWorksheet('Auditoria')
  if (existing) existing.delete()
  const auditSheet = workbook.addWorksheet('Auditoria')

  const headers = ['UH', 'Hóspede', 'Reserva', 'Categoria', 'Tarifa', 'Tipo UH', 'Diária Lançada', 'Tarifa Esperada', 'Diferença', 'Severidade', 'Chegada', 'Partida', 'Observações']
  const rows = resultados.map(r => [
    r.uh, r.nome, r.reserva, r.categoria, r.tarifa, r.tipoUH,
    r.diaria, r.trf ?? '', r.diferenca ?? '', r.severidade,
    r.chegada, r.partida, r.obs,
  ])

  const dataRange = auditSheet.getRangeByIndexes(0, 0, rows.length + 1, headers.length)
  dataRange.setValues([headers, ...rows])

  const headerRange = auditSheet.getRangeByIndexes(0, 0, 1, headers.length)
  headerRange.getFormat().getFont().setBold(true)
  headerRange.getFormat().getFill().setColor('#1F2529')
  headerRange.getFormat().getFont().setColor('#FFFFFF')

  auditSheet.getAutoFilter().apply(dataRange)
  auditSheet.getRange().getFormat().autofitColumns()

  // Destaca linhas com divergência (severidade preenchida)
  for (let i = 0; i < resultados.length; i++) {
    if (resultados[i].severidade) {
      const rowRange = auditSheet.getRangeByIndexes(i + 1, 0, 1, headers.length)
      const color = resultados[i].severidade === 'CRÍTICA' ? '#F4C7C3' : resultados[i].severidade === 'ALTA' ? '#FCE8B2' : '#FFF2CC'
      rowRange.getFormat().getFill().setColor(color)
    }
  }

  const divergencias = resultados.filter(r => r.severidade)
  const criticas = resultados.filter(r => r.severidade === 'CRÍTICA')

  const resumo = `Auditoria de diárias (${auditDate}): ${resultados.length} check-ins, ${divergencias.length} divergência(s), ${criticas.length} crítica(s).`

  // Detalhe das divergências direto na mensagem do Teams -- sem isso, quem
  // audita precisa abrir a planilha e a aba Auditoria só pra saber qual UH
  // corrigir no VHF. Ordenado por diferença (maior primeiro), até 15 linhas
  // pra não virar uma mensagem gigante numa noite ruim.
  let detalhe = ''
  if (divergencias.length > 0) {
    const ordenadas = [...divergencias].sort((a, b) => (b.diferenca ?? 0) - (a.diferenca ?? 0))
    const emoji = (sev: string) => sev === 'CRÍTICA' ? '🔴' : sev === 'ALTA' ? '🟠' : '🟡'
    const linhas = ordenadas.slice(0, 15).map((r) =>
      `${emoji(r.severidade)} UH ${r.uh} - ${r.nome} | Lançado R$ ${formatBRL(r.diaria)} → Esperado R$ ${formatBRL(r.trf ?? 0)} (dif. R$ ${formatBRL(r.diferenca ?? 0)})`
    )
    if (ordenadas.length > 15) linhas.push(`... e mais ${ordenadas.length - 15} divergência(s) — ver aba Auditoria.`)
    detalhe = '\n\n' + linhas.join('\n')
  }

  return resumo + detalhe
}

function formatBRL(n: number): string {
  const fixed = n.toFixed(2).replace('.', ',')
  const [intPart, decPart] = fixed.split(',')
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return intFormatted + ',' + decPart
}
