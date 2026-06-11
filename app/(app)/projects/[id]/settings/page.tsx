'use client'

import { useState, use, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Trash2, Plus, GripVertical, Check, X, Crown, UserMinus, AlertTriangle, ChevronDown, Search,
} from 'lucide-react'
import api from '@/lib/api'
import type { Project, Column, ProjectMember } from '@/types/project'
import type { User, UserListResponse } from '@/types/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  '#94a3b8', '#3b82f6', '#10b981', '#f97316', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#6366f1',
]

const PROJECT_COLORS = [
  '#4f46e5', '#7c3aed', '#0891b2', '#059669', '#d97706', '#e11d48', '#0f172a',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const colors = [
    'from-violet-500 to-indigo-500', 'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500',
  ]
  const sz = size === 'md' ? 'h-8 w-8 text-[11px]' : 'h-6 w-6 text-[9px]'
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${colors[name.charCodeAt(0) % colors.length]} flex items-center justify-center font-semibold text-white shrink-0`}>
      {initials}
    </div>
  )
}

function ColorDot({ color, onClick }: { color: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-5 w-5 rounded-full shrink-0 ring-1 ring-black/10 transition-transform hover:scale-110"
      style={{ background: color }}
    />
  )
}

function ColorPicker({ value, onChange, colors = PRESET_COLORS }: {
  value: string
  onChange: (c: string) => void
  colors?: string[]
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="h-5 w-5 rounded-full ring-1 ring-black/10 transition-transform hover:scale-110"
          style={{
            background: c,
            outline: value === c ? `2px solid ${c}` : 'none',
            outlineOffset: '2px',
          }}
        />
      ))}
    </div>
  )
}

// ─── Section: General ─────────────────────────────────────────────────────────

function GeneralSection({ project, projectId }: { project: Project; projectId: string }) {
  const qc = useQueryClient()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [color, setColor] = useState(project.color)

  useEffect(() => {
    setName(project.name)
    setDescription(project.description ?? '')
    setColor(project.color)
  }, [project])

  const update = useMutation({
    mutationFn: () =>
      api.patch(`/api/projects/${projectId}`, { name, description: description || null, color }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projet mis à jour')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  const isDirty = name !== project.name || description !== (project.description ?? '') || color !== project.color

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-[12px] font-medium text-foreground/70">Nom *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-[13px] border-border/70 max-w-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[12px] font-medium text-foreground/70">Description</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optionnelle"
          className="h-8 text-[13px] border-border/70 max-w-sm"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-[12px] font-medium text-foreground/70">Couleur</Label>
        <ColorPicker value={color} onChange={setColor} colors={PROJECT_COLORS} />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="h-8 text-[13px] px-4"
          disabled={!isDirty || !name.trim() || update.isPending}
          onClick={() => update.mutate()}
        >
          {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        {isDirty && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-[13px]"
            onClick={() => { setName(project.name); setDescription(project.description ?? ''); setColor(project.color) }}
          >
            Annuler
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-[12px] text-muted-foreground pt-1">
        <span>Clé du projet :</span>
        <span className="font-mono font-semibold text-foreground">{project.key}</span>
      </div>
    </div>
  )
}

// ─── Section: Columns ─────────────────────────────────────────────────────────

interface EditableColumn extends Column {
  _editing: boolean
  _name: string
  _color: string
  _is_done: boolean
}

function ColumnRow({ col, projectId, onUpdate, onDelete }: {
  col: EditableColumn
  projectId: string
  onUpdate: (id: string, patch: Partial<EditableColumn>) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id })

  const isDirty = col._name !== col.name || col._color !== col.color || col._is_done !== col.is_done_column

  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: () =>
      api.patch(`/api/projects/${projectId}/columns/${col.id}`, {
        name: col._name,
        color: col._color,
        is_done_column: col._is_done,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['board', projectId] })
      onUpdate(col.id, { name: col._name, color: col._color, is_done_column: col._is_done, _editing: false })
      toast.success('Colonne mise à jour')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/projects/${projectId}/columns/${col.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['board', projectId] })
      onDelete(col.id)
      toast.success('Colonne supprimée')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-start gap-2 p-3 rounded-lg border border-border/50 bg-card',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <button {...listeners} {...attributes} className="mt-0.5 cursor-grab text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex items-center gap-2">
          {/* Color picker inline */}
          <div className="group relative">
            <ColorDot color={col._color} />
            <div className="absolute left-0 top-7 z-20 hidden group-hover:flex group-focus-within:flex p-2 rounded-lg border border-border/70 bg-popover shadow-lg flex-wrap gap-1.5 w-44">
              <ColorPicker value={col._color} onChange={(c) => onUpdate(col.id, { _color: c })} />
            </div>
          </div>

          <Input
            value={col._name}
            onChange={(e) => onUpdate(col.id, { _name: e.target.value })}
            className="h-7 text-[13px] border-border/60 flex-1"
            placeholder="Nom de la colonne"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onUpdate(col.id, { _is_done: !col._is_done })}
            className={cn(
              'flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md transition-all',
              col._is_done
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <Check className="h-3 w-3" />
            Colonne "Terminé"
          </button>

          {isDirty && (
            <>
              <Button size="sm" className="h-6 text-[11px] px-2" disabled={!col._name.trim() || save.isPending} onClick={() => save.mutate()}>
                Sauvegarder
              </Button>
              <button
                onClick={() => onUpdate(col.id, { _name: col.name, _color: col.color, _is_done: col.is_done_column })}
                className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                Annuler
              </button>
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => remove.mutate()}
        disabled={remove.isPending}
        className="mt-0.5 h-6 w-6 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function ColumnsSection({ project, projectId }: { project: Project; projectId: string }) {
  const qc = useQueryClient()
  const [cols, setCols] = useState<EditableColumn[]>([])
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#94a3b8')
  const [newIsDone, setNewIsDone] = useState(false)

  useEffect(() => {
    setCols(
      [...project.columns]
        .sort((a, b) => a.position - b.position)
        .map((c) => ({ ...c, _editing: false, _name: c.name, _color: c.color, _is_done: c.is_done_column }))
    )
  }, [project.columns])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const reorder = useMutation({
    mutationFn: (ids: string[]) =>
      api.post(`/api/projects/${projectId}/columns/reorder`, { ids }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['board', projectId] })
    },
  })

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = cols.findIndex((c) => c.id === active.id)
    const newIdx = cols.findIndex((c) => c.id === over.id)
    const reordered = arrayMove(cols, oldIdx, newIdx)
    setCols(reordered)
    reorder.mutate(reordered.map((c) => c.id))
  }

  const addColumn = useMutation({
    mutationFn: () =>
      api.post(`/api/projects/${projectId}/columns`, { name: newName, color: newColor, is_done_column: newIsDone }),
    onSuccess: ({ data: col }) => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      qc.invalidateQueries({ queryKey: ['board', projectId] })
      setCols((prev) => [...prev, { ...col, _editing: false, _name: col.name, _color: col.color, _is_done: col.is_done_column }])
      setNewName('')
      setNewColor('#94a3b8')
      setNewIsDone(false)
      toast.success('Colonne ajoutée')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  const updateLocal = (id: string, patch: Partial<EditableColumn>) =>
    setCols((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  const removeLocal = (id: string) =>
    setCols((prev) => prev.filter((c) => c.id !== id))

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={cols.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cols.map((col) => (
            <ColumnRow
              key={col.id}
              col={col}
              projectId={projectId}
              onUpdate={updateLocal}
              onDelete={removeLocal}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add new column */}
      <div className="rounded-lg border border-dashed border-border/60 p-3 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Nouvelle colonne</p>
        <div className="flex items-center gap-2">
          <div className="group relative">
            <ColorDot color={newColor} />
            <div className="absolute left-0 top-7 z-20 hidden group-hover:flex group-focus-within:flex p-2 rounded-lg border border-border/70 bg-popover shadow-lg flex-wrap gap-1.5 w-44">
              <ColorPicker value={newColor} onChange={setNewColor} />
            </div>
          </div>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom de la colonne"
            className="h-7 text-[13px] border-border/60 flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) addColumn.mutate()
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setNewIsDone(!newIsDone)}
            className={cn(
              'flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md transition-all',
              newIsDone
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            <Check className="h-3 w-3" />
            Colonne "Terminé"
          </button>
          <Button
            size="sm"
            className="h-7 text-[12px] gap-1 px-2"
            disabled={!newName.trim() || addColumn.isPending}
            onClick={() => addColumn.mutate()}
          >
            <Plus className="h-3 w-3" />
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Section: Members ─────────────────────────────────────────────────────────

function UserCombobox({
  users,
  value,
  onChange,
}: {
  users: User[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )
  const selected = users.find((u) => u.id === value)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch('') }}
        className="w-full h-8 rounded-md border border-border/70 bg-background px-2.5 text-[13px] flex items-center gap-2 text-left"
      >
        {selected ? (
          <>
            <Avatar name={selected.full_name} size="sm" />
            <span className="flex-1 truncate">{selected.full_name}</span>
          </>
        ) : (
          <span className="flex-1 text-muted-foreground/70">Sélectionner un utilisateur…</span>
        )}
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground/50 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-lg border border-border/70 bg-popover shadow-md overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border/50">
            <Search className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un utilisateur…"
              className="flex-1 text-[12px] bg-transparent outline-none placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2.5 text-[12px] text-muted-foreground/60">Aucun résultat</p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { onChange(u.id); setOpen(false); setSearch('') }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[13px] hover:bg-muted/60 transition-colors"
                >
                  <Avatar name={u.full_name} size="sm" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="truncate font-medium">{u.full_name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                  </div>
                  {value === u.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Propriétaire',
  member: 'Membre',
  viewer: 'Observateur',
}

const ROLE_CLASSES: Record<string, string> = {
  owner: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  member: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  viewer: 'bg-muted text-muted-foreground',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5', ROLE_CLASSES[role] ?? ROLE_CLASSES.viewer)}>
      {role === 'owner' && <Crown className="h-2.5 w-2.5" />}
      {ROLE_LABELS[role] ?? role}
    </span>
  )
}

function MembersSection({ project, projectId }: { project: Project; projectId: string }) {
  const qc = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'owner' | 'member' | 'viewer'>('member')

  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: ['project-members', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/members`)).data,
  })

  const { data: allUsers } = useQuery<UserListResponse>({
    queryKey: ['users-list'],
    queryFn: async () => (await api.get('/api/users', { params: { page: 1, page_size: 200 } })).data,
  })

  const memberIds = new Set(members.map((m) => m.user.id))
  const addableUsers = (allUsers?.items ?? []).filter((u) => !memberIds.has(u.id) && u.is_active)
  const ownerCount = members.filter((m) => m.role === 'owner').length

  const addMember = useMutation({
    mutationFn: () =>
      api.post(`/api/projects/${projectId}/members`, { user_id: selectedUserId, role: selectedRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      setSelectedUserId('')
      setSelectedRole('member')
      toast.success('Membre ajouté')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/api/projects/${projectId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-members', projectId] })
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Membre retiré')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  return (
    <div className="space-y-3">
      {/* Current members */}
      <div className="space-y-1.5">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/50 bg-card">
            <Avatar name={m.user.full_name} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{m.user.full_name}</p>
            </div>
            <RoleBadge role={m.role} />
            {!(m.role === 'owner' && ownerCount <= 1) && (
              <button
                onClick={() => removeMember.mutate(m.user.id)}
                disabled={removeMember.isPending}
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
              >
                <UserMinus className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add member */}
      {addableUsers.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <UserCombobox
              users={addableUsers}
              value={selectedUserId}
              onChange={setSelectedUserId}
            />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as 'owner' | 'member' | 'viewer')}
              className="h-8 rounded-md border border-border/70 bg-background px-2 text-[13px] text-foreground shrink-0"
            >
              <option value="owner">Propriétaire</option>
              <option value="member">Membre</option>
              <option value="viewer">Observateur</option>
            </select>
            <Button
              size="sm"
              className="h-8 text-[13px] gap-1 px-3 shrink-0"
              disabled={!selectedUserId || addMember.isPending}
              onClick={() => addMember.mutate()}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {selectedRole === 'owner' ? 'Propriétaire : accès complet, peut gérer les membres et les paramètres.' : selectedRole === 'viewer' ? 'Observateur : lecture seule, ne peut pas modifier les tâches.' : 'Membre : peut créer et modifier des tâches.'}
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Section: Danger Zone ─────────────────────────────────────────────────────

function DangerSection({ projectId }: { projectId: string }) {
  const router = useRouter()
  const qc = useQueryClient()
  const [confirm, setConfirm] = useState(false)

  const del = useMutation({
    mutationFn: () => api.delete(`/api/projects/${projectId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projet supprimé')
      router.replace('/projects')
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Erreur'),
  })

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
        <div>
          <p className="text-[13px] font-semibold text-destructive">Supprimer le projet</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Supprime définitivement le projet, toutes ses tâches et sprints.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[13px] border-destructive/40 text-destructive hover:bg-destructive hover:text-white shrink-0"
          onClick={() => setConfirm(true)}
        >
          Supprimer
        </Button>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[16px] flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmer la suppression
            </DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-muted-foreground">
            Cette action est <span className="font-semibold text-foreground">irréversible</span>. Le projet et toutes ses données seront définitivement supprimés.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" className="h-8 text-[13px]" onClick={() => setConfirm(false)}>
              Annuler
            </Button>
            <Button
              size="sm"
              className="h-8 text-[13px] bg-destructive hover:bg-destructive/90 text-white"
              disabled={del.isPending}
              onClick={() => del.mutate()}
            >
              {del.isPending ? 'Suppression…' : 'Supprimer définitivement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Section = 'general' | 'columns' | 'members' | 'danger'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'general', label: 'Général' },
  { id: 'columns', label: 'Colonnes' },
  { id: 'members', label: 'Membres' },
  { id: 'danger', label: 'Zone de danger' },
]

export default function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const [active, setActive] = useState<Section>('general')

  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}`)).data,
  })

  if (isLoading || !project) {
    return <div className="p-8 text-[13px] text-muted-foreground">Chargement…</div>
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar nav */}
      <div className="w-44 shrink-0 border-r border-border/50 p-3 space-y-0.5">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md text-[13px] font-medium transition-colors',
              active === s.id
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              s.id === 'danger' && active !== 'danger' && 'text-destructive/60 hover:text-destructive'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        {active === 'general' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold">Informations générales</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">Nom, description et couleur du projet.</p>
            </div>
            <GeneralSection project={project} projectId={projectId} />
          </div>
        )}

        {active === 'columns' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold">Colonnes du tableau</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Glissez pour réordonner · Modifiez le nom et la couleur de chaque colonne.
              </p>
            </div>
            <ColumnsSection project={project} projectId={projectId} />
          </div>
        )}

        {active === 'members' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold">Membres</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                Gérez qui a accès à ce projet.
              </p>
            </div>
            <MembersSection project={project} projectId={projectId} />
          </div>
        )}

        {active === 'danger' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-[15px] font-semibold text-destructive">Zone de danger</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">Actions irréversibles.</p>
            </div>
            <DangerSection projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  )
}
