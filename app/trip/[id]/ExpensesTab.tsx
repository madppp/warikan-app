'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Users, Receipt } from 'lucide-react'

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
type Trip = { id: string; name: string; members: Member[]; expenses: Expense[] }

type FormMode = 'add' | 'edit'

export default function ExpensesTab({ trip, onUpdate }: { trip: Trip; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('add')
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidById, setPaidById] = useState(trip.members[0]?.id ?? '')
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(
    new Set(trip.members.map((m) => m.id))
  )
  const [saving, setSaving] = useState(false)

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openAddForm() {
    setFormMode('add')
    setEditingExpenseId(null)
    setDescription('')
    setAmount('')
    setPaidById(trip.members[0]?.id ?? '')
    setSelectedMemberIds(new Set(trip.members.map((m) => m.id)))
    setShowForm(true)
  }

  function openEditForm(expense: Expense) {
    setFormMode('edit')
    setEditingExpenseId(expense.id)
    setDescription(expense.description)
    setAmount(String(expense.amount))
    setPaidById(expense.paidById)
    setSelectedMemberIds(new Set(expense.splits.map((s) => s.memberId)))
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!description.trim() || !amount || selectedMemberIds.size === 0) return
    setSaving(true)
    try {
      if (formMode === 'add') {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId: trip.id,
            description: description.trim(),
            amount: Number(amount),
            paidById,
            memberIds: Array.from(selectedMemberIds),
          }),
        })
        if (!res.ok) throw new Error()
      } else {
        const res = await fetch(`/api/expenses/${editingExpenseId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: description.trim(),
            amount: Number(amount),
            paidById,
            memberIds: Array.from(selectedMemberIds),
          }),
        })
        if (!res.ok) throw new Error()
      }
      setShowForm(false)
      onUpdate()
    } catch {
      alert(formMode === 'add' ? '支出の追加に失敗しました' : '支出の更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(expenseId: string, desc: string) {
    if (!confirm(`「${desc}」を削除しますか？`)) return
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      onUpdate()
    } catch {
      alert('削除に失敗しました')
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  if (trip.members.length === 0) {
    return (
      <div className="p-4 text-center py-16" style={{ color: 'var(--gray)' }}>
        <Users size={40} className="mx-auto mb-2" />
        <p className="text-sm">先にメンバーを追加してください</p>
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Add Button */}
      <button className="ios-btn ios-btn-primary gap-1.5" onClick={openAddForm}>
        <Plus size={18} />支出を追加
      </button>

      {/* Modal Form (add & edit) */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div className="w-full ios-card rounded-b-none" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '0.5px solid var(--separator)' }}>
              <button onClick={() => setShowForm(false)} style={{ color: 'var(--blue)' }}>キャンセル</button>
              <span className="font-semibold">{formMode === 'add' ? '支出を追加' : '支出を編集'}</span>
              <button
                onClick={handleSubmit}
                style={{ color: saving ? 'var(--gray)' : 'var(--blue)', fontWeight: 600 }}
                disabled={saving}
              >
                {saving ? '保存中' : '保存'}
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>内容</label>
                <input
                  className="ios-input"
                  placeholder="例：夕食、宿泊費"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>金額（円）</label>
                <input
                  className="ios-input"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-secondary)' }}>支払った人</label>
                <select
                  className="ios-input"
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                >
                  {trip.members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>
                  割り勘メンバー（{selectedMemberIds.size}人）
                </label>
                <div className="ios-card">
                  {trip.members.map((m) => (
                    <label key={m.id} className="ios-list-item gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.has(m.id)}
                        onChange={() => toggleMember(m.id)}
                        className="w-5 h-5 accent-blue-500"
                      />
                      <span className="flex-1">{m.name}</span>
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {m.ratio === 0.5 ? '子供' : m.ratio === 1.0 ? '大人' : `×${m.ratio}`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Total Card */}
      {trip.expenses.length > 0 && (
        <div className="ios-card px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>旅行の総費用</span>
          <span className="text-2xl font-bold" style={{ color: 'var(--blue)' }}>
            ¥{trip.expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
          </span>
        </div>
      )}

      {/* Expenses List */}
      {trip.expenses.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--gray)' }}>
          <Receipt size={40} className="mx-auto mb-2" />
          <p className="text-sm">支出を追加してください</p>
        </div>
      ) : (
        <div className="ios-card">
          <div className="px-4 py-2 text-xs font-semibold" style={{ color: 'var(--gray)', borderBottom: '0.5px solid var(--separator)' }}>
            支出一覧（合計: ¥{trip.expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}）
          </div>
          {trip.expenses.map((expense) => (
            <div key={expense.id} className="ios-list-item justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{expense.description}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {expense.paidBy.name}が支払 · {formatDate(expense.createdAt)} · {expense.splits.length}人で割り勘
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <span className="font-semibold" style={{ color: 'var(--blue)' }}>
                  ¥{expense.amount.toLocaleString()}
                </span>
                <button
                  onClick={() => openEditForm(expense)}
                  className="flex items-center justify-center px-2 py-1 rounded-lg"
                  style={{ color: 'var(--blue)', background: '#F0F0EE', minHeight: '32px', minWidth: '32px' }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => handleDelete(expense.id, expense.description)}
                  className="flex items-center justify-center px-2 py-1 rounded-lg"
                  style={{ color: 'var(--red)', background: '#FDEEED', minHeight: '32px', minWidth: '32px' }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
