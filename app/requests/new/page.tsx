
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function NewRequestPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'CLERK') {
    redirect('/dashboard')
  }

  async function createRequest(formData: FormData) {
    'use server'
    const session = await auth()
    if (!session?.user?.email || session.user.role !== 'CLERK') throw new Error('Not authorized')

    const initiator = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!initiator) throw new Error('User not found')

    const employeeId = formData.get('employeeId') as string
    const employeeName = formData.get('employeeName') as string
    const checkerNameJA = formData.get('checkerNameJA') as string
    const checkerNameSA = formData.get('checkerNameSA') as string
    const startDate = new Date(formData.get('startDate') as string)
    const endDate = new Date(formData.get('endDate') as string)

    const req = await prisma.arrearRequest.create({
      data: {
        employeeId,
        employeeName,
        checkerNameJA,
        checkerNameSA,
        startDate,
        endDate,
        status: 'PENDING_CALC',
        initiatorId: initiator.id
      }
    })

    redirect(`/requests/${req.id}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">नई बकाया गणना अनुरोध</h1>
        <p className="text-sm text-gray-500 mt-1">New Arrear Calculation Request — Fill all employee details</p>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <form action={createRequest} className="space-y-6">
          
          {/* Employee Info */}
          <div className="border-b pb-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">कर्मचारी विवरण / Employee Details</h2>
            <div className="grid grid-cols-1 gap-5">
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

          {/* Checker Names */}
          <div className="border-b pb-6">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">जाँचकर्ता / Checker Names</h2>
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

          {/* Arrear Period */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">बकाया अवधि / Arrear Period</h2>
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

          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              अनुरोध बनाएं / Create Request →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
