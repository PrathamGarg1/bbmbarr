import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.email || !['CLERK', 'SA'].includes(session.user.role as string)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const initiator = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!initiator) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const employeeId = formData.get('employeeId') as string
    const employeeName = formData.get('employeeName') as string
    const checkerNameJA = formData.get('checkerNameJA') as string
    const checkerNameSA = formData.get('checkerNameSA') as string
    const startDate = new Date(formData.get('startDate') as string)
    const endDate = new Date(formData.get('endDate') as string)

    const newReq = await prisma.arrearRequest.create({
      data: {
        employeeId,
        employeeName,
        checkerNameJA,
        checkerNameSA,
        startDate,
        endDate,
        status: 'PENDING_CALC',
        initiatorId: initiator.id
      }
    })

    return NextResponse.json({ success: true, id: newReq.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
