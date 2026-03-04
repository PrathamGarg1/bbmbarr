import { NextRequest, NextResponse } from 'next/server'

// Registration is disabled — the system uses role-based accounts seeded directly.
// This route is kept as a stub to prevent 404 errors.
export async function POST(_req: NextRequest) {
    return NextResponse.json(
        { error: 'Registration is disabled. Contact the system administrator.' },
        { status: 403 }
    )
}
