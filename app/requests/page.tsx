import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { FileText, Search } from 'lucide-react'

const PAGE_SIZE = 10

const STATUS_STYLE: Record<string, string> = {
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  PENDING_CALC: 'bg-amber-50 text-amber-700 border-amber-200',
  PENDING_APPROVAL: 'bg-blue-50 text-blue-700 border-blue-200',
  DRAFT: 'bg-slate-50 text-slate-600 border-slate-200',
}

export default async function AllRequestsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string }
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const params = await searchParams
  const q = params?.q?.trim() || ''
  const page = Math.max(1, parseInt(params?.page || '1', 10))
  const role = session.user.role as string

  // All roles see all requests
  const baseWhere: any = {}

  const searchWhere = q
    ? {
        ...baseWhere,
        OR: [
          { employeeName: { contains: q } },
          { employeeId: { contains: q } },
        ],
      }
    : baseWhere

  const [total, requests] = await Promise.all([
    prisma.arrearRequest.count({ where: searchWhere }),
    prisma.arrearRequest.findMany({
      where: searchWhere,
      include: { initiator: true },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const getArrearTotal = (jsonStr: string | null): number => {
    if (!jsonStr) return 0
    try {
      const segs = JSON.parse(jsonStr)
      if (!Array.isArray(segs)) return 0
      return segs.reduce((acc: number, seg: any) => acc + ((seg.totalDue || 0) - (seg.totalDrawn || 0)), 0)
    } catch { return 0 }
  }

  return (
    <div className="space-y-6 p-10
">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Requests / सभी अनुरोध</h1>
          <p className="text-sm text-slate-500 mt-1">{total} total records found</p>
        </div>
        {role === 'CLERK' && (
          <Link
            href="/requests/new"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + New Request
          </Link>
        )}
      </div>

      {/* Search Box */}
      <form method="GET" className="flex gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            name="q"
            defaultValue={q}
            type="text"
            placeholder="Search by name or employee ID..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Search
        </button>
        {q && (
          <Link
            href="/requests"
            className="px-4 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {requests.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
              <FileText className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-sm font-medium text-slate-900">
              {q ? `No results for "${q}"` : 'No requests yet'}
            </h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Checker (JA/SA)</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Updated</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req) => {
                  const total = getArrearTotal(req.calculationResult)
                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs mr-3 shrink-0">
                            {req.employeeName?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{req.employeeName || '—'}</p>
                            <p className="text-xs text-slate-500">{req.employeeId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                        {format(req.startDate, 'dd MMM yy')} – {format(req.endDate, 'dd MMM yy')}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {req.checkerNameJA && <span className="block">JA: {req.checkerNameJA}</span>}
                        {req.checkerNameSA && <span className="block">SA: {req.checkerNameSA}</span>}
                        {!req.checkerNameJA && !req.checkerNameSA && '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                          STATUS_STYLE[req.status] || STATUS_STYLE.DRAFT
                        )}>
                          {req.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                        {total > 0 ? `₹${Math.round(total).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right text-xs text-slate-400">
                        {format(req.updatedAt, 'dd MMM yy')}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/requests/${req.id}`}
                          className="text-indigo-600 hover:text-indigo-700 text-xs font-medium"
                        >
                          View →
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/requests?q=${q}&page=${page - 1}`}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50"
                >
                  ← Prev
                </Link>
              )}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page <= 3 ? i + 1 : page - 2 + i
                if (p < 1 || p > totalPages) return null
                return (
                  <Link
                    key={p}
                    href={`/requests?q=${q}&page=${p}`}
                    className={cn(
                      'px-3 py-1.5 border rounded text-xs',
                      p === page
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {p}
                  </Link>
                )
              })}
              {page < totalPages && (
                <Link
                  href={`/requests?q=${q}&page=${page + 1}`}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-600 hover:bg-slate-50"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
