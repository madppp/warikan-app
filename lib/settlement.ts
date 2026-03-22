export type Member = {
  id: string
  name: string
  ratio: number
}

export type Split = {
  memberId: string
  member: Member
}

export type Expense = {
  id: string
  amount: number
  paidById: string
  splits: Split[]
}

export type MemberBalance = {
  id: string
  name: string
  ratio: number
  paid: number
  owed: number
  balance: number
}

export type Transfer = {
  fromId: string
  fromName: string
  toId: string
  toName: string
  amount: number
}

/**
 * Calculate each member's net balance.
 * Share = expense.amount * (member.ratio / sum of ratios of split members)
 * Last member in each split absorbs rounding remainder.
 */
export function calculateBalances(members: Member[], expenses: Expense[]): MemberBalance[] {
  const paid: Record<string, number> = {}
  const owed: Record<string, number> = {}

  members.forEach((m) => {
    paid[m.id] = 0
    owed[m.id] = 0
  })

  for (const expense of expenses) {
    paid[expense.paidById] = (paid[expense.paidById] || 0) + expense.amount

    const ratioSum = expense.splits.reduce((sum, s) => sum + s.member.ratio, 0)
    if (ratioSum === 0) continue

    let totalAssigned = 0
    for (let i = 0; i < expense.splits.length; i++) {
      const split = expense.splits[i]
      let share: number
      if (i === expense.splits.length - 1) {
        share = expense.amount - totalAssigned
      } else {
        share = Math.round((expense.amount * split.member.ratio) / ratioSum)
        totalAssigned += share
      }
      owed[split.memberId] = (owed[split.memberId] || 0) + share
    }
  }

  return members.map((m) => ({
    id: m.id,
    name: m.name,
    ratio: m.ratio,
    paid: paid[m.id] || 0,
    owed: owed[m.id] || 0,
    balance: (paid[m.id] || 0) - (owed[m.id] || 0),
  }))
}

/**
 * Calculate minimum transfers to settle all debts (greedy algorithm).
 * Minimizes the number of transfers.
 */
export function calculateSettlement(members: Member[], expenses: Expense[]): Transfer[] {
  const balances = calculateBalances(members, expenses)

  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ id: b.id, name: b.name, amount: b.balance }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ id: b.id, name: b.name, amount: -b.balance }))
    .sort((a, b) => b.amount - a.amount)

  const transfers: Transfer[] = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount)
    if (amount > 0) {
      transfers.push({
        fromId: debtors[i].id,
        fromName: debtors[i].name,
        toId: creditors[j].id,
        toName: creditors[j].name,
        amount,
      })
    }
    debtors[i].amount -= amount
    creditors[j].amount -= amount
    if (debtors[i].amount === 0) i++
    if (creditors[j].amount === 0) j++
  }

  return transfers
}

export type KanjiSettlement = {
  /** 幹事が集める相手: balance < 0 の人（幹事以外） */
  collect: { id: string; name: string; amount: number; rawAmount: number }[]
  /** 幹事が返す相手: balance > 0 の人（幹事以外） */
  returnTo: { id: string; name: string; amount: number }[]
  /** 幹事自身のbalance */
  kanjiBalance: number
  /** 100円単位丸めによる余剰金額 */
  surplus: number
}

/**
 * 幹事を中心にした精算計算。
 * roundTo100=true の場合、集める金額を100円単位に切り上げ、余りを surplus として返す。
 */
export function calculateKanjiSettlement(
  members: Member[],
  expenses: Expense[],
  kanjiId: string,
  roundTo100 = false
): KanjiSettlement {
  const balances = calculateBalances(members, expenses)

  const collect: { id: string; name: string; amount: number; rawAmount: number }[] = []
  const returnTo: { id: string; name: string; amount: number }[] = []
  let kanjiBalance = 0

  for (const b of balances) {
    if (b.id === kanjiId) {
      kanjiBalance = b.balance
      continue
    }
    if (b.balance < 0) {
      const rawAmount = -b.balance
      const amount = roundTo100 ? Math.ceil(rawAmount / 100) * 100 : rawAmount
      collect.push({ id: b.id, name: b.name, amount, rawAmount })
    } else if (b.balance > 0) {
      returnTo.push({ id: b.id, name: b.name, amount: b.balance })
    }
  }

  const surplus = roundTo100
    ? collect.reduce((s, c) => s + (c.amount - c.rawAmount), 0)
    : 0

  return { collect, returnTo, kanjiBalance, surplus }
}

/**
 * "まとめモード": Each debtor pays their entire debt to the single largest creditor.
 * Minimizes the number of people who need to make payments (each debtor pays exactly 1 person).
 * The creditors then settle among themselves separately.
 */
export function calculateBulkSettlement(members: Member[], expenses: Expense[]): Transfer[] {
  const balances = calculateBalances(members, expenses)

  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ id: b.id, name: b.name, amount: b.balance }))
    .sort((a, b) => b.amount - a.amount)

  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ id: b.id, name: b.name, amount: -b.balance }))
    .sort((a, b) => b.amount - a.amount)

  if (creditors.length === 0 || debtors.length === 0) return []

  const transfers: Transfer[] = []

  // Each debtor pays their full amount to the top creditor (most owed)
  for (const debtor of debtors) {
    // Find the creditor with the highest remaining balance
    creditors.sort((a, b) => b.amount - a.amount)
    const topCreditor = creditors[0]
    if (topCreditor.amount <= 0) break

    transfers.push({
      fromId: debtor.id,
      fromName: debtor.name,
      toId: topCreditor.id,
      toName: topCreditor.name,
      amount: debtor.amount,
    })
    topCreditor.amount -= debtor.amount
  }

  return transfers
}
