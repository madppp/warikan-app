'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Plus, Trash2, Copy, Check } from 'lucide-react'

type Category = {
  id: string
  name: string
  count: number
  ratio: number
}

type RoundUnit = 1 | 10 | 100

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'adult', name: '大人', count: 2, ratio: 1.0 },
  { id: 'child', name: '子供', count: 0, ratio: 0.5 },
]

function genId() {
  return Math.random().toString(36).slice(2, 9)
}

function roundTo(amount: number, unit: RoundUnit): number {
  if (unit === 1) return Math.round(amount)
  return Math.ceil(amount / unit) * unit
}

export default function QuickPage() {
  const [total, setTotal] = useState('')
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES)
  const [newName, setNewName] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [roundUnit, setRoundUnit] = useState<RoundUnit>(1)
  const [copied, setCopied] = useState(false)

  const totalAmount = parseInt(total.replace(/,/g, ''), 10) || 0
  const weightedTotal = categories.reduce((sum, c) => sum + c.count * c.ratio, 0)
  const activeCategories = categories.filter((c) => c.count > 0)
  const totalPeople = categories.reduce((sum, c) => sum + c.count, 0)

  const rawPerPerson = (ratio: number) =>
    weightedTotal > 0 ? (totalAmount * ratio) / weightedTotal : 0

  const calcAmounts = () => {
    if (totalAmount === 0 || activeCategories.length === 0) return []
    return activeCategories.map((c) => {
      const perHead = roundTo(rawPerPerson(c.ratio), roundUnit)
      return { category: c, perHead, subtotal: perHead * c.count }
    })
  }

  const rows = calcAmounts()
  const roundedTotal = rows.reduce((sum, r) => sum + r.subtotal, 0)
  const diff = roundedTotal - totalAmount

  const updateCount = useCallback((id: string, delta: number) => {
    setCategories((prev) =>
      prev.map((c) => c.id === id ? { ...c, count: Math.max(0, c.count + delta) } : c)
    )
  }, [])

  const updateRatio = useCallback((id: string, value: string) => {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0.1 && num <= 5.0) {
      setCategories((prev) =>
        prev.map((c) => c.id === id ? { ...c, ratio: Math.round(num * 10) / 10 } : c)
      )
    }
  }, [])

  const removeCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const addCategory = () => {
    if (!newName.trim()) return
    setCategories((prev) => [...prev, { id: genId(), name: newName.trim(), count: 1, ratio: 1.0 }])
    setNewName('')
    setShowAddForm(false)
  }

  const buildCopyText = () => {
    const lines = ['💰 割り勘結果', '─────────────']
    rows.forEach((r) => {
      lines.push(`${r.category.name} × ${r.category.count}人：¥${r.perHead.toLocaleString()}/人`)
    })
    lines.push('─────────────')
    lines.push(`集める合計：¥${roundedTotal.toLocaleString()}`)
    if (diff !== 0) {
      lines.push(`（実費との差：${diff > 0 ? '+' : ''}${diff.toLocaleString()}円）`)
    }
    return lines.join('\n')
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildCopyText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <main className="min-h-screen pb-10" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm mx-auto px-4">
        {/* Header */}
        <div className="pt-4 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-0.5 mb-3"
            style={{ color: 'var(--blue)', fontSize: '17px' }}
          >
            <ChevronLeft size={22} strokeWidth={2.2} style={{ marginLeft: '-4px' }} />
            トップ
          </Link>
          <h1 className="text-2xl font-bold">簡易割り勘</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            飲み会・食事の素早い計算
          </p>
        </div>

        {/* 合計金額 */}
        <div className="ios-card p-4 mb-4">
          <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
            合計金額
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold" style={{ color: 'var(--text-secondary)' }}>¥</span>
            <input
              className="ios-input text-xl font-semibold"
              type="number"
              inputMode="numeric"
              placeholder="8400"
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              style={{ paddingLeft: 8 }}
            />
          </div>
        </div>

        {/* 丸め設定 */}
        <div className="ios-card p-4 mb-4">
          <label className="text-xs font-semibold mb-3 block" style={{ color: 'var(--text-secondary)' }}>
            端数の丸め
          </label>
          <div className="grid grid-cols-3 gap-1.5" style={{ background: 'var(--bg)', borderRadius: 10, padding: 3 }}>
            {([1, 10, 100] as RoundUnit[]).map((unit) => (
              <button
                key={unit}
                onClick={() => setRoundUnit(unit)}
                className="py-1.5 text-sm font-semibold rounded-lg transition-all"
                style={{
                  background: roundUnit === unit ? 'var(--card)' : 'transparent',
                  color: roundUnit === unit ? 'var(--text)' : 'var(--text-secondary)',
                  boxShadow: roundUnit === unit ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                }}
              >
                {unit === 1 ? '1円' : unit === 10 ? '10円' : '100円'}
              </button>
            ))}
          </div>
          {roundUnit > 1 && (
            <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
              {roundUnit}円単位に切り上げて計算します
            </p>
          )}
        </div>

        {/* カテゴリ設定 */}
        <div className="mb-1">
          <p className="text-xs font-semibold px-1 mb-2" style={{ color: 'var(--text-secondary)' }}>
            人数・割合の設定
          </p>
          <div className="ios-card">
            {categories.map((c, i) => (
              <div
                key={c.id}
                style={{ borderBottom: i < categories.length - 1 ? '0.5px solid var(--separator)' : 'none' }}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="font-medium text-sm w-16 shrink-0">{c.name}</span>

                  <div className="flex items-center gap-2">
                    <button
                      className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-semibold"
                      style={{ background: 'var(--separator)', color: 'var(--text)' }}
                      onClick={() => updateCount(c.id, -1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">{c.count}</span>
                    <button
                      className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-semibold text-white"
                      style={{ background: 'var(--blue)' }}
                      onClick={() => updateCount(c.id, 1)}
                    >
                      ＋
                    </button>
                  </div>

                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>割合</span>
                    <input
                      key={c.id}
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="5.0"
                      defaultValue={c.ratio}
                      onChange={(e) => updateRatio(c.id, e.target.value)}
                      className="w-14 text-center rounded-lg border text-sm font-semibold py-1"
                      style={{ borderColor: 'var(--separator)', background: 'var(--bg)' }}
                    />
                  </div>

                  {c.id !== 'adult' && c.id !== 'child' && (
                    <button
                      onClick={() => removeCategory(c.id)}
                      className="ml-2 shrink-0"
                      style={{ color: 'var(--red)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* カテゴリ追加 */}
        <div className="mb-6 mt-2">
          {showAddForm ? (
            <div className="ios-card p-3 flex gap-2">
              <input
                className="ios-input text-sm flex-1"
                placeholder="カテゴリ名（例：幹事）"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                autoFocus
              />
              <button
                className="ios-btn ios-btn-primary px-4 text-sm"
                style={{ minHeight: 44, borderRadius: 10 }}
                onClick={addCategory}
                disabled={!newName.trim()}
              >
                追加
              </button>
              <button
                className="ios-btn px-3 text-sm"
                style={{ minHeight: 44, background: 'var(--separator)', borderRadius: 10 }}
                onClick={() => { setShowAddForm(false); setNewName('') }}
              >
                キャンセル
              </button>
            </div>
          ) : (
            <button
              className="flex items-center gap-2 text-sm font-medium px-1 py-2"
              style={{ color: 'var(--blue)' }}
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={16} />
              カテゴリを追加
            </button>
          )}
        </div>

        {/* 計算結果 */}
        {totalAmount > 0 && totalPeople > 0 && (
          <div>
            <p className="text-xs font-semibold px-1 mb-2" style={{ color: 'var(--text-secondary)' }}>
              計算結果
            </p>
            <div className="ios-card mb-3">
              {rows.map((row, i) => (
                <div
                  key={row.category.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: i < rows.length - 1 ? '0.5px solid var(--separator)' : 'none' }}
                >
                  <div>
                    <span className="font-medium">{row.category.name}</span>
                    <span className="text-sm ml-1" style={{ color: 'var(--text-secondary)' }}>
                      × {row.category.count}人
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      ¥{row.perHead.toLocaleString()}
                      <span className="text-sm font-normal ml-0.5" style={{ color: 'var(--text-secondary)' }}>/人</span>
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      小計 ¥{row.subtotal.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              <div
                className="px-4 py-3"
                style={{ borderTop: '0.5px solid var(--separator)', background: 'var(--bg)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">集める合計</span>
                  <span className="font-bold text-lg">¥{roundedTotal.toLocaleString()}</span>
                </div>
                {diff !== 0 && (
                  <p className="text-xs mt-0.5 text-right" style={{ color: diff > 0 ? 'var(--green)' : 'var(--red)' }}>
                    実費との差：{diff > 0 ? '+' : ''}{diff.toLocaleString()}円
                  </p>
                )}
              </div>
            </div>

            {/* LINEコピーボタン */}
            <button
              className="ios-btn w-full flex items-center justify-center gap-2"
              style={{
                background: copied ? 'var(--green)' : 'var(--blue)',
                color: 'white',
                transition: 'background 0.2s ease',
              }}
              onClick={handleCopy}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'コピーしました！' : 'LINEに貼り付けるテキストをコピー'}
            </button>
          </div>
        )}

        {totalAmount === 0 && (
          <div className="ios-card px-4 py-8 text-center">
            <p className="text-2xl mb-2">🍺</p>
            <p className="text-sm" style={{ color: 'var(--gray)' }}>合計金額を入力してください</p>
          </div>
        )}

        {totalAmount > 0 && totalPeople === 0 && (
          <div className="ios-card px-4 py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--gray)' }}>人数を設定してください</p>
          </div>
        )}
      </div>
    </main>
  )
}
