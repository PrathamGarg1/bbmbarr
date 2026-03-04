'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { generateCSVTemplate } from '@/lib/csv-parser'

export default function BulkImportPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
      setError(null)
    }
  }

  function downloadTemplate() {
    const csv = generateCSVTemplate()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bbmb_bulk_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleUpload() {
    if (!file) return

    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/requests/bulk-import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.errors) {
          setResult({ validationErrors: data.errors, totalRows: data.totalRows })
        } else {
          setError(data.error || 'Upload failed')
        }
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bulk Import</h1>
          <p className="text-gray-600 mt-1">Upload CSV file to create multiple arrear requests</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="h-5 w-5" />
          Download Template
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-indigo-400 transition-colors">
            <FileSpreadsheet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Click to upload CSV file
            </label>
            <p className="text-sm text-gray-500 mt-2">or drag and drop</p>
            {file && (
              <p className="text-sm text-gray-700 mt-4 font-medium">
                Selected: {file.name}
              </p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="h-5 w-5" />
            {uploading ? 'Uploading...' : 'Upload and Import'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">Upload Failed</h4>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {result?.validationErrors && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900">Validation Errors Found</h4>
              <p className="text-sm text-yellow-700">
                {result.validationErrors.length} errors in {result.totalRows} rows
              </p>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-yellow-100 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-semibold text-yellow-900">Row</th>
                  <th className="text-left p-2 font-semibold text-yellow-900">Field</th>
                  <th className="text-left p-2 font-semibold text-yellow-900">Error</th>
                </tr>
              </thead>
              <tbody>
                {result.validationErrors.map((err: any, idx: number) => (
                  <tr key={idx} className="border-t border-yellow-200">
                    <td className="p-2 text-yellow-900">{err.row}</td>
                    <td className="p-2 text-yellow-900 font-mono text-xs">{err.field}</td>
                    <td className="p-2 text-yellow-700">{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Success Result */}
      {result?.success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-green-900 text-lg">Import Successful!</h4>
              <p className="text-sm text-green-700">
                Created {result.created} requests
                {result.failed > 0 && `, ${result.failed} failed`}
              </p>
            </div>
          </div>

          {result.requests && result.requests.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-green-900 mb-2">Created Requests:</h5>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.requests.map((req: any) => (
                  <div
                    key={req.id}
                    className="bg-white p-3 rounded border border-green-200 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{req.employeeName}</p>
                      <p className="text-sm text-gray-600">
                        {req.employeeId} • {req.payEventsCount} pay events
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/requests/${req.id}`)}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      View →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-red-900 mb-2">Failed:</h5>
              <div className="space-y-2">
                {result.errors.map((err: any, idx: number) => (
                  <div key={idx} className="bg-red-50 p-3 rounded border border-red-200">
                    <p className="font-medium text-red-900">{err.employeeName}</p>
                    <p className="text-sm text-red-700">{err.error}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
