'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Trip = {
  id: string
  name: string
  createdAt: string
  _count: { members: number; expenses: number }
}

export default function HomePage() {
  const router = useRouter()
  const [tripName, setTripName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [trips, setTrips] = useState<Trip[]>([])
  const [loadingTrips, setLoadingTrips] = useState(true)

  useEffect(() => {
    fetch('/api/trips')
      .then((r) => r.json())
      .then((data) => { setTrips(data); setLoadingTrips(false) })
      .catch(() => setLoadingTrips(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!tripName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tripName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/trip/${data.id}`)
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
      setCreating(false)
    }
  }

  return (
    <main className="min-h-screen pb-10" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm mx-auto px-4">
        {/* Header */}
        <div className="text-center pt-16 pb-8">
          <h1 className="text-5xl font-bold mb-2" style={{ letterSpacing: '-1px' }}>割り勘</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>旅行グループの支出を管理</p>
        </div>

        {/* Create Group */}
        <div className="ios-card p-5 mb-6">
          <h2 className="text-base font-semibold mb-3">新しいグループを作成</h2>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <input
              className="ios-input"
              placeholder="グループ名（例：沖縄旅行）"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              disabled={creating}
            />
            <button
              type="submit"
              className="ios-btn ios-btn-primary"
              disabled={creating || !tripName.trim()}
              style={{ opacity: !tripName.trim() ? 0.5 : 1 }}
            >
              {creating ? '作成中…' : '作成する'}
            </button>
          </form>
          {error && (
            <p className="mt-3 text-sm text-center rounded-xl py-2" style={{ background: '#FFE5E5', color: 'var(--red)' }}>
              {error}
            </p>
          )}
        </div>

        {/* Trip List */}
        <div>
          <h2 className="text-xs font-semibold px-1 mb-2" style={{ color: 'var(--text-secondary)' }}>
            作成済みの旅行
          </h2>

          {loadingTrips ? (
            <div className="ios-card px-4 py-6 text-center text-sm" style={{ color: 'var(--gray)' }}>
              読み込み中…
            </div>
          ) : trips.length === 0 ? (
            <div className="ios-card px-4 py-8 text-center">
              <p className="text-2xl mb-2">✈️</p>
              <p className="text-sm" style={{ color: 'var(--gray)' }}>まだ旅行がありません</p>
            </div>
          ) : (
            <div className="ios-card">
              {trips.map((trip, i) => (
                <button
                  key={trip.id}
                  className="w-full ios-list-item justify-between"
                  style={{ borderBottom: i < trips.length - 1 ? '0.5px solid var(--separator)' : 'none' }}
                  onClick={() => router.push(`/trip/${trip.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0"
                      style={{ background: 'var(--blue)' }}
                    >
                      ✈
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-medium truncate">{trip.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {trip._count.members}人 · {trip._count.expenses}件の支出
                      </p>
                    </div>
                  </div>
                  <svg width="8" height="13" viewBox="0 0 8 13" fill="none" className="shrink-0 ml-2" style={{ color: 'var(--gray)' }}>
                    <path d="M1 1l6 5.5L1 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
