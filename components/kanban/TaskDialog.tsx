'use client'

import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Trash2, Plus, Check, Send, Pencil, X, Clock, Timer,
} from 'lucide-react'
import api from '@/lib/api'
import type { Task, TaskDetail, Priority, SubTask, Comment, TimeEntry } from '@/types/task'
import type { ProjectMember } from '@/types/project'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Faible', color: '#94a3b8' },
  { value: 'medium', label: 'Moyenne', color: '#3b82f6' },
  { value: 'high', label: 'Haute', color: '#f97316' },
  { value: 'urgent', label: 'Urgente', color: '#ef4444' },
]

function formatMinutes(minutes: number): string {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function hoursToMinutes(val: string): number | null {
  const n = parseFloat(val)
  if (isNaN(n) || n <= 0) return null
  return Math.round(n * 60)
}

function Avatar({ name, size = 'sm' }: { name: string; size?: 'xs' | 'sm' | 'md' }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const colors = [
    'from-violet-500 to-indigo-500', 'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500',
  ]
  const sz = { xs: 'h-5 w-5 text-[8px]', sm: 'h-6 w-6 text-[9px]', md: 'h-8 w-8 text-[11px]' }[size]
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${colors[name.charCodeAt(0) % colors.length]} flex items-center justify-center font-semibold text-white shrink-0`}>
      {initials}
    </div>
  )
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function renderWithMentions(content: string, members: ProjectMember[]): React.ReactNode[] {
  const parts = content.split(/(@\[[0-9a-f-]{36}\])/g)
  return parts.map((part, i) => {
    const match = part.match(/^@\[([0-9a-f-]{36})\]$/)
    if (match) {
      const member = members.find((m) => m.user.id === match[1])
      return (
        <span key={i} className="text-primary font-medium">
          @{member ? member.user.full_name : 'utilisateur'}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function SubTaskItem({ subtask, projectId, taskId }: { subtask: SubTask; projectId: string; taskId: string }) {
  const qc = useQueryClient()
  const toggle = useMutation({
    mutationFn: () =>
      api.patch(`/api/projects/${projectId}/tasks/${taskId}/subtasks/${subtask.id}`, {
        is_done: !subtask.is_done,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-detail', taskId] }),
  })
  const remove = useMutation({
    mutationFn: () =>
      api.delete(`/api/projects/${projectId}/tasks/${taskId}/subtasks/${subtask.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-detail', taskId] })
      qc.invalidateQueries({ queryKey: ['board', projectId] })
    },
  })
  return (
    <div className="flex items-center gap-2 group py-1">
      <button
        onClick={() => toggle.mutate()}
        className={cn(
          'h-4 w-4 rounded border shrink-0 flex items-center justify-center transition-all',
          subtask.is_done ? 'border-primary bg-primary text-white' : 'border-border/70 hover:border-primary'
        )}
      >
        {subtask.is_done && <Check className="h-2.5 w-2.5" />}
      </button>
      <span className={cn('text-[13px] flex-1', subtask.is_done && 'line-through text-muted-foreground')}>
        {subtask.title}
      </span>
      <button
        onClick={() => remove.mutate()}
        className="h-5 w-5 flex items-center justify-center rounded text-transparent group-hover:text-muted-foreground/40 hover:!text-destructive transition-all"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

function TimeEntryItem({
  entry, projectId, taskId, currentUserId,
}: { entry: TimeEntry; projectId: string; taskId: string; currentUserId: string }) {
  const qc = useQueryClient()
  const remove = useMutation({
    mutationFn: () =>
      api.delete(`/api/projects/${projectId}/tasks/${taskId}/time-entries/${entry.id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['task-detail', taskId] }),
    onError: () => toast.error('Accès refusé'),
  })
  return (
    <div className="flex items-center gap-2 group py-0.5">
      <Avatar name={entry.user.full_name} size="xs" />
      <span className="text-[11px] text-muted-foreground flex-1 min-w-0">
        <span className="text-foreground/80 font-medium">{formatMinutes(entry.minutes)}</span>
        {entry.description && (
          <span className="ml-1 text-muted-foreground/60 truncate">— {entry.description}</span>
        )}
      </span>
      <span className="text-[10px] text-muted-foreground/40 shrink-0">{timeAgo(entry.logged_at)}</span>
      {entry.user.id === currentUserId && (
        <button
          onClick={() => remove.mutate()}
          className="h-4 w-4 flex items-center justify-center rounded text-transparent group-hover:text-muted-foreground/40 hover:!text-destructive transition-all shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

function CommentItem({
  comment, currentUserId, projectId, taskId, members,
}: {
  comment: Comment
  currentUserId: string
  projectId: string
  taskId: string
  members: ProjectMember[]
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(comment.content)

  const update = useMutation({
    mutationFn: () =>
      api.patch(`/api/projects/${projectId}/tasks/${taskId}/comments/${comment.id}`, { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-detail', taskId] }); setEditing(false) },
    onError: () => toast.error('Erreur'),
  })
  const remove = useMutation({
    mutationFn: () =>
      api.delete(`/api/projects/${projectId}/tasks/${taskId}/comments/${comment.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-detail', taskId] })
      qc.invalidateQueries({ queryKey: ['board', projectId] })
    },
    onError: () => toast.error('Erreur'),
  })

  return (
    <div className="flex gap-2.5 group">
      <Avatar name={comment.user.full_name} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] font-semibold">{comment.user.first_name}</span>
          <span className="text-[11px] text-muted-foreground/50">{timeAgo(comment.created_at)}</span>
          {comment.user.id === currentUserId && (
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setEditing(true)}
                className="text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                onClick={() => remove.mutate()}
                className="text-muted-foreground/50 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="mt-1 space-y-1.5">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-border/70 bg-background px-2 py-1.5 text-[13px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <div className="flex gap-1.5">
              <Button size="sm" className="h-6 text-[11px]" onClick={() => update.mutate()} disabled={update.isPending}>
                Enregistrer
              </Button>
              <Button
                size="sm" variant="ghost" className="h-6 text-[11px]"
                onClick={() => { setEditing(false); setContent(comment.content) }}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-foreground/90 mt-0.5 whitespace-pre-wrap">
            {renderWithMentions(comment.content, members)}
          </p>
        )}
      </div>
    </div>
  )
}

interface TaskDialogProps {
  task: Task | null
  projectId: string
  open: boolean
  onClose: () => void
}

export function TaskDialog({ task, projectId, open, onClose }: TaskDialogProps) {
  const qc = useQueryClient()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [dueDate, setDueDate] = useState('')
  const [estimatedHours, setEstimatedHours] = useState('')
  const [newSubtask, setNewSubtask] = useState('')
  const [newComment, setNewComment] = useState('')
  const [showLogTime, setShowLogTime] = useState(false)
  const [logHours, setLogHours] = useState('')
  const [logNote, setLogNote] = useState('')
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStart, setMentionStart] = useState(-1)
  const [showMention, setShowMention] = useState(false)

  const currentUser =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('st_user') ?? '{}')
      : {}

  useEffect(() => {
    if (task) {
      setTitle(task.title)
      setDescription(task.description ?? '')
      setPriority(task.priority)
      setAssigneeId(task.assignee?.id ?? '')
      setDueDate(task.due_date ?? '')
      setEstimatedHours(
        task.estimated_minutes ? (task.estimated_minutes / 60).toString() : ''
      )
    }
  }, [task])

  const { data: detail } = useQuery<TaskDetail>({
    queryKey: ['task-detail', task?.id],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/tasks/${task!.id}`)).data,
    enabled: open && !!task,
  })

  const { data: members = [] } = useQuery<ProjectMember[]>({
    queryKey: ['project-members', projectId],
    queryFn: async () => (await api.get(`/api/projects/${projectId}/members`)).data,
    enabled: open,
  })

  const update = useMutation({
    mutationFn: () =>
      api.patch(`/api/projects/${projectId}/tasks/${task!.id}`, {
        title,
        description: description || null,
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
        estimated_minutes: hoursToMinutes(estimatedHours),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', projectId] })
      qc.invalidateQueries({ queryKey: ['task-detail', task!.id] })
      toast.success('Tâche mise à jour')
      onClose()
    },
    onError: () => toast.error('Erreur'),
  })

  const remove = useMutation({
    mutationFn: () => api.delete(`/api/projects/${projectId}/tasks/${task!.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board', projectId] })
      toast.success('Tâche supprimée')
      onClose()
    },
  })

  const addSubtask = useMutation({
    mutationFn: () =>
      api.post(`/api/projects/${projectId}/tasks/${task!.id}/subtasks`, { title: newSubtask }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-detail', task!.id] })
      qc.invalidateQueries({ queryKey: ['board', projectId] })
      setNewSubtask('')
    },
    onError: () => toast.error('Erreur'),
  })

  const addComment = useMutation({
    mutationFn: () =>
      api.post(`/api/projects/${projectId}/tasks/${task!.id}/comments`, { content: newComment }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-detail', task!.id] })
      qc.invalidateQueries({ queryKey: ['board', projectId] })
      setNewComment('')
    },
    onError: () => toast.error('Erreur'),
  })

  const addTimeEntry = useMutation({
    mutationFn: () =>
      api.post(`/api/projects/${projectId}/tasks/${task!.id}/time-entries`, {
        minutes: hoursToMinutes(logHours) ?? 0,
        description: logNote || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-detail', task!.id] })
      setLogHours('')
      setLogNote('')
      setShowLogTime(false)
      toast.success('Temps enregistré')
    },
    onError: () => toast.error('Erreur'),
  })

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setNewComment(val)
    const cursor = e.target.selectionStart ?? val.length
    const before = val.slice(0, cursor)
    const match = before.match(/@([^\s\[\]]*)$/)
    if (match) {
      setMentionQuery(match[1])
      setMentionStart(cursor - match[0].length)
      setShowMention(true)
    } else {
      setShowMention(false)
    }
  }

  const insertMention = (member: ProjectMember) => {
    const mention = `@[${member.user.id}]`
    const before = newComment.slice(0, mentionStart)
    const after = newComment.slice(mentionStart + 1 + mentionQuery.length)
    setNewComment(before + mention + ' ' + after)
    setShowMention(false)
    setMentionStart(-1)
    setMentionQuery('')
    commentRef.current?.focus()
  }

  const filteredMembers = members
    .filter(
      (m) =>
        mentionQuery === '' ||
        m.user.full_name.toLowerCase().includes(mentionQuery.toLowerCase())
    )
    .slice(0, 5)

  if (!task) return null

  const doneCount = detail?.subtasks?.filter((s) => s.is_done).length ?? 0
  const totalCount = detail?.subtasks?.length ?? 0
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0
  const loggedMin = detail?.time_entries?.reduce((acc, e) => acc + e.minutes, 0) ?? 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden max-h-[90vh]">
        <div className="flex h-full max-h-[90vh]">

          {/* ── Left ───────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 border-r border-border/50">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-[17px] font-semibold bg-transparent border-0 outline-none placeholder:text-muted-foreground/40"
              placeholder="Titre de la tâche"
            />

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ajouter une description…"
                rows={4}
                className="w-full rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[13px] placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Subtasks */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Sous-tâches {totalCount > 0 && `(${doneCount}/${totalCount})`}
              </p>
              {totalCount > 0 && (
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${progress}%` }} />
                </div>
              )}
              <div className="space-y-0.5">
                {detail?.subtasks?.map((s) => (
                  <SubTaskItem key={s.id} subtask={s} projectId={projectId} taskId={task.id} />
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Ajouter une sous-tâche…"
                  className="h-7 text-[12px] border-border/60"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSubtask.trim()) addSubtask.mutate()
                  }}
                />
                <Button
                  size="sm" variant="outline" className="h-7 w-7 p-0 shrink-0"
                  disabled={!newSubtask.trim() || addSubtask.isPending}
                  onClick={() => addSubtask.mutate()}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Commentaires {detail?.comments?.length ? `(${detail.comments.length})` : ''}
              </p>
              <div className="space-y-4">
                {detail?.comments?.map((c) => (
                  <CommentItem
                    key={c.id}
                    comment={c}
                    currentUserId={currentUser?.id ?? ''}
                    projectId={projectId}
                    taskId={task.id}
                    members={members}
                  />
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <div className="flex-1 relative">
                  <textarea
                    ref={commentRef}
                    value={newComment}
                    onChange={handleCommentChange}
                    placeholder="Écrire un commentaire… (@mention)"
                    rows={2}
                    className="w-full rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-[13px] placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { setShowMention(false); return }
                      if (e.key === 'Enter' && !e.shiftKey && !showMention && newComment.trim()) {
                        e.preventDefault()
                        addComment.mutate()
                      }
                    }}
                  />
                  {showMention && filteredMembers.length > 0 && (
                    <div className="absolute bottom-full mb-1 left-0 w-56 rounded-lg border border-border bg-popover shadow-lg z-50 overflow-hidden">
                      {filteredMembers.map((m) => (
                        <button
                          key={m.user.id}
                          onMouseDown={(e) => { e.preventDefault(); insertMention(m) }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-muted transition-colors"
                        >
                          <Avatar name={m.user.full_name} size="xs" />
                          <span className="text-[12px]">{m.user.full_name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  size="sm" variant="outline" className="h-9 w-9 p-0 shrink-0 self-end"
                  disabled={!newComment.trim() || addComment.isPending}
                  onClick={() => addComment.mutate()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* ── Right — metadata ──────────────────────────────────────── */}
          <div className="w-56 shrink-0 p-4 space-y-5 overflow-y-auto">

            {/* Priority */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Priorité</p>
              <div className="space-y-1">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] font-medium transition-all',
                      priority === p.value ? 'text-white' : 'text-muted-foreground hover:bg-muted'
                    )}
                    style={priority === p.value ? { background: p.color } : {}}
                  >
                    <div
                      className="h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: priority === p.value ? 'white' : p.color }}
                    />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assigné à</p>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full h-8 rounded-md border border-border/70 bg-background px-2 text-[12px]"
              >
                <option value="">Non assigné</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>{m.user.full_name}</option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Échéance</p>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-[12px] border-border/70"
              />
            </div>

            {/* Time tracking */}
            <div className="space-y-2.5 border-t border-border/40 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Temps
              </p>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground/60">Estimation (h)</p>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="ex: 2.5"
                  className="h-7 text-[12px] border-border/60"
                />
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground/60">Logué</p>
                <p className="text-[12px] font-medium text-foreground/80">{formatMinutes(loggedMin)}</p>
              </div>
              {detail?.time_entries && detail.time_entries.length > 0 && (
                <div className="space-y-1 border-t border-border/30 pt-2">
                  {detail.time_entries.map((e) => (
                    <TimeEntryItem
                      key={e.id}
                      entry={e}
                      projectId={projectId}
                      taskId={task.id}
                      currentUserId={currentUser?.id ?? ''}
                    />
                  ))}
                </div>
              )}
              {showLogTime ? (
                <div className="space-y-1.5 border border-border/50 rounded-lg p-2.5">
                  <Input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={logHours}
                    onChange={(e) => setLogHours(e.target.value)}
                    placeholder="Heures (ex: 1.5)"
                    className="h-7 text-[12px] border-border/60"
                    autoFocus
                  />
                  <Input
                    value={logNote}
                    onChange={(e) => setLogNote(e.target.value)}
                    placeholder="Note (optionnel)"
                    className="h-7 text-[12px] border-border/60"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && logHours) addTimeEntry.mutate()
                      if (e.key === 'Escape') setShowLogTime(false)
                    }}
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm" className="h-6 text-[11px] flex-1"
                      disabled={!logHours || addTimeEntry.isPending}
                      onClick={() => addTimeEntry.mutate()}
                    >
                      Ajouter
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowLogTime(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowLogTime(true)}
                  className="w-full flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors py-0.5"
                >
                  <Timer className="h-3 w-3" />
                  Ajouter du temps
                </button>
              )}
            </div>

            {/* Reporter */}
            {task.reporter && (
              <div className="space-y-1.5 border-t border-border/40 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Rapporteur</p>
                <div className="flex items-center gap-1.5">
                  <Avatar name={task.reporter.full_name} size="xs" />
                  <span className="text-[12px] text-muted-foreground">{task.reporter.first_name}</span>
                </div>
              </div>
            )}

            <div className="pt-1 border-t border-border/40">
              <p className="text-[10px] text-muted-foreground/40">
                Créé le{' '}
                {new Date(task.created_at).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </p>
            </div>

            <div className="space-y-2">
              <Button
                onClick={() => update.mutate()}
                disabled={update.isPending}
                className="w-full text-[12px] h-8"
              >
                {update.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
              <button
                onClick={() => remove.mutate()}
                className="w-full flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground hover:text-destructive transition-colors py-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
