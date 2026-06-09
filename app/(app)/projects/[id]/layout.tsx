'use client'

import { use } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Kanban, List, Package, Zap, CalendarDays, GanttChartSquare } from 'lucide-react'
import api from '@/lib/api'
import type { Project } from '@/types/project'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const pathname = usePathname()

  const { data: project } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: async () => (await api.get(`/api/projects/${id}`)).data,
  })

  const tabs = [
    { href: `/projects/${id}`, label: 'Board', icon: Kanban, exact: true },
    { href: `/projects/${id}/list`, label: 'Liste', icon: List },
    { href: `/projects/${id}/backlog`, label: 'Backlog', icon: Package },
    { href: `/projects/${id}/sprints`, label: 'Sprints', icon: Zap },
    { href: `/projects/${id}/calendar`, label: 'Calendrier', icon: CalendarDays },
    { href: `/projects/${id}/roadmap`, label: 'Roadmap', icon: GanttChartSquare },
  ]

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div className="flex items-center gap-3 px-5 border-b border-border/50 bg-background shrink-0">
        <Link
          href="/projects"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7 shrink-0')}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>

        {project && (
          <div className="flex items-center gap-2 py-2.5">
            <div
              className="h-5 w-5 rounded shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
              style={{ background: project.color }}
            >
              {project.key}
            </div>
            <span className="text-[14px] font-semibold text-foreground truncate max-w-[200px]">
              {project.name}
            </span>
          </div>
        )}

        {/* Tab navigation */}
        <div className="flex items-center gap-0.5 ml-4 py-1.5">
          {tabs.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all',
                  active
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
