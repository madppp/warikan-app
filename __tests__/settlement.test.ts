import { calculateBalances, calculateSettlement, Member, Expense } from '@/lib/settlement'

function mkMember(id: string, name: string, ratio = 1.0): Member {
  return { id, name, ratio }
}

function mkExpense(
  id: string,
  amount: number,
  paidById: string,
  splitMembers: Member[]
): Expense {
  return {
    id,
    amount,
    paidById,
    splits: splitMembers.map((m) => ({ memberId: m.id, member: m })),
  }
}

describe('calculateBalances', () => {
  it('2人均等割り：A が 2000円払い、B が 1000円負債', () => {
    const a = mkMember('a', 'A')
    const b = mkMember('b', 'B')
    const expenses = [mkExpense('e1', 2000, 'a', [a, b])]
    const balances = calculateBalances([a, b], expenses)
    const bA = balances.find((x) => x.id === 'a')!
    const bB = balances.find((x) => x.id === 'b')!
    expect(bA.balance).toBe(1000)  // paid 2000, owed 1000
    expect(bB.balance).toBe(-1000) // paid 0, owed 1000
  })

  it('3人均等割り：A が 3000円払い、B・C それぞれ 1000円負債', () => {
    const a = mkMember('a', 'A')
    const b = mkMember('b', 'B')
    const c = mkMember('c', 'C')
    const expenses = [mkExpense('e1', 3000, 'a', [a, b, c])]
    const balances = calculateBalances([a, b, c], expenses)
    expect(balances.find((x) => x.id === 'a')!.balance).toBe(2000)
    expect(balances.find((x) => x.id === 'b')!.balance).toBe(-1000)
    expect(balances.find((x) => x.id === 'c')!.balance).toBe(-1000)
  })

  it('大人(1.0)＋子供(0.5)：3000円 → 大人2000、子供1000', () => {
    const adult = mkMember('adult', '大人', 1.0)
    const child = mkMember('child', '子供', 0.5)
    // adult paid, ratio sum = 1.5
    const expenses = [mkExpense('e1', 3000, 'adult', [adult, child])]
    const balances = calculateBalances([adult, child], expenses)
    const bAdult = balances.find((x) => x.id === 'adult')!
    const bChild = balances.find((x) => x.id === 'child')!
    // adult owed = round(3000 * 1.0/1.5) = 2000, paid = 3000, balance = 1000
    expect(bAdult.owed).toBe(2000)
    expect(bAdult.balance).toBe(1000)
    // child owed = 3000 - 2000 = 1000 (remainder), balance = -1000
    expect(bChild.owed).toBe(1000)
    expect(bChild.balance).toBe(-1000)
  })

  it('大人2人(1.0)＋子供1人(0.5)：3000円 → 大人1200、子供600', () => {
    const a1 = mkMember('a1', '大人1', 1.0)
    const a2 = mkMember('a2', '大人2', 1.0)
    const c = mkMember('c', '子供', 0.5)
    // ratio sum = 2.5
    const expenses = [mkExpense('e1', 3000, 'a1', [a1, a2, c])]
    const balances = calculateBalances([a1, a2, c], expenses)
    const ba1 = balances.find((x) => x.id === 'a1')!
    const ba2 = balances.find((x) => x.id === 'a2')!
    const bc = balances.find((x) => x.id === 'c')!
    // a1: paid 3000, owed 1200, balance 1800
    expect(ba1.owed).toBe(1200)
    expect(ba1.balance).toBe(1800)
    // a2: paid 0, owed 1200, balance -1200
    expect(ba2.owed).toBe(1200)
    expect(ba2.balance).toBe(-1200)
    // c: paid 0, owed 600, balance -600
    expect(bc.owed).toBe(600)
    expect(bc.balance).toBe(-600)
  })

  it('複数支出：net balanceが正しく計算される', () => {
    const a = mkMember('a', 'A')
    const b = mkMember('b', 'B')
    const expenses = [
      mkExpense('e1', 1000, 'a', [a, b]), // a pays 1000, each owes 500
      mkExpense('e2', 600, 'b', [a, b]),  // b pays 600, each owes 300
    ]
    // a: paid=1000, owed=500+300=800, balance=200
    // b: paid=600, owed=500+300=800, balance=-200
    const balances = calculateBalances([a, b], expenses)
    expect(balances.find((x) => x.id === 'a')!.balance).toBe(200)
    expect(balances.find((x) => x.id === 'b')!.balance).toBe(-200)
  })

  it('既に均衡：transfersが空', () => {
    const a = mkMember('a', 'A')
    const b = mkMember('b', 'B')
    const expenses = [
      mkExpense('e1', 1000, 'a', [a, b]),
      mkExpense('e2', 1000, 'b', [a, b]),
    ]
    const transfers = calculateSettlement([a, b], expenses)
    expect(transfers).toHaveLength(0)
  })
})

describe('calculateSettlement', () => {
  it('シンプルな2人：B が A に 1000円払う', () => {
    const a = mkMember('a', 'A')
    const b = mkMember('b', 'B')
    const expenses = [mkExpense('e1', 2000, 'a', [a, b])]
    const transfers = calculateSettlement([a, b], expenses)
    expect(transfers).toHaveLength(1)
    expect(transfers[0].fromId).toBe('b')
    expect(transfers[0].toId).toBe('a')
    expect(transfers[0].amount).toBe(1000)
  })

  it('1人が全額払い（3人、混合ratio）', () => {
    const a = mkMember('a', 'A', 1.0)
    const b = mkMember('b', 'B', 1.0)
    const c = mkMember('c', 'C', 0.5)
    // a pays 3000 for all, ratio sum = 2.5
    // a owes 1200, b owes 1200, c owes 600
    // b pays 1200 to a, c pays 600 to a
    const expenses = [mkExpense('e1', 3000, 'a', [a, b, c])]
    const transfers = calculateSettlement([a, b, c], expenses)
    const totalTransferred = transfers.reduce((s, t) => s + t.amount, 0)
    // All transfers go to a
    transfers.forEach((t) => expect(t.toId).toBe('a'))
    // Total = 1800 (a's balance)
    expect(totalTransferred).toBe(1800)
  })

  it('最小送金回数：3人の複雑なケース', () => {
    const a = mkMember('a', 'A')
    const b = mkMember('b', 'B')
    const c = mkMember('c', 'C')
    const expenses = [
      mkExpense('e1', 3000, 'a', [a, b, c]), // a+1000, b-1000, c-1000
      mkExpense('e2', 3000, 'b', [a, b, c]), // b+2000, a-2000+1000=net, etc
    ]
    // a: paid=3000, owed=2000, balance=1000
    // b: paid=3000, owed=2000, balance=1000
    // c: paid=0, owed=2000, balance=-2000
    const transfers = calculateSettlement([a, b, c], expenses)
    const totalTransferred = transfers.reduce((s, t) => s + t.amount, 0)
    expect(totalTransferred).toBe(2000)
    // c should be debtor
    transfers.forEach((t) => expect(t.fromId).toBe('c'))
  })
})
