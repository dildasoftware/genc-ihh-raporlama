'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Settings, Users, Building2, Calendar, Scale, Bot, Activity, Search, RefreshCw, Plus } from 'lucide-react'

type TabKeys = 'users' | 'institutions' | 'periods' | 'weights' | 'aiLogs' | 'auditLogs'

export default function YonetimClient() {
  const [activeTab, setActiveTab] = useState<TabKeys>('users')
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const TABS: { key: TabKeys, label: string, icon: any }[] = [
    { key: 'users', label: 'Kullanıcı Yönetimi', icon: Users },
    { key: 'institutions', label: 'Kurum Yönetimi', icon: Building2 },
    { key: 'periods', label: 'Dönem Yönetimi', icon: Calendar },
    { key: 'weights', label: 'Puan Ağırlıkları', icon: Scale },
    { key: 'aiLogs', label: 'AI Geçmişi', icon: Bot },
    { key: 'auditLogs', label: 'Denetim Kaydı', icon: Activity },
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
      const filtered = data.filter((u: any) => u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
      return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800">Kullanıcılar ({filtered.length})</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Kullanıcı ara..." className="h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 w-64" />
              </div>
              <button className="flex items-center gap-1.5 h-9 px-3 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors">
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
                  <th className="px-4 py-3 font-medium text-right">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.fullName}</td>
                    <td className="px-4 py-3 text-slate-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold">{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {[u.region?.name, u.province?.name, u.unit?.name].filter(Boolean).join(' - ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.isActive ? (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs font-semibold">Aktif</span>
                      ) : (
                        <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-md text-xs font-semibold">Pasif</span>
                      )}
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
      const filtered = data.filter((i: any) => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
      return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-semibold text-slate-800">Kurumlar ({filtered.length})</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Kurum ara..." className="h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 w-64" />
              </div>
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
    </div>
  )
}
