import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const { auth } = NextAuth(authConfig)

// Route access rules: path prefix → allowed roles
const ROUTE_RULES: Record<string, string[]> = {
    '/requests/new': ['CLERK'],
    '/requests/bulk-verify': ['SUPERINTENDENT'],
    '/admin/passwords': ['PASSWORD_MANAGER'],
}

export default auth((req: NextRequest & { auth: any }) => {
    const { nextUrl, auth: session } = req

    // Not logged in → redirect to login
    if (!session && !nextUrl.pathname.startsWith('/login')) {
        const loginUrl = new URL('/login', nextUrl.origin)
        return NextResponse.redirect(loginUrl)
    }

    // Already logged in → don't show login
    if (session && nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl.origin))
    }

    if (session) {
        const role = session.user?.role as string

        for (const [prefix, allowedRoles] of Object.entries(ROUTE_RULES)) {
            if (nextUrl.pathname.startsWith(prefix)) {
                if (!allowedRoles.includes(role)) {
                    return NextResponse.redirect(new URL('/dashboard', nextUrl.origin))
                }
            }
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images).*)'],
}
