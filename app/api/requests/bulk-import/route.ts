import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { parseCSV } from '@/lib/csv-parser'

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (session.user.role !== 'CLERK') {
            return NextResponse.json({ error: 'Only clerks can perform bulk imports' }, { status: 403 })
        }

        const formData = await req.formData()
        const file = formData.get('file') as File
        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
        }

        const csvContent = await file.text()
        const parseResult = await parseCSV(csvContent)

        if (parseResult.errors.length > 0) {
            return NextResponse.json({
                error: 'Validation errors found',
                errors: parseResult.errors,
                totalRows: parseResult.totalRows,
            }, { status: 400 })
        }

        const createdRequests = []
        const errors = []

        for (const [employeeId, employeeData] of parseResult.employees) {
            try {
                const dates = employeeData.payEvents.map((e) => e.date)
                const startDate = new Date(Math.min(...dates.map((d) => d.getTime())))
                const endDate = new Date(Math.max(...dates.map((d) => d.getTime())))

                const request = await prisma.arrearRequest.create({
                    data: {
                        employeeId: employeeData.employeeId,
                        employeeName: employeeData.employeeName,
                        startDate,
                        endDate,
                        status: 'DRAFT',
                        initiatorId: session.user.id,
                        payEvents: {
                            create: employeeData.payEvents.map((event) => ({
                                date: event.date,
                                type: event.type,
                                basicPay: event.basicPay,
                                drawnBasicPay: event.drawnBasicPay,
                                drawnGradePay: event.drawnGradePay,
                            })),
                        },
                    },
                    include: { payEvents: true },
                })

                await prisma.auditLog.create({
                    data: {
                        action: 'CREATED',
                        comments: `Bulk import: ${employeeData.payEvents.length} pay events`,
                        requestId: request.id,
                        performedById: session.user.id,
                    },
                })

                createdRequests.push({
                    id: request.id,
                    employeeId: request.employeeId,
                    employeeName: request.employeeName,
                    payEventsCount: employeeData.payEvents.length,
                })
            } catch (err: any) {
                errors.push({ employeeId, employeeName: employeeData.employeeName, error: err.message })
            }
        }

        return NextResponse.json({
            success: true,
            created: createdRequests.length,
            failed: errors.length,
            requests: createdRequests,
            errors,
        })
    } catch (error: any) {
        console.error('Bulk import error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
