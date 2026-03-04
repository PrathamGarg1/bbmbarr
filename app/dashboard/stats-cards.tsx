'use client'

import { motion } from 'framer-motion'
import { FileText, Clock, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardsProps {
  totalRequests: number
  pendingRequests: number
  approvedRequests: number
}

export function StatsCards({ totalRequests, pendingRequests, approvedRequests }: StatsCardsProps) {
  const stats = [
    {
      label: 'Total Requests',
      labelHi: 'कुल अनुरोध',
      value: totalRequests,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'In Progress',
      labelHi: 'प्रगति में',
      value: pendingRequests,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Approved',
      labelHi: 'स्वीकृत',
      value: approvedRequests,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={cn("p-2.5 rounded-lg", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold text-slate-900">{stat.value}</h3>
            <p className="text-sm font-medium text-slate-500 mt-1">{stat.label}</p>
            <p className="text-xs text-slate-400">{stat.labelHi}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
