'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { UploadCloud, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import api from '@/lib/api'
import { parseImportFile, type ParsedTaskRow } from '@/lib/taskImport'
import type { Column } from '@/types/project'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente',
}

interface ImportTasksDialogProps {
  projectId: string
  columns: Column[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

export function ImportTasksDialog({ projectId, columns, open, onOpenChange, onImported }: ImportTasksDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedTaskRow[]>([])
  const [defaultColumnId, setDefaultColumnId] = useState<string>(columns[0]?.id ?? '')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [summary, setSummary] = useState<{ success: number; failed: number } | null>(null)

  const validRows = rows.filter((r) => !r.error)

  const reset = () => {
    setFileName(null)
    setRows([])
    setImporting(false)
    setProgress(0)
    setSummary(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    if (importing) return
    reset()
    onOpenChange(false)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSummary(null)
    try {
      const parsed = await parseImportFile(file)
      if (parsed.length === 0) {
        toast.error('Aucune ligne trouvée dans le fichier')
        return
      }
      setFileName(file.name)
      setRows(parsed)
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de lire le fichier')
    }
  }

  const resolveColumnId = (row: ParsedTaskRow): string => {
    if (row.columnName) {
      const match = columns.find((c) => c.name.trim().toLowerCase() === row.columnName!.trim().toLowerCase())
      if (match) return match.id
    }
    return defaultColumnId
  }

  const handleImport = async () => {
    if (validRows.length === 0 || !defaultColumnId) return
    setImporting(true)
    setProgress(0)
    let success = 0
    let failed = 0
    for (const row of validRows) {
      try {
        await api.post(`/api/projects/${projectId}/tasks`, {
          title: row.title,
          description: row.description || undefined,
          column_id: resolveColumnId(row),
          priority: row.priority || 'medium',
          due_date: row.due_date || undefined,
          start_date: row.start_date || undefined,
        })
        success += 1
      } catch {
        failed += 1
      }
      setProgress((p) => p + 1)
    }
    setImporting(false)
    setSummary({ success, failed })
    if (success > 0) onImported()
    if (failed === 0) toast.success(`${success} tâche(s) importée(s)`)
    else toast.warning(`${success} importée(s), ${failed} échec(s)`)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : handleClose())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des tâches</DialogTitle>
          <DialogDescription>
            Fichier JSON (tableau ou {'{ "tasks": [...] }'}) ou CSV avec en-têtes. Colonnes reconnues : titre,
            description, priorité, date_debut, date_echeance, colonne.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!fileName && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/70 py-10 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <UploadCloud className="h-6 w-6" />
              <span className="text-[13px]">Cliquez pour choisir un fichier .csv ou .json</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,application/json,text/csv"
            className="hidden"
            onChange={handleFileSelect}
          />

          {fileName && !summary && (
            <>
              <div className="flex items-center justify-between text-[13px]">
                <span className="truncate font-medium text-foreground">{fileName}</span>
                <button type="button" onClick={reset} className="text-muted-foreground hover:text-foreground">
                  Changer de fichier
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-[12px] text-muted-foreground">Colonne par défaut</Label>
                <Select value={defaultColumnId} onValueChange={(v) => setDefaultColumnId(v ?? '')}>
                  <SelectTrigger className="h-7 w-56 text-[12px]">
                    <SelectValue placeholder="Choisir une colonne" />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="max-h-72 overflow-auto rounded-lg border border-border/60">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-muted/50">
                    <tr className="text-left text-muted-foreground">
                      <th className="px-2 py-1.5 font-medium">Titre</th>
                      <th className="px-2 py-1.5 font-medium">Priorité</th>
                      <th className="px-2 py-1.5 font-medium">Échéance</th>
                      <th className="px-2 py-1.5 font-medium">Colonne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={cn('border-t border-border/40', row.error && 'bg-destructive/5')}>
                        <td className="px-2 py-1.5">
                          {row.error ? (
                            <span className="flex items-center gap-1 text-destructive">
                              <AlertCircle className="h-3 w-3 shrink-0" /> {row.error}
                            </span>
                          ) : (
                            row.title
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {row.priority ? PRIORITY_LABEL[row.priority] : ''}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{row.due_date ?? ''}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {row.columnName ?? columns.find((c) => c.id === defaultColumnId)?.name ?? ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[12px] text-muted-foreground">
                {validRows.length} tâche(s) valide(s) sur {rows.length}
              </p>
            </>
          )}

          {importing && (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Import en cours… {progress}/{validRows.length}
            </div>
          )}

          {summary && (
            <div className="flex items-center gap-2 text-[13px]">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              {summary.success} tâche(s) importée(s)
              {summary.failed > 0 && <span className="text-destructive">, {summary.failed} échec(s)</span>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {summary ? 'Fermer' : 'Annuler'}
          </Button>
          {!summary && (
            <Button onClick={handleImport} disabled={importing || validRows.length === 0 || !defaultColumnId}>
              {importing ? 'Import…' : `Importer (${validRows.length})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
