import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data: { name?: string; kanjiId?: string | null } = {}
    if (body.name !== undefined) data.name = body.name.trim()
    if (body.kanjiId !== undefined) data.kanjiId = body.kanjiId
    const trip = await prisma.trip.update({ where: { id: params.id }, data })
    return NextResponse.json(trip)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.$transaction([
      prisma.expenseSplit.deleteMany({ where: { expense: { tripId: params.id } } }),
      prisma.expense.deleteMany({ where: { tripId: params.id } }),
      prisma.member.deleteMany({ where: { tripId: params.id } }),
      prisma.trip.delete({ where: { id: params.id } }),
    ])
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 })
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: params.id },
      include: {
        members: true,
        expenses: {
          include: {
            paidBy: true,
            splits: {
              include: { member: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    return NextResponse.json(trip)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 })
  }
}
