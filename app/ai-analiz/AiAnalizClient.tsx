'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Bot, Send, Loader2, Sparkles, FileText, BarChart2, TrendingUp, Award, Building2, MessageSquare, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import { getRoleLabel } from '@/lib/authz'
import type { SessionUser } from '@/lib/authz'

interface Props { user: SessionUser }

const ANALYSIS_TYPES = [
  { value: 'KARNE', label: 'İl Karnesi', icon: Award, desc: 'İl sıralaması ve puan analizi' },
  { value: 'TREND', label: 'Trend Analizi', icon: TrendingUp, desc: 'Haftalık/aylık trend yorumu' },
  { value: 'KARSILASTIRMA', label: 'Karşılaştırma', icon: BarChart2, desc: 'İller arası karşılaştırma' },
  { value: 'HAFTALIK_RAPOR', label: 'Haftalık Rapor', icon: FileText, desc: 'Otomatik haftalık rapor' },
  { value: 'IL_BIRIM', label: 'İl Birim Analizi', icon: Building2, desc: 'İl bazlı birim dağılımı' },
  { value: 'SERBEST', label: 'Serbest Soru', icon: MessageSquare, desc: 'Özel soru & analiz' },
]

const EXAMPLE_PROMPTS: Record<string, string[]> = {
  KARNE: [
    'Hangi bölge en iyi performansı gösteriyor? Neden?',
    'Alt sıralardaki iller için öneriler ver.',
    'Birim bazında hangi eksiklikler göze çarpıyor?',
  ],
  TREND: [
    'Katılımcı sayısındaki düşüşün olası nedenleri neler?',
    'Gelecek 4 hafta için projeksiyon yap.',
    'Yaz dönemi etkisini değerlendir.',
  ],
  HAFTALIK_RAPOR: [
    'Bu haftanın özet raporunu hazırla.',
    'Genel Merkez için sunum formatında rapor oluştur.',
  ],
  KARSILASTIRMA: [
    'Doğu ve Batı bölgeleri arasındaki farkları analiz et.',
    'Neden bazı iller tutarsız performans gösteriyor?',
  ],
  IL_BIRIM: [
    'Üniversite birimi neden zayıf? Önerilerin neler?',
    'Lise birimi için başarı faktörlerini listele.',
  ],
  SERBEST: [
    'En etkili faaliyet türü hangisi ve neden?',
    'Katılımcı başına düşen puan neyi ifade ediyor?',
    'GENÇ İHH için stratejik önerilerin nelerdir?',
  ],
}

interface HistoryItem {
  type: string
  userPrompt: string
  response: string
  timestamp: Date
}

export default function AiAnalizClient({ user }: Props) {
  const [selectedType, setSelectedType] = useState('SERBEST')
  const [userPrompt, setUserPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])

  async function runAnalysis() {
    if (!userPrompt.trim() && selectedType === 'SERBEST') {
      toast.error('Lütfen bir soru veya istek yazınız')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/ai-analiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          userPrompt: userPrompt.trim() || undefined,
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'AI hatası') }
      const json = await res.json()

      setHistory(prev => [{
        type: selectedType,
        userPrompt: userPrompt.trim(),
        response: json.response,
        timestamp: new Date(),
      }, ...prev])

      setUserPrompt('')
      toast.success('Analiz tamamlandı')
    } catch (e: any) { toast.error(e.message) }
    finally { setIsLoading(false) }
  }

  const currentType = ANALYSIS_TYPES.find(t => t.value === selectedType)
  const examples = EXAMPLE_PROMPTS[selectedType] ?? []

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
              onClick={() => setSelectedType(value)}
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
              <Textarea
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                placeholder={selectedType === 'SERBEST'
                  ? 'Sorunuzu yazın... (örn: Hangi il en hızlı büyüyor?)'
                  : 'İsteğe bağlı ek talimat ekleyin veya boş bırakın...'}
                rows={3}
                className="text-sm resize-none"
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.ctrlKey) runAnalysis()
                }}
              />

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
                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 rounded-lg p-3">
                      {item.response}
                    </div>
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
