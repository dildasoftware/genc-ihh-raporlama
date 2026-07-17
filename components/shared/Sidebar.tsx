'use client'

import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, PlusCircle, Search, BarChart2,
  TrendingUp, Award, FileText, Bot, Archive,
  Settings, LogOut, Building2, ChevronRight, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getRoleLabel } from '@/lib/authz'
import { Role, GenderBranch } from '@prisma/client'

const navItems = [
  { href: '/panel',         label: 'Panel',             icon: LayoutDashboard, roles: ['ALL'],        section: 'main' },
  { href: '/veri-girisi',   label: 'Veri Girişi',       icon: PlusCircle,      roles: ['IL_KOORDINATOR','ADMIN'], section: 'main' },
  { href: '/faaliyetler',   label: 'Faaliyet Kayıtları',icon: ClipboardList,   roles: ['ALL'],        section: 'main' },
  { href: '/karne',         label: 'Karne',             icon: Award,           roles: ['ALL'], section: 'analyze' },
  { href: '/trend',         label: 'Trend',             icon: TrendingUp,      roles: ['MERKEZ_BIRIM_BASKANI','ADMIN'], section: 'analyze' },
  { href: '/karsilastir',   label: 'Karşılaştır',       icon: BarChart2,       roles: ['MERKEZ_BIRIM_BASKANI','ADMIN'], section: 'analyze' },
  { href: '/haftalik-rapor',label: 'Haftalık Rapor',    icon: FileText,        roles: ['MERKEZ_BIRIM_BASKANI','ADMIN'], section: 'reports' },
  { href: '/ai-analiz',     label: 'AI Analiz',         icon: Bot,             roles: ['IL_KOORDINATOR','MERKEZ_BIRIM_BASKANI','ADMIN'], section: 'reports' },
  { href: '/arsiv',         label: 'Arşiv',             icon: Archive,         roles: ['ALL'], section: 'reports' },
  { href: '/yonetim',       label: 'Yönetim',           icon: Settings,        roles: ['ADMIN'], section: 'admin' },
]

const sectionLabels: Record<string, string> = {
  main: 'ANA MENÜ',
  analyze: 'ANALİZ',
  reports: 'RAPORLAR',
  admin: 'SİSTEM',
}

export default function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const userRole = (session?.user as any)?.role as Role | undefined
  const genderBranch = (session?.user as any)?.genderBranch as GenderBranch | null

  const visibleItems = navItems.filter(item =>
    item.roles.includes('ALL') || (userRole && item.roles.includes(userRole))
  ).map(item => {
    if (item.href === '/karne' && userRole === 'IL_KOORDINATOR') {
      return { ...item, label: 'Performans & Analiz' }
    }
    return item
  })

  const sections = ['main', 'analyze', 'reports', 'admin'].filter(s =>
    visibleItems.some(i => i.section === s)
  )

  const genderColor = genderBranch === 'K' ? '#BE185D' : genderBranch === 'E' ? '#3B82F6' : '#16A34A'
  const genderLabel = genderBranch === 'K' ? 'Kadın Kolu' : genderBranch === 'E' ? 'Erkek Kolu' : ''

  return (
    <div className="flex flex-col h-full" style={{ background: '#0F1923' }}>
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1B4E6B, #16A34A)' }}>
            <span className="text-white font-bold text-sm tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Gİ</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>GENÇ İHH</p>
            <p className="text-xs leading-tight" style={{ color: 'rgba(203,213,225,0.5)' }}>Raporlama Sistemi</p>
          </div>
        </div>
      </div>

      {/* User Card */}
      {session?.user && (
        <div className="mx-3 mt-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${genderColor}80, ${genderColor})` }}>
              {(session.user.name ?? 'U')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: '#E2E8F0' }}>
                {session.user.name}
              </p>
              <p className="text-xs truncate" style={{ color: 'rgba(203,213,225,0.5)', fontSize: '0.65rem' }}>
                {userRole ? getRoleLabel(userRole) : ''}
                {genderLabel && <span style={{ color: genderColor }}> · {genderLabel}</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {sections.map(section => {
          const items = visibleItems.filter(i => i.section === section)
          return (
            <div key={section} className="mb-3">
              <p className="px-2 mb-1.5 text-xs font-semibold tracking-wider" style={{ color: 'rgba(203,213,225,0.3)', fontSize: '0.6rem' }}>
                {sectionLabels[section]}
              </p>
              {items.map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn('nav-item', isActive && 'active')}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-xs">{item.label}</span>
                    {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Signout */}
      <div className="p-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="nav-item w-full text-left group"
        >
          <LogOut className="h-4 w-4 shrink-0 group-hover:text-red-400 transition-colors" />
          <span className="text-xs group-hover:text-red-400 transition-colors">Çıkış Yap</span>
        </button>
      </div>
    </div>
  )
}
