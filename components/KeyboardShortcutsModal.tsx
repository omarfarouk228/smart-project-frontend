'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const SHORTCUTS = [
  { keys: ['?'],        label: 'Afficher les raccourcis clavier' },
  { keys: ['N'],        label: 'Nouvelle tâche (board / liste)' },
  { keys: ['/'],        label: 'Focuser la barre de recherche' },
  { keys: ['Esc'],      label: 'Fermer la fenêtre active' },
  { keys: ['G', 'D'],   label: 'Aller au tableau de bord' },
  { keys: ['G', 'P'],   label: 'Aller aux projets' },
  { keys: ['G', 'T'],   label: 'Aller à "Mes tâches"' },
]

export function KeyboardShortcutsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[15px]">Raccourcis clavier</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border/40">
          {SHORTCUTS.map(({ keys, label }) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <span className="text-[13px] text-muted-foreground">{label}</span>
              <div className="flex items-center gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded border border-border/70 bg-muted text-[10px] font-semibold font-mono"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground/50 text-center pb-1">
          Les raccourcis ne s'activent pas quand un champ est actif
        </p>
      </DialogContent>
    </Dialog>
  )
}
