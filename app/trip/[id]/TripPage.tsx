'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import MembersTab from './MembersTab'
import ExpensesTab from './ExpensesTab'
import SettlementTab from './SettlementTab'

type Member = {
  id: string
  name: string
  ratio: number
  tripId: string
}

type Split = {
  id: string
  memberId: string
  member: Member
}

type Expense = {
  id: string
  tripId: string
  description: string
  amount: number
  paidById: string
  createdAt: string
  paidBy: Member
  splits: Split[]
}

type Trip = {
  id: string
  name: string
  kanjiId: string | null
  members: Member[]
  expenses: Expense[]
}

const TABS = [
  { key: 'members', label: 'メンバー', icon: '👥' },
  { key: 'expenses', label: '支出', icon: '💴' },
  { key: 'settlement', label: '精算', icon: '✅' },
] as const

type TabKey = typeof TABS[number]['key']

export default function TripPage({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('members')

  const fetchTrip = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}`, { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'グループが見つかりません')
      }
      const data = await res.json()
      setTrip(data)
      setError('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    fetchTrip()
  }, [fetchTrip])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center" style={{ color: 'var(--gray)' }}>
          <div className="text-3xl mb-2">⏳</div>
          <p>読み込み中…</p>
        </div>
      </div>
    )
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
        <div className="ios-card p-6 text-center w-full max-w-sm">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="font-semibold mb-1">エラー</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error || 'グループが見つかりません'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 pb-3"
        style={{
          background: 'rgba(242, 242, 247, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '0.5px solid var(--separator)',
          paddingTop: 'max(44px, env(safe-area-inset-top, 44px))',
        }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-0.5 mb-1"
          style={{ color: 'var(--blue)', fontSize: '17px' }}
        >
          <svg width="11" height="18" viewBox="0 0 11 18" fill="none" style={{ marginRight: '2px' }}>
            <path d="M9.5 1.5L2 9l7.5 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          トップ
        </Link>
        <h1 className="text-xl font-bold leading-tight">{trip.name}</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          {trip.members.length}人 · {trip.expenses.length}件の支出
        </p>
      </header>

      {/* Content */}
      <div className="pb-24">
        {activeTab === 'members' && (
          <MembersTab trip={trip} onUpdate={fetchTrip} />
        )}
        {activeTab === 'expenses' && (
          <ExpensesTab trip={trip} onUpdate={fetchTrip} />
        )}
        {activeTab === 'settlement' && (
          <SettlementTab trip={trip} />
        )}
      </div>

      {/* Tab Bar */}
      <nav className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-item ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="text-xl mb-0.5">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
