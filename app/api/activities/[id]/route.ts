import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canWrite } from '@/lib/authz'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })

  const user = session.user as any
  if (!canWrite(user) && user.role !== 'MERKEZ_BIRIM_BASKANI') {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  try {
    const body = await request.json()
    
    const existing = await prisma.activity.findUnique({
      where: { id },
      include: { institution: true }
    })

    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Faaliyet bulunamadı' }, { status: 404 })
    }

    // İl yetki kontrolü
    if (user.role === 'IL_KOORDINATOR') {
      if (existing.institution.provinceId !== user.provinceId || existing.genderBranch !== user.genderBranch) {
        return NextResponse.json({ error: 'Bu kaydı düzenleme yetkiniz yok' }, { status: 403 })
      }
    }

    if (user.role === 'MERKEZ_BIRIM_BASKANI') {
      if (existing.institution.unitId !== user.unitId) {
        return NextResponse.json({ error: 'Sadece kendi biriminizin kayıtlarını düzenleyebilirsiniz' }, { status: 403 })
      }
    }

    // Güncelleme
    const updated = await prisma.activity.update({
      where: { id },
      data: {
        participantCount: parseInt(body.participantCount),
        note: body.note,
        location: body.location
      }
    })

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'UPDATE',
        entity: 'ACTIVITY',
        entityId: id,
        metaJson: JSON.stringify({ old: existing.participantCount, new: body.participantCount })
      }
    })

    return NextResponse.json(updated)
  } catch (e: any) {
    console.error('Update error:', e)
    return NextResponse.json({ error: e.message || 'Güncellenemedi' }, { status: 500 })
  }
}
