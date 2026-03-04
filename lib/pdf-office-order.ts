import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

export interface OfficeOrderData {
    orderNumber: string
    orderDate: Date
    employee: {
        name: string
        id: string
        designation: string
    }
    period: {
        start: Date
        end: Date
    }
    calculations: {
        totalDue: number
        totalDrawn: number
        netArrear: number
        yearWise: Array<{ year: number; amount: number }>
    }
    approver: {
        name: string
        designation: string
        date: Date
    }
}

const translations = {
    en: {
        title: 'BHAKRA BEAS MANAGEMENT BOARD',
        subtitle: 'Office Order',
        orderNo: 'Order No',
        date: 'Date',
        subject: 'Subject',
        subjectText: 'Arrear Payment Approval',
        employeeName: 'Employee Name',
        employeeId: 'Employee ID',
        designation: 'Designation',
        period: 'Period',
        calculationSummary: 'CALCULATION SUMMARY',
        totalDue: 'Total Due (7th CPC)',
        totalDrawn: 'Total Drawn (6th CPC)',
        netArrear: 'Net Arrear Payable',
        yearWise: 'Year-wise Breakdown',
        year: 'Year',
        amount: 'Amount',
        approvedBy: 'Approved by',
        signature: 'Signature',
    },
    hi: {
        title: 'भाखड़ा ब्यास प्रबंध बोर्ड',
        subtitle: 'कार्यालय आदेश',
        orderNo: 'आदेश संख्या',
        date: 'दिनांक',
        subject: 'विषय',
        subjectText: 'बकाया भुगतान स्वीकृति',
        employeeName: 'कर्मचारी का नाम',
        employeeId: 'कर्मचारी आईडी',
        designation: 'पदनाम',
        period: 'अवधि',
        calculationSummary: 'गणना सारांश',
        totalDue: 'कुल देय (7वां वेतन आयोग)',
        totalDrawn: 'कुल आहरित (6वां वेतन आयोग)',
        netArrear: 'शुद्ध बकाया देय',
        yearWise: 'वर्षवार विवरण',
        year: 'वर्ष',
        amount: 'राशि',
        approvedBy: 'द्वारा अनुमोदित',
        signature: 'हस्ताक्षर',
    },
}

export function generateOfficeOrderPDF(
    data: OfficeOrderData,
    language: 'en' | 'hi' = 'en'
): Blob {
    const doc = new jsPDF()
    const t = translations[language]
    let yPos = 20

    // Header
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(t.title, 105, yPos, { align: 'center' })

    yPos += 10
    doc.setFontSize(14)
    doc.text(t.subtitle, 105, yPos, { align: 'center' })

    // Horizontal line
    yPos += 5
    doc.setLineWidth(0.5)
    doc.line(20, yPos, 190, yPos)

    // Order details
    yPos += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`${t.orderNo}: ${data.orderNumber}`, 20, yPos)
    doc.text(`${t.date}: ${format(data.orderDate, 'dd MMM yyyy')}`, 140, yPos)

    // Subject
    yPos += 10
    doc.setFont('helvetica', 'bold')
    doc.text(`${t.subject}:`, 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(t.subjectText, 50, yPos)

    // Employee details
    yPos += 15
    const employeeDetails = [
        [t.employeeName, data.employee.name],
        [t.employeeId, data.employee.id],
        [t.designation, data.employee.designation],
        [t.period, `${format(data.period.start, 'dd MMM yyyy')} - ${format(data.period.end, 'dd MMM yyyy')}`],
    ]

    autoTable(doc, {
        startY: yPos,
        head: [],
        body: employeeDetails,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 120 },
        },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10

    // Calculation Summary
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(t.calculationSummary, 20, yPos)

    yPos += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    const calculations = [
        [t.totalDue, `₹${data.calculations.totalDue.toLocaleString('en-IN')}`],
        [t.totalDrawn, `₹${data.calculations.totalDrawn.toLocaleString('en-IN')}`],
    ]

    autoTable(doc, {
        startY: yPos,
        head: [],
        body: calculations,
        theme: 'plain',
        styles: { fontSize: 10 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 80 },
            1: { cellWidth: 90, halign: 'right' },
        },
    })

    yPos = (doc as any).lastAutoTable.finalY + 5

    // Net Arrear (highlighted)
    doc.setFillColor(240, 240, 240)
    doc.rect(20, yPos - 5, 170, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(t.netArrear, 25, yPos)
    doc.text(`₹${data.calculations.netArrear.toLocaleString('en-IN')}`, 185, yPos, { align: 'right' })

    // Year-wise breakdown
    yPos += 15
    doc.setFontSize(10)
    doc.text(t.yearWise + ':', 20, yPos)

    yPos += 5
    const yearWiseData = data.calculations.yearWise.map((item) => [
        item.year.toString(),
        `₹${item.amount.toLocaleString('en-IN')}`,
    ])

    autoTable(doc, {
        startY: yPos,
        head: [[t.year, t.amount]],
        body: yearWiseData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [66, 139, 202] },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 60, halign: 'right' },
        },
    })

    // Approval section
    yPos = (doc as any).lastAutoTable.finalY + 20
    doc.setFont('helvetica', 'bold')
    doc.text(t.approvedBy + ':', 20, yPos)

    yPos += 8
    doc.setFont('helvetica', 'normal')
    doc.text(data.approver.name, 20, yPos)
    yPos += 5
    doc.text(data.approver.designation, 20, yPos)
    yPos += 5
    doc.text(format(data.approver.date, 'dd MMM yyyy'), 20, yPos)

    yPos += 15
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.text(t.signature, 20, yPos)

    // Footer
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('This is a computer-generated document and does not require a physical signature.', 105, 280, {
        align: 'center',
    })

    return doc.output('blob')
}
