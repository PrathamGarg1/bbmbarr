import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = await context.params
        const request = await prisma.arrearRequest.findUnique({
            where: { id },
            include: { initiator: true },
        })

        if (!request) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 })
        }

        // Simple status progression: DRAFT → APPROVED
        const nextStatus = request.status === 'DRAFT' ? 'APPROVED' : request.status

        const updatedRequest = await prisma.arrearRequest.update({
            where: { id },
            data: { status: nextStatus },
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'APPROVED',
                comments: `Approved by ${session.user.role}`,
                requestId: id,
                performedById: session.user.id,
            },
        })

        return NextResponse.json({
            success: true,
            request: updatedRequest,
            message: 'Request approved successfully!',
        })
    } catch (error: any) {
        console.error('Approval error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
