import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const trips = await prisma.trip.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, createdAt: true, _count: { select: { members: true, expenses: true } } },
    })
    return NextResponse.json(trips)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json()
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    const trip = await prisma.trip.create({
      data: { name: name.trim() },
    })
    return NextResponse.json(trip, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}
