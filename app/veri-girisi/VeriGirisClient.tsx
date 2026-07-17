'use client'

import { useState } from 'react'
import { ClipboardList, BarChart3 } from 'lucide-react'
import VeriGirisForm from './VeriGirisForm'
import SoruFormu from './SoruFormu'
import type { SessionUser } from '@/lib/authz'

interface Props {
  user: SessionUser
  currentPeriod: any
  periods: any[]
  institutions: any[]
  activityTypes: any[]
  units: any[]
  recentActivities: any[]
  provinces: { id: number; name: string }[]
  currentYear: number
}

export default function VeriGirisClient(props: Props) {
  const [mode, setMode] = useState<'faaliyet' | 'rapor'>('rapor')

  return (
    <div className="p-5 max-w-7xl mx-auto min-w-0 w-full">
      {/* Mod Seçimi */}
      <div className="mb-6">
        <div className="flex rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50 p-1 w-fit">
          <button
            onClick={() => setMode('rapor')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'rapor'
                ? 'bg-white shadow-sm text-primary'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            İl Rapor Verisi
          </button>
          <button
            onClick={() => setMode('faaliyet')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              mode === 'faaliyet'
                ? 'bg-white shadow-sm text-primary'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Haftalık Faaliyet Girişi
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {mode === 'rapor'
            ? '📊 İl bazında detaylı kurum verileri girin — hangi üniversitede, hangi lisede, kaç kişiyle ne yapıldığı'
            : '📝 Haftalık faaliyet kaydı girin — tek tek faaliyet ekleme'}
        </p>
      </div>

      {/* İçerik */}
      {mode === 'rapor' ? (
        <SoruFormu
          user={props.user}
          provinces={props.provinces}
          year={props.currentYear}
        />
      ) : (
        <VeriGirisForm
          user={props.user}
          currentPeriod={props.currentPeriod}
          periods={props.periods}
          institutions={props.institutions}
          activityTypes={props.activityTypes}
          units={props.units}
          recentActivities={props.recentActivities}
        />
      )}
    </div>
  )
}
