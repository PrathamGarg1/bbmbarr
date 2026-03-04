import { NextRequest, NextResponse } from 'next/server'

// Email verification is disabled — the system uses role-based accounts.
export async function GET(_req: NextRequest) {
    return NextResponse.json(
        { error: 'Email verification is not used in this system.' },
        { status: 410 }
    )
}
