import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from './sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  const role = session.user.role || 'CLERK'

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar Navigation */}
      <Sidebar userRole={role} />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 transition-all duration-200 ease-in-out">
        <div className="w-full max-w-7xl mx-auto p-6 md:p-8 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  )
}

