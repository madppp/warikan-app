import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { description, amount, paidById, memberIds } = await request.json()
    // Delete existing splits and recreate
    await prisma.expenseSplit.deleteMany({ where: { expenseId: params.id } })
    const expense = await prisma.expense.update({
      where: { id: params.id },
      data: {
        ...(description !== undefined && { description: description.trim() }),
        ...(amount !== undefined && { amount: Math.round(amount) }),
        ...(paidById !== undefined && { paidById }),
        ...(memberIds !== undefined && {
          splits: {
            create: (memberIds as string[]).map((memberId) => ({ memberId })),
          },
        }),
      },
      include: {
        paidBy: true,
        splits: { include: { member: true } },
      },
    })
    return NextResponse.json(expense)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.expense.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
  }
}
