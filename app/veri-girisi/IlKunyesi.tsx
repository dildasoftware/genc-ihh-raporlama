'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Loader2, Save, MapPin, Target, Shield, CheckCircle2, XCircle, Building2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { SessionUser } from '@/lib/authz'

/**
 * İl Künyesi — YILLIK statik veriler.
 *
 * Haftalık faaliyet verisi burada DEĞİL: o, soru formundan Activity tablosuna
 * yazılır. Burası ilin değişmeyen bağlamı (nüfus, kurum sayıları, teşkilat
 * kadrosu, dönem hedefleri) — karnede hedef/gerçekleşme kıyası için kullanılır.
 */

const DISTRICTS_MAP: Record<string, string[]> = {
  'Ankara': ['Çankaya', 'Keçiören', 'Yenimahalle', 'Mamak', 'Etimesgut', 'Sincan', 'Altındağ', 'Pursaklar'],
  'İstanbul': ['Fatih', 'Üsküdar', 'Kadıköy', 'Pendik', 'Ümraniye', 'Esenyurt', 'Bağcılar', 'Beşiktaş'],
  'Konya': ['Selçuklu', 'Meram', 'Karatay', 'Ereğli', 'Akşehir', 'Beyşehir'],
  'Bursa': ['Osmangazi', 'Nilüfer', 'Yıldırım', 'İnegöl', 'Gemlik', 'Mudanya'],
  'İzmir': ['Konak', 'Karşıyaka', 'Buca', 'Bornova', 'Bayraklı', 'Çiğli'],
  'Kocaeli': ['İzmit', 'Gebze', 'Darıca', 'Gölcük', 'Körfez', 'Kartepe'],
  'Gaziantep': ['Şahinbey', 'Şehitkamil', 'Nizip', 'İslahiye'],
  'Kayseri': ['Melikgazi', 'Kocasinan', 'Talas', 'Develi'],
  'Trabzon': ['Ortahisar', 'Akçaabat', 'Araklı', 'Of'],
  'Samsun': ['İlkadım', 'Atakum', 'Bafra', 'Çarşamba'],
  'Erzurum': ['Yakutiye', 'Palandöken', 'Aziziye', 'Oltu'],
  'Van': ['İpekyolu', 'Tuşba', 'Edremit', 'Erciş']
}

interface OrgStatus {
  ilBaskani: boolean; teskilatBsk: boolean; egitimBsk: boolean; universiteBsk: boolean
  liseBsk: boolean; ortaokulBsk: boolean; ihhCocukBsk: boolean; tanitimMedya: boolean
  projeFonBsk: boolean; sosyalFaal: boolean; atomBsk: boolean; aktifGenclik: boolean
}

interface DistrictDetail {
  name: string
  hasIhh: boolean
  hasGencIhh: boolean
}

interface Targets {
  teskilatHedefi: number; ilceHedefi: number; fakulteBaskanHedefi: number
  liseTemsilciHedefi: number; fontHedefi?: number; fonHedefi?: number
}

const ORG_POSITIONS: { key: keyof OrgStatus; label: string }[] = [
  { key: 'ilBaskani', label: 'İl Başkanı' },
  { key: 'teskilatBsk', label: 'Teşkilat Bşk.' },
  { key: 'egitimBsk', label: 'Eğitim Bşk.' },
  { key: 'universiteBsk', label: 'Üniversite Bşk.' },
  { key: 'liseBsk', label: 'Lise Bşk.' },
  { key: 'ortaokulBsk', label: 'Ortaokul Bşk.' },
  { key: 'ihhCocukBsk', label: 'İHH Çocuk Bşk.' },
  { key: 'tanitimMedya', label: 'Tanıtım Medya' },
  { key: 'projeFonBsk', label: 'Proje Fon Bşk.' },
  { key: 'sosyalFaal', label: 'Sosyal Faal.' },
  { key: 'atomBsk', label: 'ATOM Bşk.' },
  { key: 'aktifGenclik', label: 'Aktif Gençlik' },
]

const DEFAULT_ORG: OrgStatus = {
  ilBaskani: false, teskilatBsk: false, egitimBsk: false, universiteBsk: false,
  liseBsk: false, ortaokulBsk: false, ihhCocukBsk: false, tanitimMedya: false,
  projeFonBsk: false, sosyalFaal: false, atomBsk: false, aktifGenclik: false,
}

const DEFAULT_TARGETS: Targets = {
  teskilatHedefi: 0, ilceHedefi: 0, fakulteBaskanHedefi: 0, liseTemsilciHedefi: 0, fonHedefi: 0,
}

interface FormState {
  population: number
  districtCount: number
  studentCount: number
  universityCount: number
  highSchoolCount: number
  middleSchoolCount: number
  kykCount: number
  dormCount: number
  orgStatus: OrgStatus
  orgNames: Record<string, string>
  totalDistrictCount: number
  ihhDistrictCount: number
  gencIhhDistrictCount: number
  districtDetails: DistrictDetail[]
  targets: Targets
}

const EMPTY: FormState = {
  population: 0, districtCount: 0, studentCount: 0,
  universityCount: 0, highSchoolCount: 0, middleSchoolCount: 0, kykCount: 0, dormCount: 0,
  orgStatus: { ...DEFAULT_ORG },
  orgNames: {},
  totalDistrictCount: 0, ihhDistrictCount: 0, gencIhhDistrictCount: 0,
  districtDetails: [],
  targets: { ...DEFAULT_TARGETS },
}

export default function IlKunyesi({
  user,
  provinces,
  year,
}: {
  user: SessionUser
  provinces: { id: number; name: string }[]
  year: number
}) {
  const [provinceId, setProvinceId] = useState(user.provinceId ?? provinces[0]?.id ?? 0)
  const [selectedYear, setSelectedYear] = useState(year)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newDistrictName, setNewDistrictName] = useState('')

  const handleToggleDistrict = (index: number, key: 'hasIhh' | 'hasGencIhh') => {
    const list = [...form.districtDetails]
    list[index] = {
      ...list[index],
      [key]: !list[index][key]
    }
    
    if (key === 'hasGencIhh' && list[index].hasGencIhh) {
      list[index].hasIhh = true
    }

    const ihhCount = list.filter(d => d.hasIhh).length
    const gencIhhCount = list.filter(d => d.hasGencIhh).length

    setForm(p => ({
      ...p,
      districtDetails: list,
      totalDistrictCount: list.length,
      ihhDistrictCount: ihhCount,
      gencIhhDistrictCount: gencIhhCount,
      districtCount: list.length
    }))
  }

  const handleAddDistrict = () => {
    if (!newDistrictName.trim()) return
    if (form.districtDetails.some(d => d.name.toLowerCase() === newDistrictName.trim().toLowerCase())) {
      toast.error('Bu ilçe zaten ekli')
      return
    }
    const newDistrict = { name: newDistrictName.trim(), hasIhh: false, hasGencIhh: false }
    const list = [...form.districtDetails, newDistrict]
    
    setForm(p => ({
      ...p,
      districtDetails: list,
      totalDistrictCount: list.length,
      districtCount: list.length
    }))
    setNewDistrictName('')
    toast.success('İlçe eklendi')
  }

  useEffect(() => {
    if (!provinceId) return
    setIsLoading(true)
    fetch(`/api/province-report?provinceId=${provinceId}&year=${selectedYear}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const provinceName = provinces.find(p => p.id === provinceId)?.name ?? ''
        const defaultDistricts = (DISTRICTS_MAP[provinceName] ?? []).map(name => ({
          name, hasIhh: false, hasGencIhh: false
        }))
        setForm(d ? {
          population: d.population ?? 0,
          districtCount: d.districtCount ?? 0,
          studentCount: d.studentCount ?? 0,
          universityCount: d.universityCount ?? 0,
          highSchoolCount: d.highSchoolCount ?? 0,
          middleSchoolCount: d.middleSchoolCount ?? 0,
          kykCount: d.kykCount ?? 0,
          dormCount: d.dormCount ?? 0,
          orgStatus: d.orgStatus ?? { ...DEFAULT_ORG },
          orgNames: d.orgNames ?? {},
          totalDistrictCount: d.totalDistrictCount ?? defaultDistricts.length,
          ihhDistrictCount: d.ihhDistrictCount ?? 0,
          gencIhhDistrictCount: d.gencIhhDistrictCount ?? 0,
          districtDetails: d.districtDetails ?? defaultDistricts,
          targets: d.targets ?? { ...DEFAULT_TARGETS },
        } : {
          ...EMPTY,
          totalDistrictCount: defaultDistricts.length,
          districtDetails: defaultDistricts
        })
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [provinceId, selectedYear, provinces])

  async function handleSave() {
    if (!provinceId) return toast.error('İl seçiniz')
    setIsSaving(true)
    try {
      const res = await fetch('/api/province-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provinceId, year: selectedYear, ...form }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Kayıt başarısız')
      toast.success('İl künyesi kaydedildi')
    } catch (e: any) {
      toast.error('Kayıt hatası', { description: e.message })
    } finally {
      setIsSaving(false)
    }
  }

  const provinceName = provinces.find(p => p.id === provinceId)?.name ?? 'İl seçiniz'
  const activeOrgCount = Object.values(form.orgStatus).filter(Boolean).length

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin mb-3" style={{ color: '#1B4E6B' }} />
        <p className="text-sm text-slate-500">İl künyesi yükleniyor…</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Kapsam */}
      <div className="filter-bar flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">İl</label>
          <select
            value={provinceId}
            onChange={e => setProvinceId(parseInt(e.target.value))}
            disabled={user.role === 'IL_KOORDINATOR'}
            className="h-9 px-2.5 text-sm border border-slate-200 rounded-lg bg-white
                       focus:ring-2 focus:ring-primary/25 outline-none disabled:bg-slate-50"
          >
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Dönem</label>
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(parseInt(e.target.value))}
            className="h-9 px-2.5 text-sm border border-slate-200 rounded-lg bg-white
                       focus:ring-2 focus:ring-primary/25 outline-none"
          >
            {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}-{y + 1}</option>)}
          </select>
        </div>
        <p className="text-xs text-slate-400 flex-1 min-w-[220px]">
          Bu sayfa ilin <strong>yıllık sabit bilgileridir</strong>. Haftalık faaliyetler
          &quot;Haftalık Rapor&quot; sekmesinden girilir.
        </p>
      </div>

      {/* İl genel verileri */}
      <Card className="premium-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" style={{ color: '#1B4E6B' }} />
            İl Genel Verileri — {provinceName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {([
              { label: 'Nüfus', key: 'population', icon: '👥' },
              { label: 'İlçe Sayısı', key: 'districtCount', icon: '📍' },
              { label: 'Öğrenci Sayısı', key: 'studentCount', icon: '🎓' },
              { label: 'Üniversite Sayısı', key: 'universityCount', icon: '🏛️' },
              { label: 'Lise Sayısı', key: 'highSchoolCount', icon: '🏫' },
              { label: 'Ortaokul Sayısı', key: 'middleSchoolCount', icon: '📚' },
              { label: 'KYK Sayısı', key: 'kykCount', icon: '🏘️' },
              { label: 'Yurt Sayısı', key: 'dormCount', icon: '🏠' },
            ] as const).map(item => (
              <div key={item.key} className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <span>{item.icon}</span> {item.label}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={form[item.key] || ''}
                  onChange={e => setForm(p => ({ ...p, [item.key]: parseInt(e.target.value) || 0 }))}
                  className="h-9"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Teşkilat durumu */}
      <Card className="premium-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" style={{ color: '#7C3AED' }} />
              Teşkilat Durumu
            </span>
            <span className="text-xs font-normal text-slate-400">
              {activeOrgCount}/{ORG_POSITIONS.length} kadro dolu
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ORG_POSITIONS.map(pos => {
              const active = form.orgStatus[pos.key]
              
              // Hiyerarşik yetki kontrolü
              let isDisabled = false
              if (user.role === 'BOLGE_KOORDINATOR') {
                // Bölge yöneticisi sadece il başkanını atayabilir/düzenleyebilir
                if (pos.key !== 'ilBaskani') isDisabled = true
              } else if (user.role === 'IL_KOORDINATOR') {
                // İl yöneticisi il başkanını düzenleyemez (Bölge atar), diğerlerini düzenler
                if (pos.key === 'ilBaskani') isDisabled = true
              }

              return (
                <div key={pos.key} className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{pos.label}</span>
                    <button
                      disabled={isDisabled}
                      onClick={() => setForm(p => ({
                        ...p,
                        orgStatus: { ...p.orgStatus, [pos.key]: !p.orgStatus[pos.key] },
                        orgNames: { ...p.orgNames, [pos.key]: !p.orgStatus[pos.key] ? (p.orgNames[pos.key] || '') : '' }
                      }))}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                        active
                          ? 'border-green-400 bg-green-50 text-green-700'
                          : 'border-slate-200 bg-white text-slate-400'
                      }`}
                    >
                      {active ? 'Aktif (Dolu)' : 'Pasif (Boş)'}
                    </button>
                  </div>
                  {active && (
                    <Input
                      disabled={isDisabled}
                      value={form.orgNames[pos.key] || ''}
                      onChange={e => setForm(p => ({
                        ...p,
                        orgNames: { ...p.orgNames, [pos.key]: e.target.value }
                      }))}
                      className="h-8 text-xs placeholder:text-slate-300"
                      placeholder="Ad Soyad giriniz..."
                    />
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* İlçe çalışmaları */}
      <Card className="premium-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4" style={{ color: '#D97706' }} />
              İlçe Teşkilatlanması
            </span>
            <span className="text-xs font-normal text-slate-400">
              Toplam: {form.totalDistrictCount} · İHH: {form.ihhDistrictCount} · Genç İHH: {form.gencIhhDistrictCount}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Yeni ilçe ekleme (Bölge yöneticisi hariç) */}
          {user.role !== 'BOLGE_KOORDINATOR' && (
            <div className="flex gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs">Yeni İlçe Ekle</Label>
                <Input
                  value={newDistrictName}
                  onChange={e => setNewDistrictName(e.target.value)}
                  placeholder="İlçe adı yazın..."
                  className="h-9"
                />
              </div>
              <button
                onClick={handleAddDistrict}
                type="button"
                className="px-4 h-9 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 active:scale-95 transition-all"
              >
                Ekle
              </button>
            </div>
          )}

          {/* İlçeler listesi */}
          {form.districtDetails.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Kayıtlı ilçe bulunamadı.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[250px] overflow-y-auto pr-1">
              {form.districtDetails.map((district, idx) => {
                const isDistrictDisabled = user.role === 'BOLGE_KOORDINATOR'
                return (
                  <div key={district.name} className="flex flex-col gap-2 p-3 rounded-lg border border-slate-100 bg-white shadow-xs">
                    <span className="text-xs font-bold text-slate-700">{district.name}</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          disabled={isDistrictDisabled}
                          checked={district.hasIhh}
                          onChange={() => handleToggleDistrict(idx, 'hasIhh')}
                          className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="text-slate-500">İHH</span>
                      </label>
                      <label className="flex items-center gap-1 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          disabled={isDistrictDisabled}
                          checked={district.hasGencIhh}
                          onChange={() => handleToggleDistrict(idx, 'hasGencIhh')}
                          className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5"
                        />
                        <span className="text-slate-500">Genç İHH</span>
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dönem hedefleri */}
      <Card className="premium-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" style={{ color: '#BE185D' }} />
            Dönem Hedefleri — {selectedYear}-{selectedYear + 1}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {([
              { label: 'Teşkilat Hedefi', key: 'teskilatHedefi' },
              { label: 'İlçe Hedefi', key: 'ilceHedefi' },
              { label: 'Fakülte Başkanı Hedefi', key: 'fakulteBaskanHedefi' },
              { label: 'Lise Temsilci Hedefi', key: 'liseTemsilciHedefi' },
              { label: 'Fon Hedefi (TL)', key: 'fonHedefi' },
            ] as const).map(item => (
              <div key={item.key} className="space-y-1.5">
                <Label className="text-xs">{item.label}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.targets[item.key] || ''}
                  onChange={e => setForm(p => ({
                    ...p,
                    targets: { ...p.targets, [item.key]: parseInt(e.target.value) || 0 },
                  }))}
                  className="h-9"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 z-40">
        <button
          onClick={handleSave}
          disabled={isSaving || !provinceId}
          className="w-full h-12 rounded-xl text-base font-semibold text-white shadow-lg
                     transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #1B4E6B, #7C3AED)' }}
        >
          {isSaving
            ? <><Loader2 className="h-5 w-5 animate-spin" /> Kaydediliyor…</>
            : <><Save className="h-5 w-5" /> Künyeyi kaydet — {provinceName} {selectedYear}-{selectedYear + 1}</>}
        </button>
      </div>
    </div>
  )
}
