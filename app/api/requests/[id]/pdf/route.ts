import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateArrears } from '@/lib/calculation-engine'
import { format } from 'date-fns'
import fs from 'fs'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const _pdf = require('pdfkit')
// Turbopack wraps CJS modules in an ESM object — handle both
const PDFDocument = _pdf?.default ?? _pdf

// Turbopack serves files from /ROOT/ but pdfkit looks for AFM fonts at __dirname
// We patch the data path so pdfkit finds its bundled Helvetica/Courier afm files
import path from 'path'
const pdfkitDataDir = path.join(process.cwd(), 'node_modules', 'pdfkit', 'js', 'data')
try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AFMFont = require('pdfkit/js/font/afm')
    const cls = AFMFont?.default ?? AFMFont
    if (cls) cls.dataDir = pdfkitDataDir
} catch { /* not critical, will work if afm dir exists */ }

const BLUE = '#1e3a8a'
const LIGHT = '#f0f4ff'
const GREEN = '#dcfce7'
const GREY = '#64748b'

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params
        const request = await prisma.arrearRequest.findUnique({
            where: { id },
            include: { payEvents: { orderBy: { date: 'asc' } }, initiator: true }
        })

        if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

        const daRates = await prisma.dARate.findMany({ orderBy: { effectiveDate: 'asc' } })

        const safeEvents = request.payEvents.map(p => ({
            ...p,
            date: new Date(p.date),
            drawnBasicPay: p.drawnBasicPay ?? undefined,
            drawnGradePay: p.drawnGradePay ?? undefined,
            drawnIR: p.drawnIR ?? undefined,
        }))

        const safeDARates = daRates.map(d => ({
            ...d,
            effectiveDate: new Date(d.effectiveDate),
            type: d.type as 'REVISED' | 'PRE_REVISED',
        }))

        const segments = calculateArrears({
            startDate: new Date(request.startDate),
            endDate: new Date(request.endDate),
            payEvents: safeEvents,
            daRates: safeDARates,
        })

        const totalArrear = Math.round(segments.reduce((s, seg) => s + (seg.totalDue - seg.totalDrawn), 0))

        // Year-wise
        const yearMap = new Map<number, number>()
        segments.forEach(seg => {
            const y = new Date(seg.startDate).getFullYear()
            yearMap.set(y, (yearMap.get(y) || 0) + (seg.totalDue - seg.totalDrawn))
        })
        const yearWise = Array.from(yearMap.entries()).sort((a, b) => a[0] - b[0])

        // ─── Build PDF ─────────────────────────────────────────────────────────
        const doc = new PDFDocument({
            layout: 'landscape',
            size: 'A4',
            margins: { top: 24, bottom: 24, left: 24, right: 24 },
            info: { Title: `BBMB Arrear - ${request.employeeName}`, Author: 'BBMB System' },
        })

        const chunks: Buffer[] = []
        doc.on('data', (c: Buffer) => chunks.push(c))

        const pageW = doc.page.width   // ~841
        const margin = 24
        const contentW = pageW - margin * 2

        // ── HEADER with BBMB Logo ───────────────────────────────────────────────
        const hdrH = 50
        doc.rect(margin, margin, contentW, hdrH).fill(BLUE)

        // Logo on the left
        let logoLoaded = false
        try {
            const logoPath = path.join(process.cwd(), 'public', 'bbmb-logo.jpeg')
            if (fs.existsSync(logoPath)) {
                const logoBuffer = fs.readFileSync(logoPath)
                doc.image(logoBuffer, margin + 4, margin + 4, { height: hdrH - 8, fit: [hdrH - 8, hdrH - 8] })
                logoLoaded = true
            }
        } catch { /* logo load failed, continue without it */ }

        // Title centered (offset right if logo present)
        const titleX = logoLoaded ? margin + hdrH + 4 : margin
        const titleW = logoLoaded ? contentW - hdrH - 4 : contentW
        doc.fillColor('white').font('Helvetica-Bold').fontSize(13)
            .text('BHAKRA BEAS MANAGEMENT BOARD (BBMB)', titleX, margin + 6, { align: 'center', width: titleW })
        doc.fontSize(8).font('Helvetica')
            .text('Bhakra Beas Prabandh Board  |  Bakaya Vetan Ganan Vivaran — 7va Vetan Aayog', titleX, margin + 24, { align: 'center', width: titleW })
        doc.fontSize(7.5)
            .text('ARREAR PAY CALCULATION STATEMENT — 7th Central Pay Commission', titleX, margin + 36, { align: 'center', width: titleW })
        doc.fillColor('#000000')

        // ── EMPLOYEE DETAILS BOX ─────────────────────────────────────────────────
        const boxY = margin + hdrH + 6
        const boxH = 36
        doc.rect(margin, boxY, contentW, boxH).strokeColor('#cbd5e1').stroke()
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(BLUE)

        const col1 = margin + 4
        const col2 = margin + contentW * 0.30
        const col3 = margin + contentW * 0.55
        const col4 = margin + contentW * 0.75

        // Row 1
        doc.text('Employee Name:', col1, boxY + 4)
        doc.font('Helvetica').fillColor('#000').text(request.employeeName || '—', col2, boxY + 4)
        doc.font('Helvetica-Bold').fillColor(BLUE).text('Employee ID (PF No.):', col3, boxY + 4)
        doc.font('Helvetica').fillColor('#000').text(request.employeeId, col4, boxY + 4)

        // Row 2
        doc.font('Helvetica-Bold').fillColor(BLUE).text('Checker JA:', col1, boxY + 16)
        doc.font('Helvetica').fillColor('#000').text((request as any).checkerNameJA || '—', col2, boxY + 16)
        doc.font('Helvetica-Bold').fillColor(BLUE).text('Checker SA:', col3, boxY + 16)
        doc.font('Helvetica').fillColor('#000').text((request as any).checkerNameSA || '—', col4, boxY + 16)

        // Row 3
        const period = `${format(new Date(request.startDate), 'dd.MM.yyyy')}  to  ${format(new Date(request.endDate), 'dd.MM.yyyy')}`
        doc.font('Helvetica-Bold').fillColor(BLUE).text('Arrear Period:', col1, boxY + 28)
        doc.font('Helvetica').fillColor('#000').text(period, col2, boxY + 28)

        // ── CALCULATION TABLE ────────────────────────────────────────────────────
        const tblY = boxY + boxH + 8
        const cols = [48, 20, 30, 32, 32, 20, 30, 28, 20, 30, 32, 32]
        const headers = ['Period', 'DA%', 'Basic\n(Due)', 'DA\n(Due)', 'Total\nDue', 'DA%', 'Basic\n(Drwn)', 'GP', 'IR', 'DA\n(Drwn)', 'Total\nDrwn', 'Net\nArrear']
        const rowH = 14
        const tblHdrH = 22

        // Header row
        let xOff = margin
        doc.rect(margin, tblY, contentW, tblHdrH).fill(BLUE)
        doc.fillColor('white').font('Helvetica-Bold').fontSize(6.5)
        headers.forEach((h, i) => {
            doc.text(h, xOff + 1, tblY + 3, { width: cols[i], align: 'center' })
            xOff += cols[i]
        })

        // Data rows
        let rowY = tblY + tblHdrH
        segments.forEach((seg, idx) => {
            const net = Math.round(seg.totalDue - seg.totalDrawn)
            const bg = idx % 2 === 0 ? LIGHT : null
            if (bg) doc.rect(margin, rowY, contentW, rowH).fill(bg)
            doc.fillColor('#000').font('Helvetica').fontSize(6.5)

            const vals = [
                `${format(new Date(seg.startDate), 'dd.MM.yy')}\n${format(new Date(seg.endDate), 'dd.MM.yy')}`,
                `${seg.daPercentage}%`,
                seg.basicPay.toLocaleString('en-IN'),
                seg.daRate.toLocaleString('en-IN'),
                seg.monthlyDueTotal.toLocaleString('en-IN'),
                `${seg.drawnDAPercentage}%`,
                seg.drawnBasicPay.toLocaleString('en-IN'),
                seg.drawnGradePay.toLocaleString('en-IN'),
                seg.drawnIR.toLocaleString('en-IN'),
                seg.drawnDA.toLocaleString('en-IN'),
                seg.drawnTotal.toLocaleString('en-IN'),
                net.toLocaleString('en-IN'),
            ]

            xOff = margin
            vals.forEach((v, i) => {
                const align = i === 0 ? 'center' : 'right'
                const font = (i === 4 || i === 10 || i === 11) ? 'Helvetica-Bold' : 'Helvetica'
                doc.font(font).text(v, xOff + 1, rowY + (rowH - 8) / 2, { width: cols[i] - 2, align })
                xOff += cols[i]
            })

            // Row border
            doc.rect(margin, rowY, contentW, rowH).strokeColor('#e2e8f0').stroke()
            rowY += rowH
        })

        // Total row
        doc.rect(margin, rowY, contentW, rowH + 2).fill('#1e3a8a')
        doc.fillColor('white').font('Helvetica-Bold').fontSize(7.5)
            .text(`TOTAL NET ARREAR PAYABLE / Kul Bakaya Dey: Rs. ${totalArrear.toLocaleString('en-IN')}`, margin + 4, rowY + 3, { width: contentW - 8, align: 'right' })
        rowY += rowH + 6

        // ── YEAR-WISE TABLE ──────────────────────────────────────────────────────
        if (yearWise.length > 0 && rowY + yearWise.length * 12 + 30 < doc.page.height - 60) {
            doc.fillColor(BLUE).font('Helvetica-Bold').fontSize(7.5)
                .text('Year-wise Arrear / Varsh-var Bakaya:', margin, rowY, { width: 200 })
            rowY += 12
            const ywColW = [60, 90]
            doc.rect(margin, rowY, ywColW[0] + ywColW[1], 14).fill(BLUE)
            doc.fillColor('white').font('Helvetica-Bold').fontSize(7)
                .text('Year', margin + 2, rowY + 3, { width: ywColW[0], align: 'center' })
                .text('Amount (Rs.)', margin + ywColW[0] + 2, rowY + 3, { width: ywColW[1], align: 'right' })
            rowY += 14

            yearWise.forEach(([y, amt], ii) => {
                const bg = ii % 2 === 0 ? LIGHT : null
                if (bg) doc.rect(margin, rowY, ywColW[0] + ywColW[1], 12).fill(bg)
                doc.fillColor('#000').font('Helvetica').fontSize(7)
                    .text(y.toString(), margin + 2, rowY + 2, { width: ywColW[0], align: 'center' })
                    .text(Math.round(amt).toLocaleString('en-IN'), margin + ywColW[0] + 2, rowY + 2, { width: ywColW[1], align: 'right' })
                doc.rect(margin, rowY, ywColW[0] + ywColW[1], 12).strokeColor('#cbd5e1').stroke()
                rowY += 12
            })

            // Grand total row
            doc.rect(margin, rowY, ywColW[0] + ywColW[1], 14).fill(GREEN)
            doc.fillColor('#000').font('Helvetica-Bold').fontSize(7.5)
                .text('Grand Total', margin + 2, rowY + 3, { width: ywColW[0] })
                .text(`Rs. ${totalArrear.toLocaleString('en-IN')}`, margin + ywColW[0] + 2, rowY + 3, { width: ywColW[1], align: 'right' })
            rowY += 20
        }

        // ── SIGNATURE BLOCK ──────────────────────────────────────────────────────
        const sigY = doc.page.height - 70
        const sigW = contentW / 3
        doc.fillColor(GREY).font('Helvetica').fontSize(7)

        const sigs = [
            { label: 'Clerk / Lipik', detail: '' },
            { label: `JA: ${(request as any).checkerNameJA || '___________'}\nSA: ${(request as any).checkerNameSA || '___________'}`, detail: 'Jr./Sr. Assistant' },
            { label: 'Superintendent / Adhikshak', detail: '' },
        ]

        sigs.forEach((sig, i) => {
            const sx = margin + i * sigW
            doc.text(sig.label, sx + 10, sigY, { width: sigW - 20, align: 'center' })
            doc.moveTo(sx + 10, sigY + 22).lineTo(sx + sigW - 10, sigY + 22).strokeColor('#000').stroke()
            doc.text('Signature & Date', sx + 10, sigY + 25, { width: sigW - 20, align: 'center' })
        })

        // ── FOOTER ───────────────────────────────────────────────────────────────
        doc.fillColor(GREY).fontSize(6).font('Helvetica')
            .text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')} | BBMB Arrears System | Computer Generated Document | Strictly Confidential`,
                margin, doc.page.height - 20, { width: contentW, align: 'center' })

        doc.end()

        const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
            doc.on('end', () => resolve(Buffer.concat(chunks)))
            doc.on('error', reject)
        })

        const empName = (request.employeeName || request.employeeId).replace(/\s+/g, '_')
        const filename = `BBMB_Arrear_${empName}_${format(new Date(), 'yyyyMMdd')}.pdf`

        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfBuffer.length.toString(),
            },
        })
    } catch (err: any) {
        console.error('PDF generation error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
