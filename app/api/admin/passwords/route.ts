import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcrypt'

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth()
        if (!session?.user || session.user.role !== 'PASSWORD_MANAGER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const body = await req.json()
        const { targetRole, newPassword, currentPassword } = body

        if (!targetRole || !newPassword || !currentPassword) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
        }

        // Validate the Password Manager's own current password
        const pmUser = await prisma.user.findUnique({ where: { email: 'pm@bbmb' } })
        if (!pmUser) return NextResponse.json({ error: 'PM user not found' }, { status: 500 })

        const valid = await bcrypt.compare(currentPassword, pmUser.password)
        if (!valid) {
            return NextResponse.json({ error: 'Your current password is incorrect' }, { status: 401 })
        }

        // Map role to email
        const roleEmailMap: Record<string, string> = {
            CLERK: 'clerk@bbmb',
            JA: 'ja@bbmb',
            SA: 'sa@bbmb',
            SUPERINTENDENT: 'superintendent@bbmb',
        }

        const targetEmail = roleEmailMap[targetRole]
        if (!targetEmail) {
            return NextResponse.json({ error: 'Invalid target role' }, { status: 400 })
        }

        const hashed = await bcrypt.hash(newPassword, 10)
        await prisma.user.update({
            where: { email: targetEmail },
            data: { password: hashed }
        })

        return NextResponse.json({ success: true, message: `Password updated for ${targetRole}` })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
