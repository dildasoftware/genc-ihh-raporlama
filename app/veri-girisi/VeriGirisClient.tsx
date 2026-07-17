'use client'

import { useState } from 'react'
import { ClipboardList, Building2 } from 'lucide-react'
import HaftalikSoruFormu from './HaftalikSoruFormu'
import IlKunyesi from './IlKunyesi'
import type { SessionUser } from '@/lib/authz'

interface Props {
  user: SessionUser
  currentPeriod: any
  periods: any[]
  provinces: { id: number; name: string }[]
  currentYear: number
}

const TABS = [
  {
    key: 'haftalik' as const,
    label: 'Haftalık Rapor',
    icon: ClipboardList,
    hint: 'Bu haftanın soruları — her kurumu tek tek ekleyin, lokasyon ve katılım otomatik hesaplanır.',
  },
  {
    key: 'kunye' as const,
    label: 'İl Künyesi',
    icon: Building2,
    hint: 'Yılda bir doldurulur — nüfus, kurum sayıları, teşkilat kadrosu ve dönem hedefleri.',
  },
]

export default function VeriGirisClient(props: Props) {
  const [tab, setTab] = useState<'haftalik' | 'kunye'>('haftalik')
  const active = TABS.find(t => t.key === tab)!

  return (
    <div className="p-5 max-w-6xl mx-auto min-w-0 w-full">
      <div className="mb-5">
        <h1
          className="text-2xl font-bold gradient-text mb-3"
          style={{ fontFamily: 'Outfit, sans-serif' }}
        >
          Veri Girişi
        </h1>

        <div className="flex rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 p-1 w-fit">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === t.key
                    ? 'bg-white shadow-sm text-primary'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{active.hint}</p>
      </div>

      {tab === 'haftalik' ? (
        <HaftalikSoruFormu
          user={props.user}
          provinces={props.provinces}
          periods={props.periods}
          currentPeriod={props.currentPeriod}
        />
      ) : (
        <IlKunyesi
          user={props.user}
          provinces={props.provinces}
          year={props.currentYear}
        />
      )}
    </div>
  )
}
