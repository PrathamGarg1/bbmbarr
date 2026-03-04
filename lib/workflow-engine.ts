import { prisma } from './db'

export type UserRole = 'CLERK' | 'JR_ASSISTANT' | 'SR_ASSISTANT' | 'SUPERINTENDENT' | 'AO'
export type WorkflowStatus = 'DRAFT' | 'PENDING_CALC' | 'PENDING_BUDGET' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'

interface User {
    id: string
    role: UserRole
}

interface ArrearRequest {
    id: string
    status: WorkflowStatus
    approvedByJrAssistant?: string | null
    approvedBySrAssistant?: string | null
    approvedByAO?: string | null
}

export function canApprove(user: User, request: ArrearRequest): boolean {
    const { role } = user
    const { status } = request

    switch (status) {
        case 'PENDING_CALC':
            return role === 'JR_ASSISTANT'
        case 'PENDING_BUDGET':
            return role === 'SR_ASSISTANT'
        case 'PENDING_APPROVAL':
            return role === 'AO'
        default:
            return false
    }
}

export function canEdit(user: User, request: ArrearRequest): boolean {
    const { role } = user
    const { status } = request

    if (status === 'DRAFT') return role === 'CLERK'
    if (status === 'PENDING_CALC') return role === 'JR_ASSISTANT'
    if (status === 'PENDING_BUDGET') return role === 'SR_ASSISTANT'

    return false
}

export function getNextStatus(currentStatus: WorkflowStatus, action: 'APPROVE' | 'REJECT'): WorkflowStatus {
    if (action === 'REJECT') return 'REJECTED'

    switch (currentStatus) {
        case 'DRAFT':
            return 'PENDING_CALC'
        case 'PENDING_CALC':
            return 'PENDING_BUDGET'
        case 'PENDING_BUDGET':
            return 'PENDING_APPROVAL'
        case 'PENDING_APPROVAL':
            return 'APPROVED'
        default:
            return currentStatus
    }
}

export async function getNextApproverEmail(status: WorkflowStatus): Promise<string | null> {
    let role: UserRole | null = null

    switch (status) {
        case 'PENDING_CALC':
            role = 'JR_ASSISTANT'
            break
        case 'PENDING_BUDGET':
            role = 'SR_ASSISTANT'
            break
        case 'PENDING_APPROVAL':
            role = 'AO'
            break
        default:
            return null
    }

    const user = await prisma.user.findFirst({
        where: { role },
        select: { email: true },
    })

    return user?.email || null
}

export function getStatusLabel(status: WorkflowStatus): string {
    const labels: Record<WorkflowStatus, string> = {
        DRAFT: 'Draft',
        PENDING_CALC: 'Pending Calculation Review',
        PENDING_BUDGET: 'Pending Budget Review',
        PENDING_APPROVAL: 'Pending Final Approval',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
    }
    return labels[status]
}

export function getStatusColor(status: WorkflowStatus): string {
    const colors: Record<WorkflowStatus, string> = {
        DRAFT: 'gray',
        PENDING_CALC: 'yellow',
        PENDING_BUDGET: 'orange',
        PENDING_APPROVAL: 'blue',
        APPROVED: 'green',
        REJECTED: 'red',
    }
    return colors[status]
}
