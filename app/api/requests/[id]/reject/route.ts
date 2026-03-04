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
        const body = await req.json()
        const { reason } = body

        if (!reason) {
            return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
        }

        const request = await prisma.arrearRequest.findUnique({
            where: { id },
        })

        if (!request) {
            return NextResponse.json({ error: 'Request not found' }, { status: 404 })
        }

        const updatedRequest = await prisma.arrearRequest.update({
            where: { id },
            data: { status: 'REJECTED' },
        })

        // Audit log
        await prisma.auditLog.create({
            data: {
                action: 'REJECTED',
                comments: reason,
                requestId: id,
                performedById: session.user.id,
            },
        })

        return NextResponse.json({
            success: true,
            request: updatedRequest,
            message: 'Request rejected',
        })
    } catch (error: any) {
        console.error('Rejection error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        )
    }
}
