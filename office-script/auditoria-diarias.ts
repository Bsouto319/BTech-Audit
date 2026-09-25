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
    uhRef: string | null
}

interface Alert { type: string; severity: string; diff?: number; expected?: number; actual?: number }

interface ResultRow {
    uh: string; nome: string; categoria: string; tarifa: string
    diaria: number; trf: number | null; chegada: string; partida: string
    tipoUH: string; obs: string; reserva: string
    diferenca: number | null; severidade: string
}

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

    // "DUPLO"/"TRIPLO" (PT-BR) precisam ser reconhecidos igual "DBL"/"TPL" (EN) --
    // achado real (UH 1903 e outras 21, 20/09; UH 1106, 25/09): o VHF mistura
    // inglês e português no mesmo texto (ex: "TRF 559,00 SINGLE // TRF 619,00
    // DUPLO", ou "TRF 911,90 + 5% TRIPLO!"). Sem isso, o rótulo fica null e o
    // sistema escolhe a tarifa errada por ocupação.
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
        const uhRefMatch = afterText.slice(0, 40).match(/\(\s*(\d{3,5})\s*\)/)
        const uhRef = uhRefMatch ? uhRefMatch[1] : null

        entries.push({ value, label, dateFrom, dateTo, singleDay, uhRef })
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

function pickByActualValue(candidates: TRFEntry[], diariaLancada: number | null): number | null {
    if (diariaLancada === null || diariaLancada === undefined) return null
    const match = candidates.find(e => Math.abs(e.value - diariaLancada) <= 1)
    return match ? match.value : null
}

function extractTRF(obs: string, refDate: string | null, adultos: string, tipoUH: string, tariffKeyword: string, diariaLancada: number | null = null, uh: string | null = null): number | null {
    let entries = parseTRFEntries(obs, tariffKeyword)
    if (entries.length === 0) return null

    if (uh) {
        const uhNum = parseInt(String(uh).replace(/\D/g, ''), 10)
        if (!isNaN(uhNum)) {
            const filtered = entries.filter(e => {
                if (!e.uhRef) return true
                return parseInt(e.uhRef, 10) === uhNum
            })
            if (filtered.length > 0) entries = filtered
        }
    }

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
        const exact = labeled.filter(e => {
            if (oLabel === 'SGL') return e.label === 'SGL' || e.label === 'SINGLE'
            if (oLabel === 'DBL') return e.label === 'DBL' || e.label === 'DOUBLE' || e.label === 'SUITE'
            if (oLabel === 'TPL') return e.label === 'TPL' || e.label === 'TRIPLE'
            return false
        })
        if (exact.length > 1) {
            const byActual = pickByActualValue(exact, diariaLancada)
            if (byActual !== null) return byActual
            return exact[0].value
        }
        if (exact.length === 1) return exact[0].value
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

function subtractDay(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00')
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
}

interface FilenameDate { date?: string; day?: number; month?: number }
function parseDateFromFilename(name: string): FilenameDate | null {
    const s = name || ''
    const full = s.match(/(\d{1,2})[-_.\s](\d{1,2})[-_.\s](\d{2,4})(?!\d)/)
    if (full) {
        let d = full[1], mo = full[2], y = full[3]
        if (y.length === 2) y = `20${y}`
        const dd = parseInt(d), mm = parseInt(mo), yy = parseInt(y)
        if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12 && yy >= 2020 && yy <= 2050) {
            return { date: `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}` }
        }
    }
    const short = s.match(/(?:^|\D)(\d{1,2})[-_.\s](\d{1,2})(?:\D|$)/)
    if (short) {
        const dd = parseInt(short[1]), mm = parseInt(short[2])
        if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) return { day: dd, month: mm }
    }
    return null
}

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

    const chegadas = checkins.map(r => parseBRDate(r.chegada)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
    const maxChegada = chegadas[chegadas.length - 1] || null
    const partidas = checkins.map(r => parseBRDate(r.partida)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()
    const minPartidaMinus1 = partidas[0] ? subtractDay(partidas[0]) : null
    const fallbackDate = (): string => {
        if (maxChegada && minPartidaMinus1) return maxChegada > minPartidaMinus1 ? maxChegada : minPartidaMinus1
        return maxChegada || minPartidaMinus1 || new Date().toISOString().split('T')[0]
    }

    let auditDate: string
    const fromName = parseDateFromFilename(fileName)
    if (fromName?.date) {
        auditDate = fromName.date
    } else if (fromName?.day && fromName?.month) {
        const year = fallbackDate().slice(0, 4)
        auditDate = `${year}-${String(fromName.month).padStart(2, '0')}-${String(fromName.day).padStart(2, '0')}`
    } else {
        auditDate = fallbackDate()
    }

    const resultados: ResultRow[] = []
    for (const r of checkins) {
        const diaria = parseBRNum(r.diaria)
        const trf = extractTRF(r.obs, auditDate, r.adultos, r.tipoUH, schema.tariffKeyword, diaria, r.uh)
        const cat = categorize(r)
        const diff = trf !== null ? Math.abs(diaria - trf) : null
        resultados.push({
            uh: r.uh, nome: r.hospede, categoria: cat, tarifa: r.tarifa,
            diaria, trf, chegada: r.chegada, partida: r.partida, tipoUH: r.tipoUH,
            obs: r.obs, reserva: r.reserva,
            diferenca: diff, severidade: diff !== null && diff > 1 ? severidade(diff) : '',
        })
    }

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

    let cbDados: CbResult[] = []
    let cbErro = ''
    try { cbDados = cbRun(workbook, auditDate || '') } catch (e) { cbErro = String(e) }
    try {
      const divs: CbDiv[] = divergencias.map(r => ({ uh: String(r.uh), nome: String(r.nome), sev: String(r.severidade), diaria: r.diaria, trf: r.trf ?? 0, dif: r.diferenca ?? 0 }))
      return cbMontarHtml(auditDate || '', resultados.length, divs, criticas.length, cbDados, cbErro)
    } catch (e2) {
      return resumo + detalhe + (cbErro ? '\n\n(Bloco de cobranca nao executado: ' + cbErro + ')' : '')
    }
}

function formatBRL(n: number): string {
  const fixed = n.toFixed(2).replace('.', ',')
  const [intPart, decPart] = fixed.split(',')
  const intFormatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return intFormatted + ',' + decPart
}


// ============================================================================
// BTech Audit — Cobrança e pagamento (bloco acrescentado ao auditoria-diarias)
// ============================================================================
// Lê as observações do VHF de cada check-in e separa em:
//   FATURAR · B2B · PAGAMENTO DIRETO · JÁ PAGO · DÉBITO NO CC ANEXO · CORTESIA · SEM INSTRUÇÃO
// e sinaliza CONFIDENCIAL (não soma no total: é um aviso à parte).
// Devolve o texto para o Teams e cria a aba "Cobrança" na planilha auditada.
// Todas as funções e constantes começam com "cb" para não colidir com o script.
// ============================================================================

interface CbRow {
  uh: string; hospede: string; origem: string; segmento: string; razao: string;
  tipoHosp: string; confCol: string; obs: string; partida: string;
}

interface CbResult {
  uh: string; hospede: string; grupo: string; confidencial: boolean;
  tarifaConfidencial: boolean;
  origem: string; segmento: string; motivo: string; obs: string;
}

const CB_ORDEM: string[] = ["FATURAR", "B2B", "PAGAMENTO DIRETO", "JÁ PAGO", "DÉBITO CC ANEXO", "CORTESIA", "SEM INSTRUÇÃO"];

const CB_TITULO: { [k: string]: string } = {
  "FATURAR": "Faturar",
  "B2B": "B2B (debitar no B2B)",
  "PAGAMENTO DIRETO": "Pagamento direto (inclui Booking e Meliá.com)",
  "JÁ PAGO": "Já pago (nada a cobrar)",
  "DÉBITO CC ANEXO": "Outros débitos (CC anexo, Secure, Extranet)",
  "CORTESIA": "Cortesia",
  "SEM INSTRUÇÃO": "Sem instrução de cobrança (conferir no VHF)"
};

// "DIARIAS DE 07 A 10/09 JA PAGAS", "JA PAGO VIA DEPOSITO", "PRE-PAGO", "PREPAID", "QUITADO"...
const CB_PAGO = /\bJ[AÁ]\s+(EST[AÁ]\s+)?PAG(O|A|AS|OS)\b|\bPR[EÉ][- ]?PAG(O|A|AS|OS)\b|\bPREPAID\b|\bPAGO\s+ANTECIPAD|\bQUITAD(O|A|AS|OS)\b|ALREADY\s+PAID|PAID\s+IN\s+FULL/;

function cbSegmentos(obs: string): string[] {
  return obs.toUpperCase().split(/\/\/+|\n|\*\*/).map(s => s.trim()).filter(s => s !== "");
}

function cbTrecho(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > 90 ? t.substring(0, 90) + "…" : t;
}

// Retorna o grupo de cobrança + o trecho da observação que motivou a decisão.
function cbClassificar(r: CbRow): { grupo: string; motivo: string } {
  const segs = cbSegmentos(r.obs);
  const origem = r.origem.toUpperCase();
  const segmento = r.segmento.toUpperCase();
  const tipo = r.tipoHosp.toUpperCase();
  const textoOrigem = (r.origem + " " + r.razao + " " + r.obs).toUpperCase();

  const segFaturar = segs.find(s => /FATURAR/.test(s) && !/N[AÃ]O\s+FATURAR/.test(s));
  const segB2B = segs.find(s => /DEBITAR/.test(s) && /B2B/.test(s));
  const segDireto = segs.find(s => /(PAGTO|PAGAMENTO|PGTO|PAG\.?)\s+DIRETO/.test(s));
  const segDebitar = segs.find(s => /DEBITAR/.test(s));
  const segCortesia = segs.find(s => /\bCORTESIA\b/.test(s) && !/EXTRA/.test(s));
  const segPago = segs.find(s => CB_PAGO.test(s) && !/N[AÃ]O\s+(EST[AÁ]\s+)?(J[AÁ]\s+)?PAG/.test(s));

  // Cortesia (só quando não há instrução de faturar)
  const cortesiaFlag = tipo === "COURTESY" || segmento.indexOf("COMPLIMENTARY") >= 0 ||
    /CORTESIA\s+DE\s+DI[AÁ]RIAS|DI[AÁ]RIAS\s+CORTESIA|CORTESIA\s+DI[AÁ]RIA\b/.test(r.obs.toUpperCase());
  if (!segFaturar && (cortesiaFlag || segCortesia)) {
    return { grupo: "CORTESIA", motivo: segCortesia ? cbTrecho(segCortesia) : (tipo === "COURTESY" ? "Tipo hóspede: Courtesy" : "Segmento: Complimentary") };
  }
  if (segB2B) return { grupo: "B2B", motivo: cbTrecho(segB2B) };
  // Já pago: só perde para uma instrução explícita de faturar as DIÁRIAS (faturar só os extras não conta)
  if (segPago && !(segFaturar && /DI[AÁ]RIA/.test(segFaturar) && !/EXTRA/.test(segFaturar))) {
    return { grupo: "JÁ PAGO", motivo: cbTrecho(segPago) };
  }
  if (segFaturar) return { grupo: "FATURAR", motivo: cbTrecho(segFaturar) };
  if (segDireto) return { grupo: "PAGAMENTO DIRETO", motivo: cbTrecho(segDireto) };
  if (textoOrigem.indexOf("BOOKING") >= 0) return { grupo: "PAGAMENTO DIRETO", motivo: "Origem: Booking" };
  if (origem.indexOf("MELIA.COM") >= 0 || origem.indexOf("CALL CENTER") >= 0 ||
    segmento.indexOf("DIRECT CLIENT") >= 0 || segmento.indexOf("MELIAREWARDS") >= 0) {
    return { grupo: "PAGAMENTO DIRETO", motivo: "Origem/segmento direto (Meliá)" };
  }
  if (segDebitar) return { grupo: "DÉBITO CC ANEXO", motivo: cbTrecho(segDebitar) };
  return { grupo: "SEM INSTRUÇÃO", motivo: "" };
}

// "TARIFA CONFIDENCIAL" / "TRF CONFIDENCIAL" é tipo de contrato, não hóspede confidencial.
function cbConfidencial(r: CbRow): boolean {
  if (r.confCol.toUpperCase() === "S") return true;
  const limpo = r.obs.toUpperCase().replace(/(TARIFAS?|TRF|RATE)\s*\**\s*CONFIDENCIAL(IS)?/g, "");
  return limpo.indexOf("CONFIDENCIAL") >= 0;
}

// Marca visível de contrato com tarifa confidencial (não reclassifica o grupo).
function cbTarifaConfidencial(r: CbRow): boolean {
  return /(TARIFAS?|TRF|RATE)\s*\**\s*CONFIDENCIAL(IS)?/i.test(r.obs);
}

function cbNumeroUH(uh: string): number {
  const n = parseInt(uh);
  return isNaN(n) ? 999999 : n;
}

// "23/09/2026" -> "2026-09-23". Retorna "" se não conseguir interpretar.
function cbParseDataBR(s: string): string {
  const p = (s || "").trim().split("/");
  if (p.length === 3 && p[0] && p[1] && p[2]) {
    return p[2].padStart(4, "20") + "-" + p[1].padStart(2, "0") + "-" + p[0].padStart(2, "0");
  }
  return "";
}

// Soma 1 dia a uma data ISO "AAAA-MM-DD".
function cbAddDay(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// Documento é para imprimir/conferir por UH no VHF, não por reserva: cada UH aparece uma única vez por grupo.
function cbUhsUnicas(itens: CbResult[]): string[] {
  const visto: { [k: string]: boolean } = {};
  const ordem: string[] = [];
  for (const i of itens) {
    if (!visto[i.uh]) { visto[i.uh] = true; ordem.push(i.uh); }
  }
  return ordem;
}

function cbListaUH(itens: CbResult[]): string {
  return cbUhsUnicas(itens).join(", ");
}

// Exibição do grupo na mensagem do Teams: marca 🔴 quando é tarifa confidencial
// e, para o B2B, acrescenta o nome do hóspede. Não afeta a lógica de auditoria.
function cbUhsExibicao(itens: CbResult[], comNome: boolean): string[] {
  const visto: { [k: string]: boolean } = {};
  const ordem: string[] = [];
  for (const i of itens) {
    if (visto[i.uh]) continue;
    visto[i.uh] = true;
    let s = i.uh;
    if (i.tarifaConfidencial) s += " 🔴";
    if (comNome && i.hospede) s += " (" + i.hospede + ")";
    ordem.push(s);
  }
  return ordem;
}

// Cobrança só é mapeada para quem tem saída prevista no dia seguinte à data da auditoria —
// são os hóspedes que precisam ter a cobrança efetivada nos portais (B2B etc.) até a saída.
// A conferência de tarifas (divergências) continua olhando todo mundo hospedado, sem esse filtro.
function cbRun(workbook: ExcelScript.Workbook, auditDate: string): CbResult[] {
  let src: ExcelScript.Worksheet | undefined;
  for (const ws of workbook.getWorksheets()) {
    const n = ws.getName();
    if (n !== "Auditoria" && n !== "Cobrança") { src = ws; break; }
  }
  if (!src) return [];

  const values = src.getUsedRange().getValues();
  const F: { [k: string]: RegExp } = {
    status: /^status$/i, uh: /^\s*(uh|apto|quarto)\s*$/i, hospede: /^h[oó]spede$/i,
    origem: /^(origem|canal)$/i, segmento: /^segmento$/i, razao: /raz[aã]o\s*social/i,
    tipoHosp: /tipo\s*h[oó]spede/i, conf: /^confidencial$/i, obs: /observa[cç][oõaã]/i,
    partida: /^\s*partida\s*$/i
  };

  let headerIdx = -1;
  for (let i = 0; i < Math.min(values.length, 15); i++) {
    const cells = values[i].map(c => String(c).replace(/[\uFEFF\u00A0]/g, " ").trim());
    if (cells.some(c => F["status"].test(c)) && cells.some(c => F["obs"].test(c))) { headerIdx = i; break; }
  }
  if (headerIdx < 0) return [];

  const headers = values[headerIdx].map(c => String(c).replace(/[\uFEFF\u00A0]/g, " ").trim());
  const col: { [k: string]: number } = {};
  for (const k of Object.keys(F)) col[k] = headers.findIndex(h => F[k].test(h));

  const txt = (row: (string | number | boolean)[], k: string): string => {
    const idx = col[k];
    if (idx < 0) return "";
    const v = row[idx];
    return String(v === undefined || v === null ? "" : v).trim();
  };

  // Data de saída-alvo (auditoria + 1 dia). Sem data de auditoria válida, não filtra por saída
  // (mantém o comportamento antigo em vez de zerar a cobrança por engano).
  const dataSaidaAlvo = /^\d{4}-\d{2}-\d{2}$/.test(auditDate || "") ? cbAddDay(auditDate) : "";

  const resultados: CbResult[] = [];
  for (let i = headerIdx + 1; i < values.length; i++) {
    const row = values[i];
    const status = txt(row, "status").toLowerCase().replace("-", "");
    if (status !== "checkin") continue;
    const r: CbRow = {
      uh: txt(row, "uh"), hospede: txt(row, "hospede"), origem: txt(row, "origem"),
      segmento: txt(row, "segmento"), razao: txt(row, "razao"), tipoHosp: txt(row, "tipoHosp"),
      confCol: txt(row, "conf"), obs: txt(row, "obs"), partida: txt(row, "partida")
    };
    if (dataSaidaAlvo && cbParseDataBR(r.partida) !== dataSaidaAlvo) continue;
    const c = cbClassificar(r);
    resultados.push({
      uh: r.uh, hospede: r.hospede, grupo: c.grupo, confidencial: cbConfidencial(r),
      tarifaConfidencial: cbTarifaConfidencial(r),
      origem: r.origem, segmento: r.segmento, motivo: c.motivo, obs: r.obs
    });
  }

  resultados.sort((a, b) => cbNumeroUH(a.uh) - cbNumeroUH(b.uh));

  // ── Aba "Cobrança" ─────────────────────────────────────────────────────────
  const old = workbook.getWorksheet("Cobrança");
  if (old) old.delete();
  const sh = workbook.addWorksheet("Cobrança");
  const head = ["UH", "Hóspede", "Cobrança", "Confidencial", "Origem", "Segmento", "Trecho que decidiu", "Observações"];
  const hr = sh.getRangeByIndexes(0, 0, 1, head.length);
  hr.setValues([head]);
  hr.getFormat().getFont().setBold(true);
  hr.getFormat().getFont().setColor("#FFFFFF");
  hr.getFormat().getFill().setColor("#1F3864");

  const ordenadas = resultados.slice().sort((a, b) => {
    const ga = CB_ORDEM.indexOf(a.grupo), gb = CB_ORDEM.indexOf(b.grupo);
    if (ga !== gb) return ga - gb;
    return cbNumeroUH(a.uh) - cbNumeroUH(b.uh);
  });
  if (ordenadas.length > 0) {
    const corpo = ordenadas.map(r => [
      r.uh, r.hospede, r.grupo, r.confidencial ? "SIM" : "", r.origem, r.segmento, r.motivo, r.obs
    ]);
    sh.getRangeByIndexes(1, 0, corpo.length, head.length).setValues(corpo);
    const cores: { [k: string]: string } = {
      "FATURAR": "#DDEBF7", "B2B": "#E2EFDA", "PAGAMENTO DIRETO": "#FFF2CC",
      "JÁ PAGO": "#C6EFCE", "DÉBITO CC ANEXO": "#EDEDED", "CORTESIA": "#F8CBAD", "SEM INSTRUÇÃO": "#F4B6B6"
    };
    for (let i = 0; i < ordenadas.length; i++) {
      sh.getRangeByIndexes(1 + i, 2, 1, 1).getFormat().getFill().setColor(cores[ordenadas[i].grupo] || "#FFFFFF");
    }
  }
  sh.getRangeByIndexes(0, 0, ordenadas.length + 1, head.length - 1).getFormat().autofitColumns();
  sh.getRange("H:H").getFormat().setColumnWidth(420);
  sh.getFreezePanes().freezeRows(1);

  const aud = workbook.getWorksheet("Auditoria");
  if (aud) aud.activate();
  return resultados;
}

// ── Mensagem do Teams em HTML ────────────────────────────────────────────────

interface CbDiv { uh: string; nome: string; sev: string; diaria: number; trf: number; dif: number; }

const CB_CURTO: { [k: string]: string } = {
  "FATURAR": "Faturar", "B2B": "B2B", "PAGAMENTO DIRETO": "Pagamento direto",
  "JÁ PAGO": "Já pago", "DÉBITO CC ANEXO": "Outros débitos", "CORTESIA": "Cortesia", "SEM INSTRUÇÃO": "Sem instrução"
};

const CB_ICONE: { [k: string]: string } = {
  "FATURAR": "🧾", "B2B": "🏢", "PAGAMENTO DIRETO": "💳",
  "JÁ PAGO": "✅", "DÉBITO CC ANEXO": "🔁", "CORTESIA": "🎁", "SEM INSTRUÇÃO": "❓"
};

// Mesmo estilo das tabelas do Teams: cabeçalho escuro (igual ao da aba "Cobrança") e cor por severidade.
const CB_HDR = "#1F3864";
const CB_COR_CRIT = "#F4B6B6";
const CB_COR_ALTA = "#FCE4D6";
const CB_COR_MEDIA = "#FFF2CC";

function cbEsc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cbBRL(n: number): string {
  const p = n.toFixed(2).split(".");
  return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + p[1];
}

function cbData(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? m[3] + "/" + m[2] + "/" + m[1] : iso;
}

function cbMontarHtml(auditDate: string, total: number, divs: CbDiv[], criticas: number, cb: CbResult[], erro: string): string {
  const h: string[] = [];
  h.push("<br><b>📋 Auditoria de diárias — " + cbData(auditDate) + "</b><br>");
  h.push("<b>" + total + "</b> check-ins &nbsp;·&nbsp; <b>" + divs.length + "</b> divergência(s) de tarifa &nbsp;·&nbsp; <b>" + criticas + "</b> crítica(s)<br><br>");

  // Divergências de tarifa
  if (divs.length === 0) {
    h.push("✅ Nenhuma divergência de tarifa.<br><br>");
  } else {
    const ord = divs.slice().sort((a, b) => b.dif - a.dif);
    h.push("<b>Divergências de tarifa</b>");
    h.push("<table><tr style=\"background:" + CB_HDR + ";\"><th style=\"color:#fff;\">UH</th><th style=\"color:#fff;\">Hóspede</th><th style=\"color:#fff;\">Lançado</th><th style=\"color:#fff;\">Esperado</th><th style=\"color:#fff;\">Diferença</th></tr>");
    for (const d of ord.slice(0, 15)) {
      const cor = d.sev === "CRÍTICA" ? CB_COR_CRIT : d.sev === "ALTA" ? CB_COR_ALTA : CB_COR_MEDIA;
      const ic = d.sev === "CRÍTICA" ? "🔴" : d.sev === "ALTA" ? "🟠" : "🟡";
      h.push("<tr style=\"background:" + cor + ";\"><td>" + ic + " <b>" + cbEsc(d.uh) + "</b></td><td>" + cbEsc(d.nome) + "</td><td>R$&nbsp;" + cbBRL(d.diaria) +
        "</td><td>R$&nbsp;" + cbBRL(d.trf) + "</td><td><b>R$&nbsp;" + cbBRL(d.dif) + "</b></td></tr>");
    }
    h.push("</table>");
    if (ord.length > 15) h.push("<i>… e mais " + (ord.length - 15) + " divergência(s) — ver aba Auditoria.</i><br>");
    h.push("<br>");
  }

  // Cobrança e pagamento — só entra quem tem saída prevista pro dia seguinte à auditoria
  // (são os hóspedes com cobrança a efetivar nos portais antes de sair).
  const dataSaidaAlvo = /^\d{4}-\d{2}-\d{2}$/.test(auditDate || "") ? cbAddDay(auditDate) : "";
  h.push("<b>💰 Cobrança e pagamento" + (dataSaidaAlvo ? " — saídas de " + cbData(dataSaidaAlvo) : "") + "</b>");
  if (erro) {
    h.push("<br>⚠️ Não foi possível classificar a cobrança (" + cbEsc(erro) + ").<br>");
  } else if (cb.length === 0) {
    h.push("<br>✅ Nenhum hóspede com saída prevista para amanhã — nada a cobrar hoje.<br>");
  } else {
    h.push("<table><tr style=\"background:" + CB_HDR + ";\"><th style=\"color:#fff;\">Grupo</th><th style=\"color:#fff;\">Qtd</th><th style=\"color:#fff;\">UHs</th></tr>");
    for (const g of CB_ORDEM) {
      const itens = cb.filter(x => x.grupo === g);
      if (itens.length === 0 && g !== "FATURAR") continue;
      const uhs = cbUhsExibicao(itens, g === "B2B");
      h.push("<tr><td>" + CB_ICONE[g] + " <b>" + CB_CURTO[g] + "</b></td><td><b>" + uhs.length + "</b></td><td>" +
        (uhs.length > 0 ? cbEsc(uhs.join(", ")) : "—") + "</td></tr>");
    }
    const conf = cb.filter(x => x.confidencial);
    if (conf.length > 0) {
      const uhsConf = cbUhsUnicas(conf);
      h.push("<tr><td>🔒 <b>Confidencial</b> (já contada acima)</td><td><b>" + uhsConf.length + "</b></td><td>" + cbEsc(uhsConf.join(", ")) + "</td></tr>");
    }
    h.push("</table>");
    h.push("<i>Lista só quem tem saída prevista pro dia seguinte (é quem precisa ter a cobrança efetivada nos portais — B2B etc. — antes de sair). Pagamento direto inclui Booking e Meliá.com. Já pago = diárias já quitadas, nada a cobrar. Outros débitos = CC anexo (Secure/Extranet). Sem instrução = conferir no VHF. Qtd e lista = UHs únicas do grupo (uma reserva por UH já basta pra conferir no VHF). Detalhe por reserva na aba \"Cobrança\" da planilha auditada.</i>");
  }
  return h.join("");
}
