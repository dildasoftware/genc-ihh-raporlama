'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Settings, Users, Building2, Calendar, Scale, Bot, Activity, Search, RefreshCw, Plus, Trash2, Edit } from 'lucide-react'
import { getRoleLabel } from '@/lib/authz'

type TabKeys = 'users' | 'institutions' | 'periods' | 'weights' | 'aiLogs' | 'auditLogs'

export default function YonetimClient() {
  const [activeTab, setActiveTab] = useState<TabKeys>('users')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const [refs, setRefs] = useState<{ regions: any[], provinces: any[], units: any[] }>({ regions: [], provinces: [], units: [] })
  const [editingUser, setEditingUser] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isBulkInstOpen, setIsBulkInstOpen] = useState(false)
  const [bulkData, setBulkData] = useState('')

  const TABS: { key: TabKeys, label: string, icon: any }[] = [
    { key: 'users', label: 'Kullanıcı Yönetimi', icon: Users }
  ]

  const loadData = async (tab: TabKeys) => {
    setIsLoading(true)
    setData(null)
    setSearchTerm('')
    try {
      const res = await fetch(`/api/yonetim?tab=${tab}`)
      if (!res.ok) throw new Error('Veri yüklenemedi')
      setData(await res.json())
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData(activeTab)
  }, [activeTab])

  useEffect(() => {
    fetch('/api/referans')
      .then(res => res.json())
      .then(d => setRefs({ regions: d.regions || [], provinces: d.provinces || [], units: d.units || [] }))
      .catch(console.error)
  }, [])

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const isNew = !editingUser.id
      const res = await fetch('/api/yonetim', {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingUser)
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || (isNew ? 'Eklenemedi' : 'Güncellenemedi'))
      }
      toast.success(isNew ? 'Kullanıcı eklendi' : 'Kullanıcı güncellendi')
      setEditingUser(null)
      loadData('users')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleBulkInstitutionSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bulkData.trim()) return

    setIsSaving(true)
    try {
      const lines = bulkData.split('\n').map(l => l.trim()).filter(l => l)
      const parsedData = lines.map(line => {
        const parts = line.split('\t').length > 1 ? line.split('\t') : line.split(',')
        if (parts.length < 3) return null
        
        const name = parts[0].trim()
        const provinceName = parts[1].trim()
        const unitName = parts[2].trim()

        const province = refs.provinces.find(p => (p.name || '').toLowerCase() === provinceName.toLowerCase())
        const unit = refs.units.find(u => (u.name || '').toLowerCase() === unitName.toLowerCase())

        if (!province || !unit) return null

        return { name, provinceId: province.id, unitId: unit.id }
      }).filter(Boolean)

      if (parsedData.length === 0) throw new Error('Eşleşen geçerli bir veri bulunamadı. Lütfen il ve birim isimlerinin doğru olduğundan emin olun.')

      const res = await fetch('/api/yonetim/bulk-institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedData)
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Yüklenemedi')
      }
      
      const resData = await res.json()
      toast.success(`${resData.count} kurum başarıyla eklendi`)
      setIsBulkInstOpen(false)
      setBulkData('')
      loadData('institutions')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/yonetim?userId=${userId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Kullanıcı silinemedi')
      toast.success('Kullanıcı başarıyla silindi')
      loadData('users')
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mb-4" />
          <p className="text-sm text-slate-500">Yükleniyor...</p>
        </div>
      )
    }

    if (!data) return null

    if (activeTab === 'users') {
      const filtered = data.filter((u: any) => (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()))
      return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800">Kullanıcılar ({filtered.length})</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Kullanıcı ara..." className="h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 w-64" />
              </div>
              <button 
                onClick={() => setEditingUser({ fullName: '', email: '', role: 'IL_KOORDINATOR', genderBranch: 'K' })}
                className="flex items-center gap-1.5 h-9 px-3 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors"
              >
                <Plus className="h-4 w-4" /> Yeni Kullanıcı
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-medium">İsim</th>
                  <th className="px-4 py-3 font-medium">E-posta</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="px-4 py-3 font-medium">Bölge/İl/Birim</th>
                  <th className="px-4 py-3 font-medium text-center">Durum</th>
                  <th className="px-4 py-3 font-medium text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.fullName}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold">
                        {getRoleLabel(u.role) || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {[u.region?.name, u.province?.name, u.unit?.name].filter(Boolean).join(' - ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.isActive ? (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs font-semibold">Aktif</span>
                      ) : (
                        <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-md text-xs font-semibold">Pasif</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={() => setEditingUser(u)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors mr-1"
                        title="Düzenle"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeTab === 'institutions') {
      const filtered = data.filter((i: any) => (i.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
      return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800">Kurumlar ({filtered.length})</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Kurum ara..." className="h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 w-64" />
              </div>
              <button 
                onClick={() => {
                  if (refs.provinces.length === 0) {
                    toast.error('Lütfen referans verilerin yüklenmesini bekleyin')
                    return
                  }
                  setIsBulkInstOpen(true)
                }}
                className="flex items-center gap-1.5 h-9 px-3 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
              >
                Toplu Ekle (CSV/TSV)
              </button>
              <button className="flex items-center gap-1.5 h-9 px-3 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors">
                <Plus className="h-4 w-4" /> Kurum Ekle
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-medium">Kurum Adı</th>
                  <th className="px-4 py-3 font-medium">İl</th>
                  <th className="px-4 py-3 font-medium">Birim</th>
                  <th className="px-4 py-3 font-medium">Fakülte Sayısı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((i: any) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{i.name}</td>
                    <td className="px-4 py-3 text-slate-600">{i.province?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{i.unit?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{i.faculties?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeTab === 'periods') {
      return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800">Dönemler ({data.length})</h3>
            <button className="flex items-center gap-1.5 h-9 px-3 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors">
              <Plus className="h-4 w-4" /> Dönem Ekle
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-medium">Yıl</th>
                  <th className="px-4 py-3 font-medium">Hafta</th>
                  <th className="px-4 py-3 font-medium">Ay</th>
                  <th className="px-4 py-3 font-medium">Başlangıç</th>
                  <th className="px-4 py-3 font-medium">Bitiş</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-800">{p.year}</td>
                    <td className="px-4 py-3 font-medium text-teal-700">Hafta {p.weekNo}</td>
                    <td className="px-4 py-3 text-slate-600">{p.month}. Ay</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(p.startDate).toLocaleDateString('tr-TR')}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(p.endDate).toLocaleDateString('tr-TR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    if (activeTab === 'aiLogs' || activeTab === 'auditLogs') {
      return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Son 100 Kayıt</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 font-medium w-48">Tarih</th>
                  <th className="px-4 py-3 font-medium w-48">Kullanıcı</th>
                  <th className="px-4 py-3 font-medium">İşlem / Tür</th>
                  <th className="px-4 py-3 font-medium">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.generatedAt || log.createdAt).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {log.user?.fullName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {log.type || log.action}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div className="line-clamp-2 max-w-lg">
                        {log.prompt || log.metaJson}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500">Bu modül yapım aşamasındadır.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
        <Settings className="h-6 w-6 text-teal-600" />
        Sistem Yönetimi
      </h1>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 shrink-0 flex flex-col gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200/50'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-4 w-4 ${activeTab === key ? 'text-teal-600' : 'text-slate-400'}`} />
              {label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 w-full min-w-0">
          {renderContent()}
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800">Kullanıcı Düzenle</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSaveUser} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Ad Soyad</label>
                <input required value={editingUser.fullName} onChange={e => setEditingUser({...editingUser, fullName: e.target.value})} className="w-full h-9 px-3 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">E-posta</label>
                <input required type="email" value={editingUser.email} onChange={e => setEditingUser({...editingUser, email: e.target.value})} className="w-full h-9 px-3 border rounded-lg text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Rol</label>
                  <select disabled value="IL_KOORDINATOR" className="w-full h-9 px-3 border rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed">
                    <option value="IL_KOORDINATOR">İl Koordinatörü</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cinsiyet Kolu</label>
                  <select value={editingUser.genderBranch || ''} onChange={e => setEditingUser({...editingUser, genderBranch: e.target.value || null})} className="w-full h-9 px-3 border rounded-lg text-sm bg-white">
                    <option value="">Tümü</option>
                    <option value="K">Kadın Kolu</option>
                    <option value="E">Erkek Kolu</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">İl</label>
                <select value={editingUser.provinceId || ''} onChange={e => setEditingUser({...editingUser, provinceId: e.target.value, role: 'IL_KOORDINATOR'})} className="w-full h-9 px-3 border rounded-lg text-sm bg-white">
                  <option value="">İl Seçiniz</option>
                  {refs.provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isActive" checked={editingUser.isActive} onChange={e => setEditingUser({...editingUser, isActive: e.target.checked})} />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Aktif Hesap</label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">İptal</button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm bg-teal-600 text-white hover:bg-teal-700 rounded-lg disabled:opacity-50">
                  {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isBulkInstOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-semibold text-slate-800">Toplu Kurum Ekle</h3>
              <button onClick={() => setIsBulkInstOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleBulkInstitutionSave} className="p-4 space-y-4">
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-4">
                <p className="text-sm text-indigo-800 font-medium mb-1">Desteklenen Format: <span className="font-mono bg-white px-1 py-0.5 rounded text-xs border border-indigo-200">Kurum Adı, İl Adı, Birim Adı</span></p>
                <p className="text-xs text-indigo-600">Excel'den doğrudan kopyalayıp yapıştırabilirsiniz (TSV) ya da virgülle ayırarak (CSV) girebilirsiniz.</p>
                <p className="text-xs text-indigo-600 mt-1 opacity-75">Örnek: <strong>Gazi Üniversitesi, Ankara, Üniversiteler</strong></p>
              </div>

              <div>
                <textarea 
                  required 
                  value={bulkData} 
                  onChange={e => setBulkData(e.target.value)} 
                  placeholder={`Marmara Üniversitesi, İstanbul, Üniversiteler\nKadıköy İmam Hatip Lisesi, İstanbul, Liseler`}
                  className="w-full h-64 p-3 border rounded-lg text-sm font-mono whitespace-pre" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsBulkInstOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">İptal</button>
                <button type="submit" disabled={isSaving || !bulkData.trim()} className="px-4 py-2 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg disabled:opacity-50">
                  {isSaving ? 'Yükleniyor...' : 'Verileri İçe Aktar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
