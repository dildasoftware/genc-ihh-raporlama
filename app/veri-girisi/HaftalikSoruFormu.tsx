'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import {
  Plus, Trash2, Loader2, Save, Users, MapPin, Check, Search,
  ChevronDown, CircleCheck, Circle, Building2, Sparkles, X,
} from 'lucide-react'
import {
  UNITS, QUESTIONS_BY_UNIT, SCHOOL_TYPES, ACTIVITY_TYPES,
  derive, deriveUnitTotals, deriveGrandTotals, completionPercent,
  type UnitKey, type UnitDef, type QuestionDef, type AnswerRow, type Answers,
} from '@/lib/questions'
import { formatNumber, formatWeekRange } from '@/lib/utils'
import type { SessionUser } from '@/lib/authz'

// ==================== KURUM AUTOCOMPLETE ====================
// Harf girince kurum adı önerilir; listede yoksa serbest metin olarak eklenir.

function KurumAutocomplete({
  value,
  unitName,
  provinceId,
  placeholder,
  autoFocus,
  allowFreeText,
  onChange,
}: {
  value: string
  unitName: string
  provinceId: number
  placeholder: string
  autoFocus?: boolean
  /** false ise yalnızca listeden seçilebilir (üniversite → resmî YÖK listesi) */
  allowFreeText: boolean
  onChange: (name: string) => void
}) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<{ id: number; name: string }[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ q: q.trim(), unitType: unitName })
      if (provinceId) params.set('provinceId', String(provinceId))
      const res = await fetch(`/api/institutions/search?${params}`)
      if (res.ok) setResults(await res.json())
    } catch { /* sessiz geç — serbest metin yine de girilebilir */ }
    finally { setIsLoading(false) }
  }, [unitName, provinceId])

  // Yazarken 250ms bekle, sonra ara
  useEffect(() => {
    if (query === value && !isOpen) return
    const t = setTimeout(() => search(query), 250)
    return () => clearTimeout(t)
  }, [query, search, value, isOpen])

  const pick = (name: string) => {
    setQuery(name)
    onChange(name)
    setIsOpen(false)
  }

  const exactMatch = (q: string) =>
    results.some((r: any) => r.name.toLocaleLowerCase('tr') === q.toLocaleLowerCase('tr'))

  // Serbest metin kapalıysa "yeni ekle" seçeneği hiç gösterilmez
  const showCreate = allowFreeText &&
    query.trim().length >= 2 && !exactMatch(query.trim())

  // Listeden seçilmesi zorunluysa ve yazılan ad listede yoksa uyar
  const invalidFreeText =
    !allowFreeText && query.trim().length >= 2 && !isLoading && !exactMatch(query.trim())

  return (
    <div ref={boxRef} className="relative flex-1 min-w-0">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        value={query}
        placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); setIsOpen(true); setHighlight(0) }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          // Serbest metin kapalıyken listede olmayan ad kabul edilmez —
          // son geçerli değere geri dönülür, böylece uydurma kurum kaydedilemez.
          if (!allowFreeText && !exactMatch(query.trim())) {
            setQuery(value)
            return
          }
          onChange(query)
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, results.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
          else if (e.key === 'Enter') {
            e.preventDefault()
            if (results[highlight]) pick(results[highlight].name)
            else if (allowFreeText && query.trim()) pick(query.trim())
          } else if (e.key === 'Escape') setIsOpen(false)
        }}
        className={`w-full h-9 pl-8 pr-8 text-sm bg-white border rounded-lg outline-none transition-all
                    focus:ring-2 focus:ring-primary/25 ${
                      invalidFreeText ? 'border-amber-400 bg-amber-50/40' : 'border-slate-200 focus:border-primary'
                    }`}
      />
      {isLoading && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-400" />}
      {!isLoading && query && (
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => { setQuery(''); onChange(''); inputRef.current?.focus() }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-slate-100"
        >
          <X className="h-3 w-3 text-slate-400" />
        </button>
      )}

      {isOpen && (results.length > 0 || showCreate) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl
                        max-h-56 overflow-y-auto overflow-x-hidden py-1">
          {results.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(r.name)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                i === highlight ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{r.name}</span>
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => pick(query.trim())}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-primary
                         font-medium hover:bg-primary/5 border-t border-slate-100 mt-1 pt-2"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">&quot;{query.trim()}&quot; olarak yeni ekle</span>
            </button>
          )}
        </div>
      )}

      {/* Listeden seçim zorunlu — neden eklenemediğini açıkla */}
      {invalidFreeText && isOpen && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-amber-200 rounded-xl shadow-xl p-3">
          <p className="text-xs text-amber-700">
            Bu ada uygun resmî üniversite bulunamadı. {unitName} adı listeden seçilmelidir —
            elle yazılamaz. Adın bir kısmını yazarak arayın.
          </p>
        </div>
      )}
    </div>
  )
}

// ==================== KURUM SATIRI ====================

function KurumSatiri({
  row,
  unit,
  provinceId,
  isNew,
  onChange,
  onRemove,
}: {
  row: AnswerRow
  unit: UnitDef
  provinceId: number
  isNew: boolean
  onChange: (patch: Partial<AnswerRow>) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-white/90 rounded-lg p-2 border border-slate-100
                    animate-fade-in-up hover:border-slate-200 transition-colors">
      {/* Kurum adı */}
      <KurumAutocomplete
        value={row.institutionName}
        unitName={unit.unitName}
        provinceId={provinceId}
        placeholder={unit.searchPlaceholder}
        autoFocus={isNew}
        allowFreeText={unit.allowFreeText}
        onChange={name => onChange({ institutionName: name })}
      />

      {/* Okul türü — sadece lise */}
      {unit.hasSchoolType && (
        <select
          value={row.schoolType ?? ''}
          onChange={e => onChange({ schoolType: e.target.value || undefined })}
          className="h-9 px-2 text-xs bg-white border border-slate-200 rounded-lg
                     focus:ring-2 focus:ring-primary/25 outline-none w-32 shrink-0"
        >
          <option value="">Okul türü…</option>
          {SCHOOL_TYPES.map((t: any) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}

      {/* Fakülte — sadece üniversite */}
      {unit.hasFaculty && (
        <input
          value={row.facultyName ?? ''}
          onChange={e => onChange({ facultyName: e.target.value || undefined })}
          placeholder="Fakülte (ops.)"
          className="h-9 px-2.5 text-xs bg-white border border-slate-200 rounded-lg w-32 shrink-0
                     focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
        />
      )}

      {/* Katılımcı sayısı */}
      <div className="relative shrink-0">
        <Users className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={row.participantCount || ''}
          onChange={e => onChange({ participantCount: parseInt(e.target.value) || 0 })}
          placeholder="Kişi"
          className="h-9 w-24 pl-7 pr-2 text-sm font-semibold bg-white border border-slate-200 rounded-lg
                     focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
        />
      </div>

      <button
        type="button"
        onClick={onRemove}
        title="Satırı sil"
        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5 text-red-300 hover:text-red-600" />
      </button>
    </div>
  )
}

// ==================== SORU KARTI ====================

function SoruKarti({
  question,
  unit,
  rows,
  provinceId,
  index,
  onChange,
}: {
  question: QuestionDef
  unit: UnitDef
  rows: AnswerRow[]
  provinceId: number
  index: number
  onChange: (rows: AnswerRow[]) => void
}) {
  const [newRowId, setNewRowId] = useState<string | null>(null)
  const stats = derive(rows)
  const at = ACTIVITY_TYPES[question.activityType]

  const addRow = () => {
    const id = crypto.randomUUID()
    setNewRowId(id)
    onChange([...rows, { id, institutionName: '', participantCount: 0 }])
  }

  const patchRow = (id: string, patch: Partial<AnswerRow>) =>
    onChange(rows.map((r: any) => (r.id === id ? { ...r, ...patch } : r)))

  const removeRow = (id: string) => onChange(rows.filter((r: any) => r.id !== id))

  // Yönetim toplantısı: kurum yok, tek katılımcı sayısı
  if (question.isManagement) {
    const row = rows[0]
    const done = (row?.participantCount ?? 0) > 0
    return (
      <div
        className="premium-card p-4 transition-all"
        style={{ borderLeft: `3px solid ${done ? unit.color : '#E2E8F0'}` }}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0">{at.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  <span className="text-slate-400 mr-1.5">{index}.</span>
                  {question.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{question.help}</p>
              </div>
              {done
                ? <CircleCheck className="h-4 w-4 shrink-0" style={{ color: unit.color }} />
                : <Circle className="h-4 w-4 text-slate-200 shrink-0" />}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <div className="relative">
                <Users className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={row?.participantCount || ''}
                  onChange={e => {
                    const n = parseInt(e.target.value) || 0
                    onChange(n > 0
                      ? [{ id: row?.id ?? crypto.randomUUID(), institutionName: '', participantCount: n }]
                      : [])
                  }}
                  placeholder="Katılımcı"
                  className="h-9 w-32 pl-7 pr-2 text-sm font-semibold bg-white border border-slate-200 rounded-lg
                             focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none"
                />
              </div>
              <span className="text-xs text-slate-400">kişi katıldı</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="premium-card p-4 transition-all"
      style={{ borderLeft: `3px solid ${stats.done ? unit.color : '#E2E8F0'}` }}
    >
      {/* Soru başlığı */}
      <div className="flex items-start gap-3">
        <span className="text-lg shrink-0">{at.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">
                <span className="text-slate-400 mr-1.5">{index}.</span>
                {question.label}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{question.help}</p>
            </div>
            {stats.done
              ? <CircleCheck className="h-4 w-4 shrink-0" style={{ color: unit.color }} />
              : <Circle className="h-4 w-4 text-slate-200 shrink-0" />}
          </div>
        </div>
      </div>

      {/* Kurum satırları */}
      {rows.length > 0 && (
        <div className="space-y-1.5 mt-3 pl-0 sm:pl-8">
          {rows.map(row => (
            <KurumSatiri
              key={row.id}
              row={row}
              unit={unit}
              provinceId={provinceId}
              isNew={row.id === newRowId}
              onChange={patch => patchRow(row.id, patch)}
              onRemove={() => removeRow(row.id)}
            />
          ))}
        </div>
      )}

      {/* + Ekle  +  türetilmiş özet */}
      <div className="flex items-center justify-between gap-3 mt-3 pl-0 sm:pl-8">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold border border-dashed
                     transition-all hover:border-solid hover:shadow-sm active:scale-95"
          style={{ borderColor: unit.color + '70', color: unit.color, background: unit.bg }}
        >
          <Plus className="h-3.5 w-3.5" />
          {unit.entityLabel} ekle
        </button>

        {/* Otomatik türetilen değerler — elle girilmez */}
        {stats.done && (
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-500">
              <MapPin className="h-3 w-3" />
              <strong style={{ color: unit.color }}>{stats.locationCount}</strong> lokasyon
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <Users className="h-3 w-3" />
              <strong style={{ color: unit.color }}>{formatNumber(stats.participantCount)}</strong> kişi
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== ANA FORM ====================

interface Props {
  user: SessionUser
  provinces: { id: number; name: string }[]
  periods: any[]
  currentPeriod: any
}

export default function HaftalikSoruFormu({ user, provinces, periods, currentPeriod }: Props) {
  const [periodId, setPeriodId] = useState<number>(currentPeriod?.id ?? periods[0]?.id ?? 0)
  const [provinceId, setProvinceId] = useState<number>(user.provinceId ?? provinces[0]?.id ?? 0)
  const [gender, setGender] = useState<'K' | 'E'>(user.genderBranch ?? 'K')
  const [activeUnit, setActiveUnit] = useState<UnitKey>('universite')
  const [answers, setAnswers] = useState<Answers>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const isAdmin = user.role === 'ADMIN'
  const period = periods.find((p: any) => p.id === periodId)

  // Seçilen hafta/il/kol için mevcut cevapları yükle
  useEffect(() => {
    if (!periodId || !provinceId) return
    setIsLoading(true)
    const params = new URLSearchParams({
      periodId: String(periodId),
      provinceId: String(provinceId),
      gender,
    })
    fetch(`/api/weekly-entry?${params}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        setAnswers(data?.answers ?? {})
        setIsDirty(false)
      })
      .catch(() => toast.error('Mevcut veriler yüklenemedi'))
      .finally(() => setIsLoading(false))
  }, [periodId, provinceId, gender])

  const setRows = (questionId: string, rows: AnswerRow[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: rows }))
    setIsDirty(true)
  }

  const totals = useMemo(() => deriveGrandTotals(answers), [answers])
  const percent = useMemo(() => completionPercent(answers), [answers])

  async function handleSave() {
    if (!periodId || !provinceId) {
      toast.error('Hafta ve il seçiniz')
      return
    }
    // Adı boş bırakılmış satırlar sessizce atılmasın — kullanıcı uyarılsın
    const emptyNamed = Object.entries(answers).flatMap(([qid, rows]) =>
      (rows ?? []).filter((r: any) => !r.institutionName.trim() && r.participantCount > 0).map(() => qid)
    )
    if (emptyNamed.length > 0) {
      const q = UNITS.flatMap(u => QUESTIONS_BY_UNIT[u.key]).find((x: any) => x.id === emptyNamed[0])
      if (q && !q.isManagement) {
        toast.error('Kurum adı boş satır var', {
          description: `"${q.label}" sorusunda kurum adı girilmemiş bir satır var.`,
        })
        return
      }
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/weekly-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId, provinceId, gender, answers }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Kayıt başarısız')
      setIsDirty(false)
      toast.success('Haftalık rapor kaydedildi', {
        description: `${json.created} kayıt · ${totals.locations} lokasyon · ${formatNumber(totals.participants)} kişi`,
      })
    } catch (e: any) {
      toast.error('Kayıt hatası', { description: e.message })
    } finally {
      setIsSaving(false)
    }
  }

  const provinceName = provinces.find((p: any) => p.id === provinceId)?.name ?? 'İl seçiniz'
  const unitDef = UNITS.find((u: any) => u.key === activeUnit)!
  const unitQuestions = QUESTIONS_BY_UNIT[activeUnit]

  return (
    <div className="space-y-4 min-w-0 w-full">

      {/* ── Kapsam seçimi: Hafta / İl / Kol ── */}
      <div className="filter-bar flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Hafta</label>
          <select
            value={periodId}
            onChange={e => setPeriodId(parseInt(e.target.value))}
            className="h-9 px-2.5 text-sm border border-slate-200 rounded-lg bg-white
                       focus:ring-2 focus:ring-primary/25 outline-none min-w-[190px]"
          >
            {periods.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.year} · {p.weekNo}. hafta ({formatWeekRange(p.startDate, p.endDate)})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">İl</label>
          <select
            value={provinceId}
            onChange={e => setProvinceId(parseInt(e.target.value))}
            disabled={user.role === 'IL_KOORDINATOR'}
            className="h-9 px-2.5 text-sm border border-slate-200 rounded-lg bg-white
                       focus:ring-2 focus:ring-primary/25 outline-none disabled:bg-slate-50 disabled:text-slate-500"
          >
            {provinces.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-500">Kol</label>
          <select
            value={gender}
            onChange={e => setGender(e.target.value as 'K' | 'E')}
            disabled={!isAdmin}
            className="h-9 px-2.5 text-sm border border-slate-200 rounded-lg bg-white
                       focus:ring-2 focus:ring-primary/25 outline-none disabled:bg-slate-50 disabled:text-slate-500"
          >
            <option value="K">Kadın Kolu</option>
            <option value="E">Erkek Kolu</option>
          </select>
        </div>

        {/* Doldurulma oranı */}
        <div className="flex-1 min-w-[160px] space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-500">Doldurulma</label>
            <span className="text-xs font-bold" style={{ color: '#1B4E6B' }}>%{percent}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>

      {/* ── Birim sekmeleri (kategori ayrımı) ── */}
      <div className="flex flex-wrap gap-2">
        {UNITS.map((u: any) => {
          const t = deriveUnitTotals(u.key, answers)
          const active = activeUnit === u.key
          return (
            <button
              key={u.key}
              onClick={() => setActiveUnit(u.key)}
              className="flex items-center gap-2 px-3.5 h-10 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95"
              style={{
                borderColor: active ? u.color : u.color + '25',
                background: active ? u.color : u.bg,
                color: active ? '#fff' : u.color,
              }}
            >
              {u.label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-md font-bold"
                style={{
                  background: active ? 'rgba(255,255,255,0.22)' : u.color + '18',
                  color: active ? '#fff' : u.color,
                }}
              >
                {t.doneCount}/{t.totalQuestions}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Aktif birimin özeti ── */}
      {(() => {
        const t = deriveUnitTotals(activeUnit, answers)
        return (
          <div
            className="rounded-xl p-3.5 border grid grid-cols-2 sm:grid-cols-4 gap-3 text-center"
            style={{ background: unitDef.bg, borderColor: unitDef.color + '30' }}
          >
            {[
              { v: t.institutionCount, l: unitDef.isManagement ? 'Toplantı' : `Farklı ${unitDef.entityLabel.toLowerCase()}` },
              { v: t.locations, l: 'Lokasyon' },
              { v: formatNumber(t.participants), l: 'Toplam katılımcı' },
              { v: `${t.doneCount}/${t.totalQuestions}`, l: 'Cevaplanan soru' },
            ].map((x: any) => (
              <div key={x.l}>
                <p className="text-xl font-bold" style={{ color: unitDef.color, fontFamily: 'Outfit, sans-serif' }}>{x.v}</p>
                <p className="text-xs text-slate-500 mt-0.5">{x.l}</p>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── Sorular ── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin mb-3" style={{ color: unitDef.color }} />
          <p className="text-sm text-slate-500">Bu haftanın verileri yükleniyor…</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unitQuestions.map((q, i) => (
            <SoruKarti
              key={q.id}
              question={q}
              unit={unitDef}
              index={i + 1}
              rows={answers[q.id] ?? []}
              provinceId={provinceId}
              onChange={rows => setRows(q.id, rows)}
            />
          ))}
        </div>
      )}

      {/* ── Sticky kaydet ── */}
      <div className="sticky bottom-4 z-40 pt-2">
        <div className="premium-card p-3 flex flex-wrap items-center gap-3 shadow-xl">
          <div className="flex items-center gap-4 text-xs flex-1 min-w-0">
            <span className="text-slate-500">
              Genel toplam:
              <strong className="text-slate-800 ml-1.5">{totals.locations}</strong> lokasyon
            </span>
            <span className="text-slate-500">
              <strong className="text-slate-800">{formatNumber(totals.participants)}</strong> kişi
            </span>
            {isDirty && (
              <span className="text-amber-600 font-medium flex items-center gap-1">
                <Circle className="h-2 w-2 fill-amber-500 text-amber-500" /> Kaydedilmedi
              </span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading || !provinceId}
            className="h-11 px-6 rounded-xl text-sm font-semibold text-white shadow-lg transition-all
                       active:scale-95 disabled:opacity-50 flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #1B4E6B, #16A34A)' }}
          >
            {isSaving
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor…</>
              : <><Save className="h-4 w-4" /> {provinceName} · {period?.weekNo}. hafta raporunu kaydet</>}
          </button>
        </div>
      </div>
    </div>
  )
}
