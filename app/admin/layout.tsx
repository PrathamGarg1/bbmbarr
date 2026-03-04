import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'PASSWORD_MANAGER') {
    redirect('/dashboard')
  }
  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <main className="flex-1 md:ml-64">
        <div className="w-full max-w-7xl mx-auto p-6 md:p-8 lg:p-10">
          {children}
        </div>
      </main>
    </div>
  )
}
