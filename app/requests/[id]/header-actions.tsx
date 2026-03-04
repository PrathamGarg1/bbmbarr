'use client'

import { MotionButton } from '@/components/ui/motion-button'
import { Download, FileSpreadsheet } from 'lucide-react'
import { generateExcel } from '@/lib/excel-generator'
import { calculateArrears } from '@/lib/calculation-engine'

interface RequestHeaderActionsProps {
  request: any
  daRates: any[]
}

export function RequestHeaderActions({ request, daRates }: RequestHeaderActionsProps) {

  const getCalculationData = () => {
    const safeEvents = request.payEvents.map((p: any) => ({
      ...p,
      date: new Date(p.date)
    }))
    
    const safeDARates = daRates.map((d: any) => ({
      ...d,
      effectiveDate: new Date(d.effectiveDate)
    }))

    const segments = calculateArrears({
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
      payEvents: safeEvents,
      daRates: safeDARates
    })

    const totalArrear = segments.reduce((sum, seg) => sum + (seg.totalDue - seg.totalDrawn), 0)

    return { segments, totalArrear }
  }

  const handleExportPDF = async () => {
    try {
      // Use the server-side PDF API (supports Hindi via pdfmake)
      const res = await fetch(`/api/requests/${request.id}/pdf`)
      if (!res.ok) {
        const err = await res.json()
        alert('PDF generation failed: ' + (err.error || 'Unknown error'))
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const empName = (request.employeeName || request.employeeId).replace(/\s+/g, '_')
      a.download = `BBMB_Arrear_${empName}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert('Error generating PDF: ' + e.message)
    }
  }

  const handleExportExcel = () => {
    const { segments, totalArrear } = getCalculationData()

    generateExcel({
      employeeName: request.employeeName || 'Employee',
      employeeId: request.employeeId,
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
      segments,
      totalArrear,
      status: request.status
    })
  }

  return (
    <div className="flex gap-2">
      <MotionButton variant="secondary" onClick={handleExportPDF}>
        <Download className="mr-2 h-4 w-4" />
        Export PDF (Hindi)
      </MotionButton>
      <MotionButton variant="secondary" onClick={handleExportExcel}>
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        Export Excel
      </MotionButton>
    </div>
  )
}
