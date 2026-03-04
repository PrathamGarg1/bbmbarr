import Papa from 'papaparse'

export interface BulkImportRow {
    employeeId: string
    employeeName: string
    designation?: string
    eventDate: string
    eventType: string
    dueBasicPay: string
    drawnBasicPay: string
    drawnGradePay: string
}

export interface ParsedPayEvent {
    date: Date
    type: string
    basicPay: number
    drawnBasicPay: number
    drawnGradePay: number
}

export interface EmployeeData {
    employeeId: string
    employeeName: string
    designation?: string
    payEvents: ParsedPayEvent[]
}

export interface ValidationError {
    row: number
    field: string
    message: string
}

export interface ParseResult {
    employees: Map<string, EmployeeData>
    errors: ValidationError[]
    totalRows: number
}

export function parseCSV(csvContent: string): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
        const errors: ValidationError[] = []
        const employeesMap = new Map<string, EmployeeData>()

        Papa.parse<BulkImportRow>(csvContent, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                results.data.forEach((row, index) => {
                    const rowNumber = index + 2 // +2 because index is 0-based and header is row 1

                    // Validate required fields
                    if (!row.employeeId) {
                        errors.push({ row: rowNumber, field: 'employeeId', message: 'Employee ID is required' })
                        return
                    }
                    if (!row.employeeName) {
                        errors.push({ row: rowNumber, field: 'employeeName', message: 'Employee Name is required' })
                        return
                    }
                    if (!row.eventDate) {
                        errors.push({ row: rowNumber, field: 'eventDate', message: 'Event Date is required' })
                        return
                    }
                    if (!row.eventType) {
                        errors.push({ row: rowNumber, field: 'eventType', message: 'Event Type is required' })
                        return
                    }
                    if (!row.dueBasicPay) {
                        errors.push({ row: rowNumber, field: 'dueBasicPay', message: 'Due Basic Pay is required' })
                        return
                    }
                    if (!row.drawnBasicPay) {
                        errors.push({ row: rowNumber, field: 'drawnBasicPay', message: 'Drawn Basic Pay is required' })
                        return
                    }
                    if (!row.drawnGradePay) {
                        errors.push({ row: rowNumber, field: 'drawnGradePay', message: 'Drawn Grade Pay is required' })
                        return
                    }

                    // Parse date
                    const eventDate = parseDate(row.eventDate)
                    if (!eventDate) {
                        errors.push({ row: rowNumber, field: 'eventDate', message: 'Invalid date format. Use DD-MM-YYYY or YYYY-MM-DD' })
                        return
                    }

                    // Parse numbers
                    const dueBasicPay = parseFloat(row.dueBasicPay)
                    const drawnBasicPay = parseFloat(row.drawnBasicPay)
                    const drawnGradePay = parseFloat(row.drawnGradePay)

                    if (isNaN(dueBasicPay)) {
                        errors.push({ row: rowNumber, field: 'dueBasicPay', message: 'Due Basic Pay must be a number' })
                        return
                    }
                    if (isNaN(drawnBasicPay)) {
                        errors.push({ row: rowNumber, field: 'drawnBasicPay', message: 'Drawn Basic Pay must be a number' })
                        return
                    }
                    if (isNaN(drawnGradePay)) {
                        errors.push({ row: rowNumber, field: 'drawnGradePay', message: 'Drawn Grade Pay must be a number' })
                        return
                    }

                    // Create or update employee data
                    if (!employeesMap.has(row.employeeId)) {
                        employeesMap.set(row.employeeId, {
                            employeeId: row.employeeId,
                            employeeName: row.employeeName,
                            designation: row.designation,
                            payEvents: [],
                        })
                    }

                    const employee = employeesMap.get(row.employeeId)!
                    employee.payEvents.push({
                        date: eventDate,
                        type: row.eventType,
                        basicPay: dueBasicPay,
                        drawnBasicPay,
                        drawnGradePay,
                    })
                })

                // Sort pay events by date for each employee
                employeesMap.forEach((employee) => {
                    employee.payEvents.sort((a, b) => a.date.getTime() - b.date.getTime())
                })

                resolve({
                    employees: employeesMap,
                    errors,
                    totalRows: results.data.length,
                })
            },
            error: (error: any) => {
                reject(new Error(`CSV parsing error: ${error.message}`))
            },
        })
    })
}

function parseDate(dateStr: string): Date | null {
    // Try DD-MM-YYYY format
    const ddmmyyyy = dateStr.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
    if (ddmmyyyy) {
        const [, day, month, year] = ddmmyyyy
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        if (!isNaN(date.getTime())) return date
    }

    // Try YYYY-MM-DD format
    const yyyymmdd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (yyyymmdd) {
        const [, year, month, day] = yyyymmdd
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        if (!isNaN(date.getTime())) return date
    }

    return null
}

export function generateCSVTemplate(): string {
    const headers = [
        'employeeId',
        'employeeName',
        'designation',
        'eventDate',
        'eventType',
        'dueBasicPay',
        'drawnBasicPay',
        'drawnGradePay',
    ]

    const sampleRows = [
        ['EMP001', 'John Doe', 'Assistant Manager', '01-01-2016', 'INITIAL_PAY', '68300', '21710', '5350'],
        ['EMP001', 'John Doe', 'Assistant Manager', '01-07-2016', 'ANNUAL_INCREMENT', '70300', '22530', '5350'],
        ['EMP002', 'Jane Smith', 'Senior Clerk', '01-01-2016', 'INITIAL_PAY', '65000', '20000', '5350'],
    ]

    const csv = [headers, ...sampleRows].map((row) => row.join(',')).join('\n')
    return csv
}
