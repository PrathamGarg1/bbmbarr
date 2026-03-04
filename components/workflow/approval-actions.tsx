'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { getStatusLabel, getStatusColor } from '@/lib/workflow-engine'

interface ApprovalActionsProps {
  requestId: string
  status: string
  canApprove: boolean
  canEdit: boolean
}

export function ApprovalActions({ requestId, status, canApprove, canEdit }: ApprovalActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')

  async function handleApprove() {
    if (!confirm('Are you sure you want to approve this request?')) return

    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${requestId}/approve`, {
        method: 'POST',
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message)
        router.refresh()
      } else {
        alert(data.error || 'Approval failed')
      }
    } catch (err) {
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      })

      const data = await res.json()

      if (res.ok) {
        alert(data.message)
        setShowRejectModal(false)
        router.refresh()
      } else {
        alert(data.error || 'Rejection failed')
      }
    } catch (err) {
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const statusColor = getStatusColor(status as any)
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    green: 'bg-green-100 text-green-800 border-green-300',
    red: 'bg-red-100 text-red-800 border-red-300',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-lg border ${colorClasses[statusColor as keyof typeof colorClasses]}`}>
            <span className="font-semibold">{getStatusLabel(status as any)}</span>
          </div>
        </div>

        {canApprove && (
          <div className="flex gap-2">
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
          </div>
        )}
      </div>

      {status === 'REJECTED' && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Rejection Reason:</p>
              <p className="text-sm text-red-700 mt-1">{/* Will be passed as prop */}</p>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Request</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this request:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
              placeholder="Enter rejection reason..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
