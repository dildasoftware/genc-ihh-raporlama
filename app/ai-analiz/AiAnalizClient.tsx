'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Bot, Send, Loader2, Sparkles, FileText, BarChart2, TrendingUp, Award, Building2, MessageSquare, Clock, Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import { getRoleLabel } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'
import { marked } from 'marked'

interface Props { 
  user: SessionUser
  regions?: any[]
  provinces?: any[]
}

const ANALYSIS_TYPES = [
  { value: 'SMART_KARNE', label: 'Akıllı Karne / Rapor', icon: Award, desc: 'Bölge/İl bazlı otomatik yapay zeka raporu' },
  { value: 'KARNE', label: 'İl Karnesi Soru', icon: Award, desc: 'İl sıralaması ve puan analizi' },
  { value: 'TREND', label: 'Trend Analizi', icon: TrendingUp, desc: 'Haftalık/aylık trend yorumu' },
  { value: 'KARSILASTIRMA', label: 'Karşılaştırma', icon: BarChart2, desc: 'İller arası karşılaştırma' },
  { value: 'HAFTALIK_RAPOR', label: 'Haftalık Rapor', icon: FileText, desc: 'Otomatik haftalık rapor' },
  { value: 'IL_BIRIM', label: 'İl Birim Analizi', icon: Building2, desc: 'İl bazlı birim dağılımı' },
  { value: 'SERBEST', label: 'Serbest Soru', icon: MessageSquare, desc: 'Özel soru & analiz' },
]

const getExamplePrompts = (role: string): Record<string, string[]> => {
  if (role === 'IL_KOORDINATOR') {
    return {
      KARNE: [
        'İlimizin genel performansını nasıl artırabiliriz?',
        'Hangi ilçelerde eksikliğimiz var?',
        'Geçen aya göre performansımız nasıl?',
      ],
      TREND: [
        'Katılımcı sayısındaki dalgalanmaların nedeni ne olabilir?',
        'Gelecek ayki faaliyetler için projeksiyon yap.',
        'Yaz dönemi ilimizi nasıl etkiledi?',
      ],
      HAFTALIK_RAPOR: [
        'Bu haftaki faaliyetlerimizin özetini çıkar.',
        'Haftalık bazda hangi birimimiz daha aktif?',
      ],
      KARSILASTIRMA: [
        'Birimlerimiz (Üniversite, Lise vb.) arasındaki performans farkları neler?',
        'İlçelerimizi birbiriyle karşılaştır.',
      ],
      IL_BIRIM: [
        'Üniversite birimimiz neden hedefinin gerisinde? Öneriler ver.',
        'Lise birimimizin başarı faktörlerini analiz et.',
      ],
      SERBEST: [
        'İlimizde en çok ilgi gören faaliyet türü hangisi?',
        'Teşkilatlanma eksiklerimiz performansımızı nasıl etkiliyor?',
        'İl teşkilatı olarak nelere odaklanmalıyız?',
      ],
    }
  }

  // Removed BOLGE_KOORDINATOR specific prompts

  return {
    KARNE: [
      'Hangi bölge en iyi performansı gösteriyor? Neden?',
      'Alt sıralardaki iller için öneriler ver.',
      'Birim bazında Türkiye genelinde hangi eksiklikler göze çarpıyor?',
    ],
    TREND: [
      'Türkiye genelindeki katılımcı düşüşünün olası nedenleri neler?',
      'Gelecek 4 hafta için projeksiyon yap.',
      'Yaz dönemi etkisini değerlendir.',
    ],
    HAFTALIK_RAPOR: [
      'Türkiye geneli bu haftanın özet raporunu hazırla.',
      'Genel Merkez için sunum formatında rapor oluştur.',
    ],
    KARSILASTIRMA: [
      'Doğu ve Batı bölgeleri arasındaki farkları analiz et.',
      'Neden bazı iller tutarsız performans gösteriyor?',
    ],
    IL_BIRIM: [
      'Türkiye genelinde Üniversite birimi neden zayıf? Önerilerin neler?',
      'Lise birimi için başarı faktörlerini listele.',
    ],
    SERBEST: [
      'En etkili faaliyet türü hangisi ve neden?',
      'Katılımcı başına düşen puan neyi ifade ediyor?',
      'GENÇ İHH için stratejik önerilerin nelerdir?',
    ],
  }
}

interface HistoryItem {
  type: string
  userPrompt: string
  response: string
  timestamp: Date
}

export default function AiAnalizClient({ user, regions = [], provinces = [] }: Props) {
  const [selectedType, setSelectedType] = useState('SMART_KARNE')
  const [userPrompt, setUserPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Smart Karne State
  const [smartScope, setSmartScope] = useState(user.role === 'IL_KOORDINATOR' ? 'PROVINCE' : 'COUNTRY')
  const [smartRegionId, setSmartRegionId] = useState(regions.length > 0 ? regions[0].id.toString() : '')
  const [smartProvinceId, setSmartProvinceId] = useState(user.provinceId?.toString() || (provinces.length === 1 ? provinces[0].id.toString() : ''))
  const [smartTimeframe, setSmartTimeframe] = useState('YEARLY')
  const [smartYear, setSmartYear] = useState(new Date().getFullYear().toString())
  
  const reportRefs = useRef<{ [key: number]: HTMLDivElement | null }>({})

  async function handlePdf(index: number, type: string) {
    const element = reportRefs.current[index]
    if (!element) return

    toast.loading('PDF hazırlanıyor...')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: h2c } = await import('html2canvas')
      const canvas = await h2c(element, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight() // 297mm
      
      const ratio = pdfWidth / canvas.width
      const imgScaledHeight = canvas.height * ratio
      
      let heightLeft = imgScaledHeight
      let position = 0
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, pdfWidth, imgScaledHeight)
      heightLeft -= pdfHeight
      
      while (heightLeft > 0) {
        position -= pdfHeight
        pdf.addPage()
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, pdfWidth, imgScaledHeight)
        heightLeft -= pdfHeight
      }
      
      pdf.save(`GENC-IHH-Akilli-Karne-${new Date().getTime()}.pdf`)
      
      toast.dismiss(); toast.success('PDF indirildi!')
    } catch (e) {
      console.error(e)
      toast.dismiss(); toast.error('PDF oluşturulamadı')
    }
  }

  async function runAnalysis() {
    if (!userPrompt.trim() && selectedType === 'SERBEST') {
      toast.error('Lütfen bir soru veya istek yazınız')
      return
    }

    setIsLoading(true)
    try {
      let res;
      if (selectedType === 'SMART_KARNE') {
        res = await fetch('/api/ai-analiz/smart-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scopeType: smartScope,
            scopeId: smartScope === 'PROVINCE' ? smartProvinceId : (smartScope === 'REGION' ? smartRegionId : null),
            timeframe: smartTimeframe,
            year: smartYear,
          }),
        })
      } else {
        res = await fetch('/api/ai-analiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: selectedType,
            userPrompt: userPrompt.trim() || undefined,
          }),
        })
      }
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'AI hatası') }
      const json = await res.json()

      setHistory(prev => [{
        type: selectedType,
        userPrompt: selectedType === 'SMART_KARNE' ? 'Akıllı Karne Analizi Oluşturuldu' : userPrompt.trim(),
        response: json.response,
        timestamp: new Date(),
      }, ...prev])

      setUserPrompt('')
      toast.success('Analiz tamamlandı')
    } catch (e: any) { toast.error(e.message) }
    finally { setIsLoading(false) }
  }

  const currentType = ANALYSIS_TYPES.find(t => t.value === selectedType)
  const examples = getExamplePrompts(user.role)[selectedType] ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Başlık */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-6 w-6 text-primary" />
          AI Analiz
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">{getRoleLabel(user.role)}</Badge>
          <Badge className="text-xs bg-accent/10 text-accent border-accent/30">
            <Sparkles className="h-2.5 w-2.5 mr-1" />
            OpenRouter AI
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Analiz Türleri */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Analiz Türü</p>
          {ANALYSIS_TYPES.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={() => { setSelectedType(value); setHistory([]); }}
              className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-all ${
                selectedType === value
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-border/80 hover:bg-muted/40'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${selectedType === value ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Sağ: Input + Yanıtlar */}
        <div className="lg:col-span-2 space-y-4">
          {/* Input Alanı */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {currentType && <currentType.icon className="h-4 w-4 text-primary" />}
                {currentType?.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedType === 'SMART_KARNE' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Kapsam Türü</Label>
                      <Select value={smartScope} onValueChange={(val) => val && setSmartScope(val)}>
                        <SelectTrigger className="h-9">
                          <span className="flex-1 text-left line-clamp-1">
                            {smartScope === 'COUNTRY' ? 'Türkiye Geneli' : smartScope === 'REGION' ? 'Bölge' : 'İl'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {user.role !== 'IL_KOORDINATOR' && (
                            <>
                              <SelectItem value="COUNTRY">Türkiye Geneli</SelectItem>
                              <SelectItem value="REGION">Bölge</SelectItem>
                            </>
                          )}
                          <SelectItem value="PROVINCE">İl</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {smartScope === 'REGION' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Bölge</Label>
                        <Select value={smartRegionId} onValueChange={(val) => val && setSmartRegionId(val)}>
                          <SelectTrigger className="h-9">
                            <span className="flex-1 text-left line-clamp-1 text-muted-foreground">
                              {smartRegionId ? `${regions.find(r => r.id.toString() === smartRegionId)?.name} Bölge` : 'Seçiniz'}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {regions.map(r => <SelectItem key={r.id} value={r.id.toString()}>{r.name} Bölge</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {smartScope === 'PROVINCE' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">İl</Label>
                        <Select value={smartProvinceId} onValueChange={(val) => val && setSmartProvinceId(val)}>
                          <SelectTrigger className="h-9">
                            <span className="flex-1 text-left line-clamp-1 text-muted-foreground">
                              {smartProvinceId ? provinces.find(p => p.id.toString() === smartProvinceId)?.name : 'Seçiniz'}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {provinces.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Zaman Aralığı</Label>
                      <Select value={smartTimeframe} onValueChange={(val) => val && setSmartTimeframe(val)}>
                        <SelectTrigger className="h-9">
                          <span className="flex-1 text-left line-clamp-1">
                            {smartTimeframe === 'YEARLY' ? 'Yıllık (Karne)' : smartTimeframe === 'MONTHLY' ? 'Aylık' : 'Haftalık'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="YEARLY">Yıllık (Karne)</SelectItem>
                          <SelectItem value="MONTHLY">Aylık</SelectItem>
                          <SelectItem value="WEEKLY">Haftalık</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Yıl</Label>
                      <Select value={smartYear} onValueChange={(val) => val && setSmartYear(val)}>
                        <SelectTrigger className="h-9">
                          <span className="flex-1 text-left line-clamp-1">{smartYear}</span>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2026">2026</SelectItem>
                          <SelectItem value="2025">2025</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ) : (
                <Textarea
                  value={userPrompt}
                  onChange={e => setUserPrompt(e.target.value)}
                  placeholder={selectedType === 'SERBEST'
                    ? (user.role === 'IL_KOORDINATOR' 
                        ? 'Sorunuzu yazın... (örn: Hangi ilçede eksikliğimiz var?)' 
                        : 'Sorunuzu yazın... (örn: Hangi bölge en hızlı büyüyor?)')
                    : 'İsteğe bağlı ek talimat ekleyin veya boş bırakın...'}
                  rows={3}
                  className="text-sm resize-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.ctrlKey) runAnalysis()
                  }}
                />
              )}

              {/* Örnek Promptlar */}
              {examples.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Örnek sorular:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {examples.map((ex) => (
                      <button
                        key={ex}
                        onClick={() => setUserPrompt(ex)}
                        className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors text-left"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Ctrl+Enter ile gönder</p>
                <Button onClick={runAnalysis} disabled={isLoading} className="gap-1.5">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isLoading ? 'Analiz ediliyor...' : 'Gönder'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Yanıt Geçmişi */}
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground border border-dashed border-border rounded-xl">
              <Bot className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm">Henüz analiz yapılmadı</p>
              <p className="text-xs mt-1">Bir soru sorun veya analiz türü seçin</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {history.map((item, i) => (
                <Card key={i} className="border-accent/20 bg-accent/3">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {ANALYSIS_TYPES.find(t => t.value === item.type)?.label ?? item.type}
                        </Badge>
                        {item.userPrompt && (
                          <span className="text-xs text-muted-foreground italic">"{item.userPrompt.slice(0, 50)}{item.userPrompt.length > 50 ? '…' : ''}"</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {item.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div 
                      ref={(el) => { reportRefs.current[i] = el }}
                      className="text-sm text-foreground leading-relaxed bg-white rounded-lg p-5 border shadow-sm prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: marked(item.response) as string }}
                    />
                    {item.type === 'SMART_KARNE' && (
                      <div className="mt-3 flex justify-end">
                        <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => handlePdf(i, item.type)}>
                          <Download className="h-4 w-4" /> PDF İndir
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
