import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding role-based users...')

    const roles = [
        { email: 'clerk@bbmb', role: 'CLERK', name: 'Clerk', password: 'clerk1234' },
        { email: 'ja@bbmb', role: 'JA', name: 'Junior Assistant', password: 'ja12345678' },
        { email: 'sa@bbmb', role: 'SA', name: 'Senior Assistant', password: 'sa12345678' },
        { email: 'superintendent@bbmb', role: 'SUPERINTENDENT', name: 'Superintendent', password: 'super1234' },
        { email: 'pm@bbmb', role: 'PASSWORD_MANAGER', name: 'Password Manager', password: 'pm@secure!2024' },
    ]

    for (const u of roles) {
        const hashed = await bcrypt.hash(u.password, 10)
        await prisma.user.upsert({
            where: { email: u.email },
            update: { password: hashed, name: u.name, role: u.role },
            create: { email: u.email, password: hashed, name: u.name, role: u.role },
        })
        console.log(`✅ Upserted user: ${u.role} (${u.email})`)
    }

    // Seed DA Rates if not present
    const existingRates = await prisma.dARate.count()
    if (existingRates === 0) {
        console.log('🌱 Seeding DA rates...')
        const revisedRates = [
            { date: '2016-01-01', pct: 0 },
            { date: '2017-01-01', pct: 5 },
            { date: '2017-07-01', pct: 9 },
            { date: '2018-01-01', pct: 12 },
            { date: '2018-07-01', pct: 9 },
            { date: '2019-01-01', pct: 12 },
            { date: '2019-07-01', pct: 17 },
            { date: '2020-01-01', pct: 21 },
            { date: '2020-07-01', pct: 17 },  // freeze
            { date: '2021-01-01', pct: 17 },  // freeze
            { date: '2021-07-01', pct: 28 },
        ]

        for (const r of revisedRates) {
            await prisma.dARate.upsert({
                where: { effectiveDate_type: { effectiveDate: new Date(r.date), type: 'REVISED' } },
                update: { percentage: r.pct },
                create: { effectiveDate: new Date(r.date), percentage: r.pct, type: 'REVISED' },
            })
        }

        const preRevisedRates = [
            { date: '2016-01-01', pct: 125 },
            { date: '2017-01-01', pct: 132 },
            { date: '2017-07-01', pct: 136 },
            { date: '2018-01-01', pct: 142 },
        ]
        for (const r of preRevisedRates) {
            await prisma.dARate.upsert({
                where: { effectiveDate_type: { effectiveDate: new Date(r.date), type: 'PRE_REVISED' } },
                update: { percentage: r.pct },
                create: { effectiveDate: new Date(r.date), percentage: r.pct, type: 'PRE_REVISED' },
            })
        }
        console.log('✅ DA rates seeded')
    }

    console.log('✅ Seeding complete!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
