'use client'

import { useState } from 'react'
import { Crown, Share2, ChevronDown, ChevronUp, Users, Receipt } from 'lucide-react'
import { calculateKanjiSettlement, calculateBalances } from '@/lib/settlement'

type Member = { id: string; name: string; ratio: number; tripId: string }
type Split = { id: string; memberId: string; member: Member }
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

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  setTimeout(onDone, 2000)
  return (
    <div
      className="fixed bottom-28 left-1/2 z-50 px-5 py-3 rounded-full text-white text-sm font-semibold"
      style={{
        transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.78)',
        backdropFilter: 'blur(10px)',
        animation: 'fadeInUp 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </div>
  )
}

export default function SettlementTab({ trip }: { trip: Trip }) {
  const [showDetail, setShowDetail] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [roundTo100, setRoundTo100] = useState(false)

  if (trip.members.length === 0) {
    return (
      <div className="p-4 text-center py-16" style={{ color: 'var(--gray)' }}>
        <Users size={40} className="mx-auto mb-2" />
        <p className="text-sm">メンバーを追加してください</p>
      </div>
    )
  }

  if (!trip.kanjiId) {
    return (
      <div className="p-4 text-center py-16" style={{ color: 'var(--gray)' }}>
        <Crown size={40} className="mx-auto mb-3" />
        <p className="font-semibold mb-1">幹事が設定されていません</p>
        <p className="text-sm">メンバータブから幹事を設定してください</p>
      </div>
    )
  }

  if (trip.expenses.length === 0) {
    return (
      <div className="p-4 text-center py-16" style={{ color: 'var(--gray)' }}>
        <Receipt size={40} className="mx-auto mb-2" />
        <p className="text-sm">支出を追加してください</p>
      </div>
    )
  }

  const kanji = trip.members.find((m) => m.id === trip.kanjiId)!
  const settlement = calculateKanjiSettlement(trip.members, trip.expenses, trip.kanjiId, roundTo100)
  const balances = calculateBalances(trip.members, trip.expenses)
  const totalAmount = trip.expenses.reduce((s, e) => s + e.amount, 0)
  const totalRatio = trip.members.reduce((s, m) => s + m.ratio, 0)
  const perRatioUnit = Math.round(totalAmount / totalRatio)

  const adultCount = trip.members.filter((m) => m.ratio >= 1.0).length
  const childCount = trip.members.filter((m) => m.ratio < 1.0).length

  // LINE コピーテキスト生成
  function buildLineText(): string {
    const allMemberIds = new Set(trip.members.map((m) => m.id))

    // 全員割り勘でない支出を検出
    const partialExpenses = trip.expenses.filter((e) => {
      const splitIds = new Set(e.splits.map((s) => s.memberId))
      return allMemberIds.size !== splitIds.size ||
        Array.from(allMemberIds).some((id) => !splitIds.has(id))
    })
    const partialNotes = partialExpenses.map((e) => {
      const splitIds = new Set(e.splits.map((s) => s.memberId))
      const excluded = trip.members
        .filter((m) => !splitIds.has(m.id))
        .map((m) => m.name)
      return `${e.description}（${excluded.join('、')}を除く）`
    })

    const lines: string[] = []
    lines.push(`【${trip.name} 精算のお願い】`)
    lines.push('')
    lines.push('■ 旅行の総費用')
    lines.push(`合計：¥${totalAmount.toLocaleString()}`)
    const memberDesc = childCount > 0
      ? `${trip.members.length}人（大人${adultCount}人・子供${childCount}人）`
      : `${trip.members.length}人`
    lines.push(`メンバー：${memberDesc}`)

    // 各自の負担額
    lines.push('')
    lines.push('■ 各自の負担額')
    balances.forEach((b) => {
      const isChild = trip.members.find((m) => m.id === b.id)!.ratio < 1.0
      const label = isChild ? `（子供）` : ''
      lines.push(`・${b.name}：¥${b.owed.toLocaleString()}${label}`)
    })

    if (settlement.collect.length > 0) {
      lines.push('')
      lines.push('■ 集める')
      settlement.collect.forEach((c) => lines.push(`・${c.name} → ¥${c.amount.toLocaleString()}`))
    }

    const returnItems: { name: string; amount: number }[] = []
    if (settlement.kanjiBalance > 0) {
      returnItems.push({ name: kanji.name, amount: settlement.kanjiBalance })
    }
    returnItems.push(...settlement.returnTo)
    if (returnItems.length > 0) {
      lines.push('')
      lines.push('■ 返す')
      returnItems.forEach((r) => lines.push(`・${r.name} → ¥${r.amount.toLocaleString()}`))
    }

    const notes: string[] = []
    if (roundTo100 && settlement.surplus > 0) {
      notes.push(`※ 余り ¥${settlement.surplus.toLocaleString()} は幹事が預かります`)
    }
    if (partialNotes.length > 0) {
      notes.push(`※ 一部割り勘調整あり：${partialNotes.join('、')}`)
    }
    if (notes.length > 0) {
      lines.push('')
      notes.forEach((n) => lines.push(n))
    }

    return lines.join('\n')
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildLineText())
      setToastMsg('コピーしました')
    } catch {
      setToastMsg('コピーに失敗しました')
    }
  }

  const allSettled =
    settlement.collect.length === 0 &&
    settlement.returnTo.length === 0 &&
    settlement.kanjiBalance === 0

  return (
    <div className="p-4 flex flex-col gap-4">

      {/* Total Card */}
      <div className="ios-card px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>旅行の総費用</span>
        <span className="text-2xl font-bold" style={{ color: 'var(--blue)' }}>
          ¥{totalAmount.toLocaleString()}
        </span>
      </div>

      {/* 丸めトグル（セグメントコントロール） */}
      <div
        className="flex p-1 rounded-xl"
        style={{ background: 'var(--separator)' }}
      >
        {(['exact', 'round100'] as const).map((mode) => {
          const active = (mode === 'exact') === !roundTo100
          return (
            <button
              key={mode}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: active ? 'white' : 'transparent',
                color: active ? 'var(--text)' : 'var(--text-secondary)',
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.15)' : 'none',
              }}
              onClick={() => setRoundTo100(mode === 'round100')}
            >
              {mode === 'exact' ? '円単位（そのまま）' : '100円単位（切り上げ）'}
            </button>
          )
        })}
      </div>

      {/* 余り表示（100円単位のみ） */}
      {roundTo100 && settlement.surplus > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: '#FFFBEA', border: '1px solid #F5CBA7' }}
        >
          <div className="flex items-center gap-2">
            <span>🪙</span>
            <span className="text-sm font-semibold" style={{ color: '#B7770D' }}>余り</span>
          </div>
          <span className="font-bold" style={{ color: '#B7770D' }}>
            ¥{settlement.surplus.toLocaleString()}
          </span>
        </div>
      )}

      {/* 集める */}
      <div className="ios-card overflow-hidden">
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{ background: '#FFF5F5', borderBottom: '0.5px solid var(--separator)' }}
        >
          <span className="text-base">🧾</span>
          <span className="text-sm font-semibold" style={{ color: '#C0392B' }}>
            {kanji.name}が集める
          </span>
        </div>
        {settlement.collect.length === 0 ? (
          <div className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            集める相手はいません
          </div>
        ) : (
          settlement.collect.map((c) => (
            <div key={c.id} className="ios-list-item justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ background: 'var(--red)' }}
                >
                  {c.name[0]}
                </div>
                <div>
                  <span className="font-medium">{c.name}から</span>
                  {roundTo100 && c.amount !== c.rawAmount && (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      正確には ¥{c.rawAmount.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <span className="font-bold text-lg" style={{ color: 'var(--red)' }}>
                ¥{c.amount.toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 返す */}
      <div className="ios-card overflow-hidden">
        <div
          className="px-4 py-2.5 flex items-center gap-2"
          style={{ background: '#F0FFF4', borderBottom: '0.5px solid var(--separator)' }}
        >
          <span className="text-base">💸</span>
          <span className="text-sm font-semibold" style={{ color: '#27AE60' }}>
            {kanji.name}が返す
          </span>
        </div>
        {/* 幹事自身の余剰 */}
        {settlement.kanjiBalance > 0 && (
          <div className="ios-list-item justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                style={{ background: 'var(--green)' }}
              >
                {kanji.name[0]}
              </div>
              <div>
                <span className="font-medium">{kanji.name}</span>
                <span
                  className="ml-1.5 text-xs px-1.5 py-0.5 rounded font-semibold"
                  style={{ background: '#E5F5EB', color: 'var(--green)' }}
                >
                  <Crown size={11} className="inline mr-0.5" />幹事
                </span>
              </div>
            </div>
            <span className="font-bold text-lg" style={{ color: 'var(--green)' }}>
              ¥{settlement.kanjiBalance.toLocaleString()}
            </span>
          </div>
        )}
        {settlement.returnTo.length === 0 && settlement.kanjiBalance <= 0 ? (
          <div className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            返す相手はいません
          </div>
        ) : (
          settlement.returnTo.map((r) => (
            <div key={r.id} className="ios-list-item justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ background: 'var(--green)' }}
                >
                  {r.name[0]}
                </div>
                <span className="font-medium">{r.name}に</span>
              </div>
              <span className="font-bold text-lg" style={{ color: 'var(--green)' }}>
                ¥{r.amount.toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>

      {allSettled && (
        <div className="ios-card p-8 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="font-semibold">精算不要！</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>全員の負担は均等です</p>
        </div>
      )}

      {/* 計算の根拠（折りたたみ） */}
      <div className="ios-card overflow-hidden">
        <button
          className="w-full px-4 py-3 flex items-center justify-between text-sm"
          onClick={() => setShowDetail(!showDetail)}
          style={{ color: 'var(--blue)' }}
        >
          <span className="font-semibold">計算方法を見る</span>
          {showDetail ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showDetail && (
          <div style={{ borderTop: '0.5px solid var(--separator)' }}>
            <div className="px-4 py-3" style={{ background: '#F8F8F8', borderBottom: '0.5px solid var(--separator)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>合計</p>
              <p className="text-sm">
                ¥{totalAmount.toLocaleString()} ÷ ratio合計 {totalRatio.toFixed(1)} = 1ratio当たり ¥{perRatioUnit.toLocaleString()}
              </p>
            </div>
            {balances.map((b) => {
              const diff = b.balance
              return (
                <div key={b.id} className="px-4 py-3" style={{ borderBottom: '0.5px solid var(--separator)' }}>
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm">{b.name}</span>
                    <span
                      className="text-sm font-bold"
                      style={{ color: diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--gray)' }}
                    >
                      {diff > 0 ? `超過 +¥${diff.toLocaleString()}` : diff < 0 ? `不足 -¥${Math.abs(diff).toLocaleString()}` : '±0'}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    支払済 ¥{b.paid.toLocaleString()} → 負担 ¥{b.owed.toLocaleString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* LINE コピーボタン */}
      <button
        className="ios-btn"
        onClick={handleCopy}
        style={{ background: '#06C755', color: 'white', gap: '8px', fontSize: '16px' }}
      >
        <Share2 size={18} />
        <span>LINEにコピー</span>
      </button>

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg('')} />}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}
