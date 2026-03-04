import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from '@/lib/auth.config'
import { prisma } from '@/lib/db'
import bcrypt from 'bcrypt'

// Map the user-facing role label to the DB email identifier
const ROLE_EMAIL_MAP: Record<string, string> = {
    CLERK: 'clerk@bbmb',
    JA: 'ja@bbmb',
    SA: 'sa@bbmb',
    SUPERINTENDENT: 'superintendent@bbmb',
    PASSWORD_MANAGER: 'pm@bbmb',
}

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                role: { label: 'Role', type: 'text' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.role || !credentials?.password) {
                    return null
                }

                const email = ROLE_EMAIL_MAP[credentials.role as string]
                if (!email) return null

                const user = await prisma.user.findUnique({
                    where: { email },
                })

                if (!user || !user.password) {
                    return null
                }

                const isPasswordValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                )

                if (!isPasswordValid) {
                    return null
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                }
            },
        }),
    ],
})
