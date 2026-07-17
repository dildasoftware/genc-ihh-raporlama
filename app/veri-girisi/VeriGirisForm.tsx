'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  PlusCircle, Trash2, Loader2, Building2, GraduationCap,
  ClipboardList, Users, MapPin, CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { formatDate, formatNumber } from '@/lib/utils'
import { getGenderLabel } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'

const schema = z.object({
  periodId: z.string().min(1, 'Dönem seçiniz'),
  institutionId: z.string().min(1, 'Kurum seçiniz'),
  facultyId: z.string().optional(),
  activityTypeId: z.string().min(1, 'Faaliyet türü seçiniz'),
  participantCount: z.string().min(1, 'Katılımcı sayısı gereklidir')
    .refine(v => parseInt(v) > 0, 'Katılımcı sayısı 0\'dan büyük olmalıdır'),
  location: z.string().optional(),
  note: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  user: SessionUser
  currentPeriod: any
  periods: any[]
  institutions: any[]
  activityTypes: any[]
  units: any[]
  recentActivities: any[]
}

export default function VeriGirisForm({
  user,
  currentPeriod,
  periods,
  institutions,
  activityTypes,
  recentActivities: initialActivities,
}: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [activities, setActivities] = useState(initialActivities)
  const [faculties, setFaculties] = useState<any[]>([])
  const [newInstitution, setNewInstitution] = useState('')
  const [isAddingInstitution, setIsAddingInstitution] = useState(false)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      periodId: currentPeriod?.id?.toString() ?? '',
    },
  })

  const selectedInstitutionId = watch('institutionId')

  // Kurum değiştiğinde fakülteleri çek
  useEffect(() => {
    if (!selectedInstitutionId) {
      setFaculties([])
      setValue('facultyId', '')
      return
    }

    const institution = institutions.find(i => i.id.toString() === selectedInstitutionId)
    if (institution?.unit?.name === 'Üniversite') {
      fetch(`/api/faculties?institutionId=${selectedInstitutionId}`)
        .then(r => r.json())
        .then(setFaculties)
        .catch(() => setFaculties([]))
    } else {
      setFaculties([])
      setValue('facultyId', '')
    }
  }, [selectedInstitutionId, institutions, setValue])

  async function onSubmit(data: FormData) {
    setIsLoading(true)
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodId: data.periodId,
          institutionId: data.institutionId,
          facultyId: data.facultyId || null,
          activityTypeId: data.activityTypeId,
          participantCount: data.participantCount,
          location: data.location || null,
          note: data.note || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Kayıt başarısız')
      }

      const created = await res.json()
      toast.success('Faaliyet kaydedildi', {
        description: `${created.activityType?.name} — ${parseInt(data.participantCount)} katılımcı`,
      })

      // Listeye ekle
      setActivities(prev => [created, ...prev])

      // Formu sıfırla (dönem korunsun)
      reset({
        periodId: data.periodId,
        institutionId: '',
        facultyId: '',
        activityTypeId: '',
        participantCount: '',
        location: '',
        note: '',
      })
    } catch (err: any) {
      toast.error('Kayıt hatası', { description: err.message })
    } finally {
      setIsLoading(false)
    }
  }

  async function deleteActivity(id: string) {
    try {
      const res = await fetch(`/api/activities/${id}/delete`, { method: 'POST' })
      if (!res.ok) throw new Error('Silme başarısız')
      setActivities(prev => prev.filter(a => a.id !== id))
      toast.success('Faaliyet silindi')
    } catch {
      toast.error('Silme hatası')
    }
  }

  const selectedInstitution = institutions.find(i => i.id.toString() === selectedInstitutionId)
  const isUniversity = selectedInstitution?.unit?.name === 'Üniversite'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PlusCircle className="h-6 w-6 text-primary" />
          Veri Girişi
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-muted-foreground text-sm">
            {user.fullName} — {getGenderLabel(user.genderBranch)}
          </p>
          {currentPeriod && (
            <Badge variant="secondary" className="text-xs">
              Aktif: Hafta {currentPeriod.weekNo}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Yeni Faaliyet Ekle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Dönem */}
              <div className="space-y-1.5">
                <Label className="text-xs">Dönem *</Label>
                <Select
                  defaultValue={currentPeriod?.id?.toString() ?? ''}
                  onValueChange={(v) => setValue('periodId', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Dönem seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((p) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.year} / H{p.weekNo} — {formatDate(p.startDate)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.periodId && <p className="text-xs text-destructive">{errors.periodId.message}</p>}
              </div>

              {/* Kurum */}
              <div className="space-y-1.5">
                <Label className="text-xs">Kurum *</Label>
                <Select onValueChange={(v) => setValue('institutionId', String(v ?? ''))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Kurum seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((i) => (
                      <SelectItem key={i.id} value={i.id.toString()}>
                        <span>{i.name}</span>
                        <span className="text-muted-foreground ml-1 text-xs">({i.unit?.name})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.institutionId && <p className="text-xs text-destructive">{errors.institutionId.message}</p>}
              </div>

              {/* Fakülte (sadece üniversite) */}
              {isUniversity && faculties.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Fakülte</Label>
                  <Select onValueChange={(v) => setValue('facultyId', v ? String(v) : undefined)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Fakülte seçin (isteğe bağlı)" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculties.map((f) => (
                        <SelectItem key={f.id} value={f.id.toString()}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Faaliyet Türü */}
              <div className="space-y-1.5">
                <Label className="text-xs">Faaliyet Türü *</Label>
                <Select onValueChange={(v) => setValue('activityTypeId', String(v ?? ''))}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Faaliyet türü seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((at) => (
                      <SelectItem key={at.id} value={at.id.toString()}>
                        {at.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.activityTypeId && <p className="text-xs text-destructive">{errors.activityTypeId.message}</p>}
              </div>

              {/* Katılımcı Sayısı */}
              <div className="space-y-1.5">
                <Label className="text-xs">Katılımcı Sayısı *</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    min="1"
                    className="pl-8 h-9"
                    placeholder="0"
                    {...register('participantCount')}
                  />
                </div>
                {errors.participantCount && <p className="text-xs text-destructive">{errors.participantCount.message}</p>}
              </div>

              {/* Yer */}
              <div className="space-y-1.5">
                <Label className="text-xs">Gerçekleştiği Yer</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-9"
                    placeholder="Örn: Kampüs, Sınıf..."
                    {...register('location')}
                  />
                </div>
              </div>

              {/* Not */}
              <div className="space-y-1.5">
                <Label className="text-xs">Not (İsteğe Bağlı)</Label>
                <Textarea
                  rows={2}
                  placeholder="Kısa açıklama..."
                  className="text-sm resize-none"
                  {...register('note')}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Kaydediliyor...</>
                ) : (
                  <><PlusCircle className="h-4 w-4 mr-2" />Faaliyet Ekle</>
                )}
              </Button>
            </form>

            {/* Kurum Ekle */}
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Kurum listede yok mu?</p>
              {!isAddingInstitution ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => setIsAddingInstitution(true)}
                >
                  <Building2 className="h-3 w-3 mr-1" />
                  Yeni Kurum Ekle
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Kurum adı"
                    value={newInstitution}
                    onChange={(e) => setNewInstitution(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={async () => {
                      if (!newInstitution.trim()) return
                      toast.info('Kurum ekleme için yöneticinizle iletişime geçin veya Yönetim panelini kullanın')
                      setIsAddingInstitution(false)
                      setNewInstitution('')
                    }}
                  >
                    Ekle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => { setIsAddingInstitution(false); setNewInstitution('') }}
                  >
                    İptal
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Son Kayıtlar */}
        <Card className="lg:col-span-3 border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              Bu Haftaki Kayıtlarım
              <Badge variant="secondary" className="ml-auto text-xs">
                {activities.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Henüz bu hafta faaliyet girilmemiş</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {activities.map((a: any) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{a.institution?.name || 'Kurum'}</span>
                        <Badge variant="secondary" className="text-xs">
                          {a.activityType?.name || '—'}
                        </Badge>
                        <Badge
                          className="text-xs"
                          style={{ background: a.genderBranch === 'K' ? '#be185d22' : '#1d4ed822', color: a.genderBranch === 'K' ? '#be185d' : '#1d4ed8' }}
                        >
                          {a.genderBranch === 'K' ? 'K' : 'E'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {formatNumber(a.participantCount)} katılımcı
                        </span>
                        {a.faculty && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {a.faculty.name}
                          </span>
                        )}
                        {a.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {a.location}
                          </span>
                        )}
                      </div>
                      {a.note && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">{a.note}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => deleteActivity(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
