'use client'

import { FileDown } from 'lucide-react'
import { generateOfficeOrderPDF, OfficeOrderData } from '@/lib/pdf-office-order'

interface PDFDownloadButtonsProps {
  data: OfficeOrderData
}

export function PDFDownloadButtons({ data }: PDFDownloadButtonsProps) {
  function downloadPDF(language: 'en' | 'hi') {
    const blob = generateOfficeOrderPDF(data, language)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Office_Order_${data.employee.id}_${language === 'en' ? 'English' : 'Hindi'}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => downloadPDF('en')}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <FileDown className="h-4 w-4" />
        Download Office Order (English)
      </button>
      <button
        onClick={() => downloadPDF('hi')}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        <FileDown className="h-4 w-4" />
        Download Office Order (Hindi)
      </button>
    </div>
  )
}
