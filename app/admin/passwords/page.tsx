'use client'

import { useState } from 'react'
import { Key, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'

const ROLES = [
  { value: 'CLERK', label: 'CLERK — लिपिक' },
  { value: 'JA', label: 'JA — कनिष्ठ सहायक' },
  { value: 'SA', label: 'SA — वरिष्ठ सहायक' },
  { value: 'SUPERINTENDENT', label: 'SUPERINTENDENT — अधीक्षक' },
]

export default function PasswordManagerPage() {
  const [targetRole, setTargetRole] = useState('CLERK')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setResult(null)

    if (newPassword !== confirmPassword) {
      setResult({ success: false, message: 'New passwords do not match' })
      return
    }
    if (newPassword.length < 6) {
      setResult({ success: false, message: 'New password must be at least 6 characters' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/admin/passwords', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, newPassword, currentPassword })
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, message: data.message })
        setNewPassword('')
        setConfirmPassword('')
        setCurrentPassword('')
      } else {
        setResult({ success: false, message: data.error || 'Update failed' })
      }
    } catch (e: any) {
      setResult({ success: false, message: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
            <Key className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Passwords / पासवर्ड प्रबंधन</h1>
        </div>
        <p className="text-sm text-slate-500 ml-12">Update login passwords for any system role</p>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Target Role */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Change password for role / किस भूमिका का पासवर्ड बदलें
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setTargetRole(r.value)}
                  className={`px-4 py-3 rounded-lg border text-sm font-medium text-left transition-all ${
                    targetRole === r.value
                      ? 'bg-indigo-50 border-indigo-400 text-indigo-700 ring-1 ring-indigo-400'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* New password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              New Password / नया पासवर्ड
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="Enter new password (min 6 chars)"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-3.5 text-slate-400">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Confirm New Password / नया पासवर्ड पुनः दर्ज करें
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              placeholder="Repeat new password"
            />
          </div>

          <hr className="border-slate-100" />

          {/* Confirm with own password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Your Current Password / आपका वर्तमान पासवर्ड
            </label>
            <p className="text-xs text-slate-400 mb-2">Required to authorize this change</p>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-300 rounded-lg pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                placeholder="Your Password Manager password"
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-3.5 text-slate-400">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`flex items-start gap-2 rounded-lg p-3 border text-sm ${
              result.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {result.success
                ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              {result.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-700 text-white rounded-lg text-sm font-semibold hover:bg-indigo-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Updating...' : `Update ${targetRole} Password / पासवर्ड अपडेट करें`}
          </button>
        </form>
      </div>
    </div>
  )
}
