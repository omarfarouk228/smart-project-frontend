import type { Priority } from '@/types/task'

export interface ParsedTaskRow {
  title: string
  description?: string
  priority?: Priority
  due_date?: string
  start_date?: string
  columnName?: string
  rowNumber: number
  error?: string
}

// Matched against normalized (accent/space/punctuation-stripped) header keys,
// first by exact match then by substring — so "Date d'échéance" (-> "datedecheance")
// still matches via the "echeance" substring even though it isn't an exact hit.
const TITLE_KEYS = ['title', 'titre', 'name', 'nom']
const DESCRIPTION_KEYS = ['description', 'desc']
const PRIORITY_KEYS = ['priority', 'priorite']
const DUE_DATE_KEYS = ['duedate', 'echeance', 'datefin', 'enddate']
const START_DATE_KEYS = ['startdate', 'debut']
const COLUMN_KEYS = ['column', 'colonne', 'status', 'statut', 'etat']

const PRIORITY_MAP: Record<string, Priority> = {
  low: 'low', faible: 'low', basse: 'low',
  medium: 'medium', moyenne: 'medium', normale: 'medium', normal: 'medium',
  high: 'high', haute: 'high', elevee: 'high', importante: 'high',
  urgent: 'urgent', urgente: 'urgent', critique: 'urgent',
}

function normalizeKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function normalizePriority(v?: string): Priority {
  if (!v) return 'medium'
  return PRIORITY_MAP[normalizeKey(v)] ?? 'medium'
}

function normalizeDate(v?: string): string | undefined {
  if (!v) return undefined
  const trimmed = v.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const [, d, mo, y] = slash
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const parsed = Date.parse(trimmed)
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString().slice(0, 10)
}

function findValue(record: Record<string, string>, patterns: string[]): string | undefined {
  const keys = Object.keys(record)
  for (const rawKey of keys) {
    if (patterns.includes(normalizeKey(rawKey))) {
      const v = record[rawKey]?.trim()
      if (v) return v
    }
  }
  for (const rawKey of keys) {
    const nk = normalizeKey(rawKey)
    if (patterns.some((p) => nk.includes(p))) {
      const v = record[rawKey]?.trim()
      if (v) return v
    }
  }
  return undefined
}

function buildRow(record: Record<string, string>, rowNumber: number): ParsedTaskRow {
  const title = findValue(record, TITLE_KEYS)
  const row: ParsedTaskRow = {
    title: title ?? '',
    description: findValue(record, DESCRIPTION_KEYS),
    priority: normalizePriority(findValue(record, PRIORITY_KEYS)),
    due_date: normalizeDate(findValue(record, DUE_DATE_KEYS)),
    start_date: normalizeDate(findValue(record, START_DATE_KEYS)),
    columnName: findValue(record, COLUMN_KEYS),
    rowNumber,
  }
  if (!title) row.error = 'Titre manquant'
  return row
}

/** Minimal RFC4180-ish CSV parser: quoted fields, escaped quotes, CRLF/LF. */
function parseCSV(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 2
        } else {
          inQuotes = false
          i += 1
        }
      } else {
        field += char
        i += 1
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
      i += 1
    } else if (char === ',') {
      row.push(field)
      field = ''
      i += 1
    } else if (char === '\r') {
      i += 1
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      i += 1
    } else {
      field += char
      i += 1
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

function parseCsvRecords(text: string): Record<string, string>[] {
  const rows = parseCSV(text)
  if (rows.length === 0) return []
  const [header, ...body] = rows
  return body.map((cols) => {
    const record: Record<string, string> = {}
    header.forEach((h, i) => { record[h] = cols[i] ?? '' })
    return record
  })
}

function parseJsonRecords(text: string): Record<string, string>[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Fichier JSON invalide')
  }
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { tasks?: unknown }).tasks)
      ? (data as { tasks: unknown[] }).tasks
      : null
  if (!list) throw new Error('Le JSON doit être un tableau de tâches (ou un objet { "tasks": [...] })')

  return list.map((item) => {
    const record: Record<string, string> = {}
    if (item && typeof item === 'object') {
      for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
        record[k] = v == null ? '' : String(v)
      }
    }
    return record
  })
}

export async function parseImportFile(file: File): Promise<ParsedTaskRow[]> {
  const text = await file.text()
  const isJson = file.name.toLowerCase().endsWith('.json') || file.type === 'application/json'
  const records = isJson ? parseJsonRecords(text) : parseCsvRecords(text)
  return records.map((record, idx) => buildRow(record, idx + 2))
}
