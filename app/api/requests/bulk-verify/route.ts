import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calculateArrears } from '@/lib/calculation-engine'
import * as XLSX from 'xlsx'

const MAX_FILES = 20

// Helper to parse periodic dates correctly
function parseExcelPeriod(val: any): Date | null {
    if (val === undefined || val === null || val === '') return null

    // Handle Excel Serial Dates (Numeric)
    if (typeof val === 'number') {
        // Excel base date is 1899-12-30
        const date = new Date(Math.round((val - 25569) * 86400 * 1000))
        return isNaN(date.getTime()) ? null : date
    }

    const str = String(val).trim()

    // Match "Jan-16"
    const monthYearMatch = str.match(/^([A-Za-z]+)-(\d{2})$/)
    if (monthYearMatch) {
        const monthMap: { [key: string]: number } = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        }
        const m = monthMap[monthYearMatch[1].substring(0, 3)]
        const y = parseInt(monthYearMatch[2]) + 2000
        if (m !== undefined) return new Date(y, m, 1)
    }

    // Match "01.09.2018 to 7.09.2018" (Take the start date)
    const rangeMatch = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/)
    if (rangeMatch) {
        return new Date(parseInt(rangeMatch[3]), parseInt(rangeMatch[2]) - 1, parseInt(rangeMatch[1]))
    }

    // Fallback: try native Date parse
    const native = new Date(str)
    return isNaN(native.getTime()) ? null : native
}

function cleanNum(val: any): number {
    if (typeof val === 'number') return val
    if (!val) return 0
    // Remove everything EXCEPT digits, decimal point, and negative sign
    const cleaned = String(val).replace(/[^0-9.-]/g, '')
    return parseFloat(cleaned) || 0
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user || session.user.role !== 'SUPERINTENDENT') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const formData = await req.formData()
        const files = formData.getAll('files') as File[]

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 })
        }

        const daRates = await prisma.dARate.findMany({ orderBy: { effectiveDate: 'asc' } })
        const safeDARates = daRates.map(d => ({
            ...d,
            effectiveDate: new Date(d.effectiveDate),
            type: d.type as 'REVISED' | 'PRE_REVISED'
        }))

        const results = await Promise.all(
            files.map(async (file) => {
                const fileName = file.name
                try {
                    const arrayBuffer = await file.arrayBuffer()
                    const workbook = XLSX.read(arrayBuffer, { type: 'buffer', cellDates: true })
                    const sheetName = workbook.SheetNames[0]
                    const sheet = workbook.Sheets[sheetName]
                    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

                    let headerRowIdx = -1
                    for (let r = 0; r < Math.min(15, rows.length); r++) {
                        const rowStr = JSON.stringify(rows[r])
                        if (rowStr.includes('Period') && rowStr.includes('BP')) {
                            headerRowIdx = r
                            break
                        }
                    }

                    if (headerRowIdx === -1) {
                        return { fileName, status: 'ERROR', message: 'Supported periodic sheet header not found.' }
                    }

                    let payEvents: any[] = []
                    let lastVals = { bp: -1, dbp: -1, dgp: -1, dir: -1 }
                    let sheetTotalDiff = 0
                    let earliestDate: Date | null = null
                    let latestDate: Date | null = null

                    for (let r = headerRowIdx + 1; r < rows.length; r++) {
                        const row = rows[r]
                        if (!row) continue

                        const firstCell = String(row[0]).trim()

                        // Handle Total Row
                        if (firstCell.toUpperCase().includes('TOTAL')) {
                            // The diff is consistently at index 11 in the periodic sheet
                            sheetTotalDiff = cleanNum(row[11])
                            break
                        }

                        const date = parseExcelPeriod(row[0])
                        if (!date) continue

                        const isSplit = String(row[0]).includes(' to ')

                        let bp = cleanNum(row[2])
                        let dbp = cleanNum(row[6])
                        let dgp = cleanNum(row[7])
                        let dir = cleanNum(row[8])

                        // If it's a split month, the Excel provides pro-rated amounts, not rates.
                        // We try to "re-inflate" to the monthly rate so the engine can pro-rate it correctly.
                        if (isSplit) {
                            const match = String(row[0]).match(/(\d{1,2})\.(\d{1,2})\.(\d{4}) to (\d{1,2})\.(\d{1,2})\.(\d{4})/)
                            if (match) {
                                const d1 = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
                                const d2 = new Date(parseInt(match[6]), parseInt(match[5]) - 1, parseInt(match[4]))
                                const days = Math.abs((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
                                if (days > 0 && days < 28) {
                                    bp = Math.round(bp * (30 / days))
                                    dbp = Math.round(dbp * (30 / days))
                                    dgp = Math.round(dgp * (30 / days))
                                    dir = Math.round(dir * (30 / days))
                                }
                            }
                        }

                        if (!earliestDate || date < earliestDate) earliestDate = date
                        if (!latestDate || date > latestDate) latestDate = date

                        // Change detection for efficient event list
                        if (bp !== lastVals.bp || dbp !== lastVals.dbp || dgp !== lastVals.dgp || dir !== lastVals.dir) {
                            payEvents.push({
                                date,
                                type: payEvents.length === 0 ? 'Initial' : 'Revision',
                                basicPay: bp,
                                drawnBasicPay: dbp,
                                drawnGradePay: dgp,
                                drawnIR: dir
                            })
                            lastVals = { bp, dbp, dgp, dir }
                        }
                    }

                    if (payEvents.length === 0 || !earliestDate || !latestDate) {
                        return { fileName, status: 'ERROR', message: 'Data extraction failed (No rows parsed).' }
                    }

                    // Calculation Engine Call
                    const finalEndDate = new Date(latestDate)
                    finalEndDate.setMonth(finalEndDate.getMonth() + 1)
                    finalEndDate.setDate(0) // End of that month

                    const segments = calculateArrears({
                        startDate: earliestDate,
                        endDate: finalEndDate,
                        payEvents,
                        daRates: safeDARates
                    })

                    const systemTotal = Math.round(segments.reduce((s, seg) => s + (seg.totalDue - seg.totalDrawn), 0))
                    const sheetTotal = Math.round(sheetTotalDiff)

                    // Allow 1.5% tolerance for manual Excel errors (e.g. duplicate rows, rounding, pro-rata variations)
                    const isCorrect = Math.abs(systemTotal - sheetTotal) <= Math.max(100, sheetTotal * 0.015)

                    return {
                        fileName,
                        status: isCorrect ? 'PASS' : 'FAIL',
                        systemTotal,
                        sheetTotal,
                        difference: systemTotal - sheetTotal,
                        message: isCorrect
                            ? 'Verification Successful ✓'
                            : `Discrepancy: ${systemTotal > sheetTotal ? '+' : '-'}${Math.abs(systemTotal - sheetTotal).toLocaleString('en-IN')}`
                    }
                } catch (err: any) {
                    return { fileName, status: 'ERROR', message: err.message }
                }
            })
        )

        return NextResponse.json({ success: true, results })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
