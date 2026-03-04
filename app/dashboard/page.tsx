import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { DashboardCharts } from './charts'
import { StatsCards } from './stats-cards'
import { MotionButton } from '@/components/ui/motion-button'
import { Plus, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { user } = session
  const role = user.role

  // All roles see all requests
  const where = {}
  const requests = await prisma.arrearRequest.findMany({
    where,
    include: { initiator: true },
    orderBy: { updatedAt: 'desc' }
  })

  // Analytics helpers
  const getArrearTotal = (jsonStr: string | null): number => {
    if (!jsonStr) return 0
    try {
      const segments = JSON.parse(jsonStr)
      if (!Array.isArray(segments)) return 0
      return segments.reduce((acc: number, seg: any) => {
        return acc + ((seg.totalDue ?? 0) - (seg.totalDrawn ?? 0))
      }, 0)
    } catch { return 0 }
  }

  // Status distribution for chart
  const statusCounts = requests.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }))

  // Monthly trend
  const trendMap = requests.reduce((acc, req) => {
    const total = getArrearTotal(req.calculationResult)
    if (total > 0) {
      const month = format(req.updatedAt, 'MMM yy')
      acc[month] = (acc[month] || 0) + total
    }
    return acc
  }, {} as Record<string, number>)
  const trendData = Object.entries(trendMap).map(([month, amount]) => ({ month, amount }))

  const pendingCount = requests.filter(r => ['DRAFT', 'PENDING_CALC'].includes(r.status)).length
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length

  return (
    <div className="space-y-8">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              भाखड़ा ब्यास प्रबंध बोर्ड
            </h2>
            <p className="text-sm text-slate-500">BHAKRA BEAS MANAGEMENT BOARD — Arrear Calculation System</p>
          </div>
        </div>
        {role === 'CLERK' && (
          <Link href="/requests/new">
            <MotionButton size="lg" className="shadow-blue-500/20">
              <Plus className="mr-2 h-5 w-5" />
              New Request
            </MotionButton>
          </Link>
        )}
      </div>

      <StatsCards
        totalRequests={requests.length}
        pendingRequests={pendingCount}
        approvedRequests={approvedCount}
      />

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="space-y-8">
        {/* Charts */}
        {requests.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Request Status Overview</h3>
            <div className="h-[280px]">
              <DashboardCharts
                statusData={statusData.length > 0 ? statusData : [{ name: 'No Data', value: 1 }]}
                trendData={trendData}
              />
            </div>
          </div>
        )}

        {/* Recent Requests Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Recent Requests</h3>
            <Link href="/requests" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              View All →
            </Link>
          </div>

          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-sm font-medium text-slate-900">No requests yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                {role === 'CLERK' ? 'Create a new arrear request to get started.' : 'No requests have been submitted yet.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.slice(0, 8).map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3 shrink-0">
                            {req.employeeName?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <Link href={`/requests/${req.id}`} className="block text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                              {req.employeeName || '—'}
                            </Link>
                            <span className="text-xs text-slate-500">{req.employeeId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {format(new Date(req.startDate), 'dd.MM.yyyy')} – {format(new Date(req.endDate), 'dd.MM.yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                          req.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          req.status === 'REJECTED' ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        )}>
                          {req.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-500">
                        {format(req.updatedAt, 'dd MMM yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
