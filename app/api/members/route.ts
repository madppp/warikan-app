import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')
    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }
    const members = await prisma.member.findMany({
      where: { tripId },
      orderBy: { id: 'asc' },
    })
    return NextResponse.json(members)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tripId, name, ratio = 1.0 } = await request.json()
    if (!tripId || !name?.trim()) {
      return NextResponse.json({ error: 'tripId and name are required' }, { status: 400 })
    }
    const member = await prisma.member.create({
      data: { tripId, name: name.trim(), ratio },
    })
    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 })
  }
}
