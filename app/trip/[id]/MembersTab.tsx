'use client'

import { useState } from 'react'
import { Crown, Pencil, Trash2, Plus, Users } from 'lucide-react'

type Member = { id: string; name: string; ratio: number; tripId: string }
type Trip = { id: string; name: string; kanjiId: string | null; members: Member[]; expenses: any[] }

function ratioLabel(ratio: number) {
  if (ratio === 0.5) return '子供'
  if (ratio === 1.0) return '大人'
  return `×${ratio}`
}

function parseRatio(value: string): number {
  const n = Math.round(parseFloat(value) * 10) / 10
  if (isNaN(n) || n <= 0) return 1.0
  return Math.min(Math.max(n, 0.1), 9.9)
}

export default function MembersTab({ trip, onUpdate }: { trip: Trip; onUpdate: () => void }) {
  const [name, setName] = useState('')
  const [ratioInput, setRatioInput] = useState('1')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editRatioInput, setEditRatioInput] = useState('1')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: trip.id, name: name.trim(), ratio: parseRatio(ratioInput) }),
      })
      if (!res.ok) throw new Error()
      setName('')
      setRatioInput('1')
      onUpdate()
    } catch {
      alert('メンバーの追加に失敗しました')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(memberId: string, memberName: string) {
    if (!confirm(`「${memberName}」を削除しますか？`)) return
    try {
      const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onUpdate()
    } catch {
      alert('削除に失敗しました')
    }
  }

  function startEdit(member: Member) {
    setEditingId(member.id)
    setEditName(member.name)
    setEditRatioInput(String(member.ratio))
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingId) return
    try {
      const res = await fetch(`/api/members/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), ratio: parseRatio(editRatioInput) }),
      })
      if (!res.ok) throw new Error()
      setEditingId(null)
      onUpdate()
    } catch {
      alert('更新に失敗しました')
    }
  }

  async function handleSetKanji(memberId: string) {
    const isAlready = trip.kanjiId === memberId
    try {
      const res = await fetch(`/api/trips/${trip.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kanjiId: isAlready ? null : memberId }),
      })
      if (!res.ok) throw new Error()
      onUpdate()
    } catch {
      alert('幹事の設定に失敗しました')
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Add Member Form */}
      <div className="ios-card p-4">
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
          メンバーを追加
        </h2>
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <input
            className="ios-input"
            placeholder="名前"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <input
              className="ios-input"
              type="number"
              placeholder="1"
              value={ratioInput}
              onChange={(e) => setRatioInput(e.target.value)}
              step="0.1"
              min="0.1"
              max="9.9"
            />
            <span className="text-sm shrink-0" style={{ color: 'var(--text-secondary)' }}>
              割合（大人=1、子供=0.5）
            </span>
          </div>
          <button
            type="submit"
            className="ios-btn ios-btn-primary gap-1.5"
            disabled={adding || !name.trim()}
            style={{ opacity: !name.trim() ? 0.5 : 1 }}
          >
            {adding ? '追加中…' : <><Plus size={18} />追加</>}
          </button>
        </form>
      </div>

      {/* Members List */}
      {trip.members.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--gray)' }}>
          <Users size={40} className="mx-auto mb-2" />
          <p className="text-sm">メンバーを追加してください</p>
        </div>
      ) : (
        <div className="ios-card">
          <div className="px-4 py-2 text-xs font-semibold" style={{ color: 'var(--gray)', borderBottom: '0.5px solid var(--separator)' }}>
            メンバー一覧
          </div>
          {trip.members.map((member) => (
            <div key={member.id}>
              {editingId === member.id ? (
                <form onSubmit={handleEdit} className="p-4 flex flex-col gap-2" style={{ borderBottom: '0.5px solid var(--separator)' }}>
                  <input
                    className="ios-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      className="ios-input"
                      type="number"
                      value={editRatioInput}
                      onChange={(e) => setEditRatioInput(e.target.value)}
                      step="0.1"
                      min="0.1"
                      max="9.9"
                    />
                    <span className="text-sm shrink-0" style={{ color: 'var(--text-secondary)' }}>
                      割合
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="ios-btn ios-btn-primary flex-1" style={{ fontSize: '15px' }}>保存</button>
                    <button type="button" className="ios-btn flex-1" style={{ background: 'var(--bg)', fontSize: '15px' }} onClick={() => setEditingId(null)}>キャンセル</button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col" style={{ borderBottom: '0.5px solid var(--separator)' }}>
                  <div className="ios-list-item justify-between" style={{ borderBottom: 'none' }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
                        style={{ background: trip.kanjiId === member.id ? 'var(--green)' : 'var(--blue)' }}
                      >
                        {member.name[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium">{member.name}</p>
                          {trip.kanjiId === member.id && (
                            <span
                              className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded font-semibold"
                              style={{ background: '#E5F5EB', color: 'var(--green)' }}
                            >
                              <Crown size={11} />幹事
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          負担割合: {ratioLabel(member.ratio)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleSetKanji(member.id)}
                        className="text-xs px-2 py-1.5 rounded-lg"
                        style={{
                          color: trip.kanjiId === member.id ? 'var(--gray)' : 'var(--green)',
                          background: trip.kanjiId === member.id ? 'var(--bg)' : '#E5F5EB',
                          minHeight: '32px',
                          border: trip.kanjiId === member.id ? '1px solid var(--separator)' : 'none',
                        }}
                      >
                        {trip.kanjiId === member.id ? '幹事解除' : '幹事'}
                      </button>
                      <button
                        onClick={() => startEdit(member)}
                        className="flex items-center justify-center px-2 py-1.5 rounded-lg"
                        style={{ color: 'var(--blue)', background: '#EAF3FF', minHeight: '32px', minWidth: '32px' }}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id, member.name)}
                        className="flex items-center justify-center px-2 py-1.5 rounded-lg"
                        style={{ color: 'var(--red)', background: '#FFF0EE', minHeight: '32px', minWidth: '32px' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
