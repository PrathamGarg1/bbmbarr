'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import { Loader2, ShieldCheck } from 'lucide-react'

const ROLES = [
  { value: 'CLERK', label: 'CLERK — लिपिक' },
  { value: 'JA', label: 'JA — कनिष्ठ सहायक' },
  { value: 'SA', label: 'SA — वरिष्ठ सहायक' },
  { value: 'SUPERINTENDENT', label: 'SUPERINTENDENT — अधीक्षक' },
  { value: 'PASSWORD_MANAGER', label: 'PASSWORD MANAGER' },
]

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [role, setRole] = useState('CLERK')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)

    try {
      const result = await signIn('credentials', {
        role: formData.get('role'),
        password: formData.get('password'),
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid password. Please try again.')
        setLoading(false)
      } else if (result?.ok) {
        window.location.href = '/dashboard'
      }
    } catch {
      setError('An error occurred during login.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center 
 from-blue-950 via-indigo-900 to-blue-800">
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '48px 48px' }}
      />

      <div className="relative max-w-md w-full mx-4">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-800 px-8 py-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-4 shadow-lg overflow-hidden p-1">
              <Image 
                src="/bbmb-logo.jpeg" 
                alt="BBMB Logo" 
                width={80} 
                height={80} 
                className="w-full h-full object-contain rounded-full" 
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-white">BBMB Arrears System</h1>
            <p className="text-blue-200 text-sm mt-1">भाखड़ा ब्यास प्रबंध बोर्ड</p>
            <p className="text-blue-300 text-xs mt-2">Select your role to continue</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
                  Role / पद
                </label>
                <select
                  id="role"
                  name="role"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900 text-sm"
                  required
                >
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password / पासवर्ड
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900"
                  placeholder="Enter password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    Signing in...
                  </>
                ) : 'Sign In / लॉगिन करें'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-gray-400">
              For password changes, contact the Password Manager
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
