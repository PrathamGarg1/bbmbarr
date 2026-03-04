'use client'

import { updateStatus } from '../actions'

interface ApprovalWorkflowProps {
  request: any
  userRole: string
}

export default function ApprovalWorkflow({ request, userRole }: ApprovalWorkflowProps) {
  const currentStatus = request.status
  
  // DRAFT / PENDING_CALC -> PENDING_VERIFICATION (by JA/SA)
  // PENDING_VERIFICATION -> APPROVED (by SA/SUPERINTENDENT)
  
  const getAction = () => {
    if (['DRAFT', 'PENDING_CALC'].includes(currentStatus)) {
      if (['JA', 'SA'].includes(userRole)) {
        return { label: 'Submit for Verification', next: 'PENDING_VERIFICATION', role: 'JA/SA' }
      }
      return { note: 'Calculation entry in progress. Waiting for JA/SA.' }
    }
    
    if (currentStatus === 'PENDING_VERIFICATION') {
      if (['SA', 'SUPERINTENDENT'].includes(userRole)) {
        return { label: 'Approve & Finalize', next: 'APPROVED', role: 'SA/Superintendent' }
      }
      return { note: 'Waiting for SA or Superintendent to approve.' }
    }

    if (currentStatus === 'APPROVED') {
       return { note: 'This request is already approved.' }
    }

    return null
  }

  const action = getAction()

  if (!action) return null

  return (
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mt-6 group">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Workflow Actions</p>
            <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-bold">
                {currentStatus.replace(/_/g, ' ')}
            </span>
          </div>

          {'label' in action ? (
              <div className="space-y-3">
                 <button 
                    onClick={() => updateStatus(request.id, action.next)}
                    className="w-full bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:bg-indigo-700 transition-all active:scale-[0.98]"
                  >
                      {action.label}
                  </button>
                  <p className="text-[10px] text-center text-slate-400">Action performed by: {action.role}</p>
              </div>
          ) : (
              <div className="flex items-center gap-2 text-slate-500 italic text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
                  {action.note}
              </div>
          )}
      </div>
  )
}
