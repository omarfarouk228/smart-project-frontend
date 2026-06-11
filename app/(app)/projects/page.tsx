'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  Plus, FolderKanban, Users, Calendar, Search,
  LayoutGrid, List, SlidersHorizontal, ChevronDown,
} from 'lucide-react'
import api from '@/lib/api'
import type { ProjectListResponse } from '@/types/project'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type SortKey = 'name' | 'created_at' | 'member_count'
type ViewMode = 'grid' | 'list'

export default function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('created_at')
  const [view, setView] = useState<ViewMode>('grid')
  const [showSort, setShowSort] = useState(false)

  const { data, isLoading } = useQuery<ProjectListResponse>({
    queryKey: ['projects'],
    queryFn: async () => (await api.get('/api/projects')).data,
  })

  const filtered = useMemo(() => {
    if (!data?.items) return []
    let items = [...data.items]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(p => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q))
    }
    items.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'member_count') return b.member_count - a.member_count
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return items
  }, [data, search, sort])

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'created_at', label: 'Date de création' },
    { key: 'name', label: 'Nom (A → Z)' },
    { key: 'member_count', label: 'Nombre de membres' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-[16px] font-semibold tracking-tight">Projets</h1>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {isLoading ? '…' : `${filtered.length} projet${filtered.length !== 1 ? 's' : ''}`}
            {search && ` · filtrés sur "${search}"`}
          </p>
        </div>
        <Link href="/projects/new" className={cn(buttonVariants(), 'text-[13px] h-8 gap-1.5 shrink-0')}>
          <Plus className="h-3.5 w-3.5" /> Nouveau projet
        </Link>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 border-b border-border/40 flex items-center gap-2">
        <div className="relative w-60">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
          <Input
            placeholder="Rechercher un projet…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-7 pl-8 text-[12px] bg-muted/30 border-border/50"
          />
        </div>

        <div className="relative ml-auto">
          <button
            onClick={() => setShowSort(v => !v)}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-border/60 bg-background text-[12px] text-muted-foreground hover:border-border hover:text-foreground transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {SORT_OPTIONS.find(o => o.key === sort)?.label}
            <ChevronDown className="h-3 w-3" />
          </button>
          {showSort && (
            <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-border/60 bg-popover shadow-lg py-1">
              {SORT_OPTIONS.map(o => (
                <button
                  key={o.key}
                  onClick={() => { setSort(o.key); setShowSort(false) }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 text-[12px] transition-colors',
                    sort === o.key ? 'bg-primary/10 text-primary font-medium' : 'text-foreground/80 hover:bg-muted/50'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 rounded-md border border-border/60 p-0.5">
          <button
            onClick={() => setView('grid')}
            className={cn('h-6 w-6 flex items-center justify-center rounded transition-colors', view === 'grid' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn('h-6 w-6 flex items-center justify-center rounded transition-colors', view === 'list' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading && (
          <div className={cn('gap-3', view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'flex flex-col')}>
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 rounded-xl bg-muted/30 animate-pulse" />)}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-xl border border-border/60 border-dashed bg-card/50 py-16 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-4">
              <FolderKanban className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-[15px] font-medium text-foreground">
              {search ? 'Aucun projet trouvé' : 'Aucun projet'}
            </p>
            <p className="text-[13px] text-muted-foreground mt-1 mb-5">
              {search ? `Aucun résultat pour "${search}"` : 'Créez votre premier projet pour commencer'}
            </p>
            {!search && (
              <Link href="/projects/new" className={cn(buttonVariants(), 'text-[13px] h-8 gap-1.5')}>
                <Plus className="h-3.5 w-3.5" /> Créer un projet
              </Link>
            )}
          </div>
        )}

        {/* Grid view */}
        {view === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {filtered.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group block rounded-xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all duration-150 overflow-hidden"
              >
                <div className="h-1.5" style={{ background: project.color }} />
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
                      style={{ background: project.color }}
                    >
                      {project.key}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-[12px] text-muted-foreground mt-0.5 line-clamp-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 flex-wrap">
                    {project.columns.map(col => (
                      <div
                        key={col.id}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                        style={{ background: `${col.color}18`, color: col.color }}
                      >
                        {col.name}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {project.member_count} membre{project.member_count > 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1 ml-auto">
                      <Calendar className="h-3 w-3" />
                      {new Date(project.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* List view */}
        {view === 'list' && (
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Projet</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Colonnes</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-28">Membres</th>
                  <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-32 hidden lg:table-cell">Créé le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map(project => (
                  <tr key={project.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/projects/${project.id}`} className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold text-white"
                          style={{ background: project.color }}
                        >
                          {project.key}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">{project.name}</p>
                          {project.description && (
                            <p className="text-[11px] text-muted-foreground truncate">{project.description}</p>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {project.columns.slice(0, 4).map(col => (
                          <span key={col.id} className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: `${col.color}18`, color: col.color }}>
                            {col.name}
                          </span>
                        ))}
                        {project.columns.length > 4 && <span className="text-[10px] text-muted-foreground/50">+{project.columns.length - 4}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {project.member_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-[12px] text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
