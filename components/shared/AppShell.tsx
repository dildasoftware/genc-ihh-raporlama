'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import Sidebar from './Sidebar'

const HIDE_SIDEBAR_PATHS = ['/login', '/']

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Sayfa değiştiğinde mobil menüyü kapat
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const isAuthPage = HIDE_SIDEBAR_PATHS.some(p => pathname === p)
  const showSidebar = !isAuthPage && status === 'authenticated' && !!session

  return (
    <div className="app-shell flex h-screen overflow-hidden bg-background relative">
      {showSidebar && (
        <>
          {/* Mobile Header */}
          <div className="md:hidden absolute top-0 left-0 right-0 h-14 border-b border-border bg-background flex items-center px-4 z-40 justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#1B4E6B] to-[#16A34A] shadow-md">
                <span className="text-white font-bold text-xs tracking-tight">Gİ</span>
              </div>
              <span className="font-bold text-sm">GENÇ İHH</span>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -mr-2 text-muted-foreground hover:text-foreground"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Desktop Sidebar */}
          <aside className="print-hide-shell hidden md:flex w-56 shrink-0 flex-col border-r border-border overflow-hidden z-30">
            <Sidebar />
          </aside>

          {/* Mobile Sidebar Overlay */}
          {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex">
              <div 
                className="fixed inset-0 bg-black/60 transition-opacity backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
              <aside className="relative w-64 max-w-[80%] flex-col flex h-full shadow-2xl z-50 animate-in slide-in-from-left duration-300">
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute right-4 top-4 text-white/50 hover:text-white p-1 z-50"
                >
                  <X size={24} />
                </button>
                <div className="flex-1 overflow-hidden">
                  <Sidebar />
                </div>
              </aside>
            </div>
          )}
        </>
      )}
      
      {/* Main Content */}
      <main className={`app-main flex-1 overflow-y-auto overflow-x-hidden min-w-0 ${showSidebar ? 'mt-14 md:mt-0' : ''}`}>
        {children}
      </main>
    </div>
  )
}
