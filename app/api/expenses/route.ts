import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')
    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }
    const expenses = await prisma.expense.findMany({
      where: { tripId },
      include: {
        paidBy: true,
        splits: { include: { member: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(expenses)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tripId, description, amount, paidById, memberIds } = await request.json()
    if (!tripId || !description?.trim() || !amount || !paidById || !memberIds?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const expense = await prisma.expense.create({
      data: {
        tripId,
        description: description.trim(),
        amount: Math.round(amount),
        paidById,
        splits: {
          create: memberIds.map((memberId: string) => ({ memberId })),
        },
      },
      include: {
        paidBy: true,
        splits: { include: { member: true } },
      },
    })
    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}
