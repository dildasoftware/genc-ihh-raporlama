'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

const HIDE_SIDEBAR_PATHS = ['/login', '/']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  const isAuthPage = HIDE_SIDEBAR_PATHS.some(p => pathname === p)
  const showSidebar = !isAuthPage && status === 'authenticated' && !!session

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {showSidebar && (
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-border overflow-hidden">
          <Sidebar />
        </aside>
      )}
      <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}
