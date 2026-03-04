'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle, XCircle, AlertCircle, FileSpreadsheet, X } from 'lucide-react'

interface FileResult {
  fileName: string
  employeeName?: string
  employeeId?: string
  status: 'PASS' | 'FAIL' | 'ERROR'
  systemTotal?: number
  sheetTotal?: number
  difference?: number
  message?: string
}

const MAX_FILES = 20

export default function BulkVerifyPage() {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ total: number; passed: number; failed: number; errors: number; results: FileResult[] } | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return
    const arr = Array.from(incoming).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'))
    const combined = [...files, ...arr].slice(0, MAX_FILES)
    setFiles(combined)
    setResults(null)
    setError('')
  }

  function removeFile(idx: number) {
    setFiles(f => f.filter((_, i) => i !== idx))
  }

  async function handleVerify() {
    if (files.length === 0) return
    setLoading(true)
    setError('')
    setResults(null)

    const formData = new FormData()
    files.forEach(f => formData.append('files', f))

    try {
      const res = await fetch('/api/requests/bulk-verify', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Verification failed')
      } else {
        setResults(data)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bulk Excel Verification / बल्क सत्यापन</h1>
        <p className="text-sm text-slate-500 mt-1">
          Upload up to {MAX_FILES} exported calculation sheets (.xlsx) to verify against the system engine
        </p>
      </div>

      {/* Drop Zone */}
      <div
        className="bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 transition-colors p-10 text-center cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
      >
        <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-medium">Click or drag & drop Excel files here</p>
        <p className="text-sm text-slate-400 mt-1">Only .xlsx files exported from this system are accepted (max {MAX_FILES})</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-800">{files.length} file(s) selected</h3>
            <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-600 shrink-0" />
                  <span className="text-sm text-slate-700 truncate max-w-xs">{f.name}</span>
                  <span className="text-xs text-slate-400">{(f.size / 1024).toFixed(1)} KB</span>
                </div>
                <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            {loading ? 'Verifying...' : `Verify ${files.length} File(s) / सत्यापित करें`}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Files', value: results.total, color: 'bg-slate-50 border-slate-200 text-slate-700' },
              { label: 'Passed ✓', value: results.passed, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
              { label: 'Failed ✗', value: results.failed, color: 'bg-red-50 border-red-200 text-red-700' },
              { label: 'Errors', value: results.errors, color: 'bg-amber-50 border-amber-200 text-amber-700' },
            ].map(c => (
              <div key={c.label} className={`border rounded-xl p-4 text-center ${c.color}`}>
                <p className="text-3xl font-bold">{c.value}</p>
                <p className="text-xs font-medium mt-1 uppercase tracking-wide">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Per-file results */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Per-file Results / प्रति फ़ाइल परिणाम</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {results.results.map((r, i) => (
                <div key={i} className="px-5 py-4 flex items-start gap-4">
                  <div className="shrink-0 mt-0.5">
                    {r.status === 'PASS' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                    {r.status === 'FAIL' && <XCircle className="w-5 h-5 text-red-500" />}
                    {r.status === 'ERROR' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-slate-800 truncate">{r.fileName}</p>
                      <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        r.status === 'PASS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        r.status === 'FAIL' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>{r.status}</span>
                    </div>
                    {(r.employeeName || r.employeeId) && (
                      <p className="text-xs text-slate-500 mt-0.5">{r.employeeName} {r.employeeId && `(${r.employeeId})`}</p>
                    )}
                    {r.status !== 'ERROR' && r.systemTotal !== undefined && (
                      <div className="mt-2 text-xs grid grid-cols-3 gap-3">
                        <div>
                          <span className="text-slate-400 block">System Total</span>
                          <span className="font-semibold text-slate-700">₹{r.systemTotal?.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Sheet Total</span>
                          <span className="font-semibold text-slate-700">₹{r.sheetTotal?.toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Difference</span>
                          <span className={`font-semibold ${Math.abs(r.difference || 0) > 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {r.difference !== undefined ? (r.difference >= 0 ? '+' : '') + r.difference.toLocaleString('en-IN') : '—'}
                          </span>
                        </div>
                      </div>
                    )}
                    {r.message && (
                      <p className={`text-xs mt-1 ${r.status === 'PASS' ? 'text-emerald-600' : r.status === 'ERROR' ? 'text-amber-600' : 'text-red-600'}`}>
                        {r.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
