import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data: { name?: string; ratio?: number } = {}
    if (body.name !== undefined) data.name = body.name.trim()
    if (body.ratio !== undefined) data.ratio = body.ratio
    const member = await prisma.member.update({
      where: { id: params.id },
      data,
    })
    return NextResponse.json(member)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.member.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 })
  }
}
