'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { MotionButton } from '@/components/ui/motion-button'

interface Props {
  className?: string
  buttonLabel?: string
  children?: React.ReactNode
}

export function NewRequestDialog({ className, buttonLabel = "New Request", children }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await fetch('/api/requests/new', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        setIsOpen(false)
        router.push(`/requests/${data.id}`)
      } else {
        alert(data.error || 'Failed to create request')
      }
    } catch (err) {
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)} className={className}>
        {children || (
          <MotionButton size="lg" className="shadow-blue-500/20">
            <Plus className="mr-2 h-5 w-5" />
            {buttonLabel}
          </MotionButton>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">नई बकाया गणना अनुरोध / New Request</h2>
                <p className="text-sm text-gray-500 mt-1">Fill all employee details to start a calculation</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="border-b pb-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">कर्मचारी विवरण / Employee Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee ID / PF Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="employeeId"
                        required
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="e.g. PF/1234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee Name / कर्मचारी का नाम <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="employeeName"
                        required
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="Full name"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-b pb-6">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">जाँचकर्ता / Checker Names</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Concerned JA Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="checkerNameJA"
                        required
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="Junior Assistant name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Concerned SA Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="checkerNameSA"
                        required
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="Senior Assistant name"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">बकाया अवधि / Arrear Period</h3>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        From / दिनांक से <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        required
                        defaultValue="2016-01-01"
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        To / दिनांक तक <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        required
                        defaultValue="2021-06-30"
                        className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-3 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'अनुरोध बनाएं / Create Request →'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
