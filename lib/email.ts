import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: false,
    auth: process.env.EMAIL_SERVER_USER
        ? {
            user: process.env.EMAIL_SERVER_USER,
            pass: process.env.EMAIL_SERVER_PASSWORD,
        }
        : undefined,
})

export async function sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@bbmb.gov.in',
        to: email,
        subject: 'Verify your BBMB Arrears Account',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Welcome to BBMB Arrears System</h2>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Verify Email Address
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p style="color: #666; font-size: 14px; margin-top: 24px;">
          If you didn't create this account, you can safely ignore this email.
        </p>
      </div>
    `,
    }

    // For development, just log the email
    if (!process.env.EMAIL_SERVER_USER) {
        console.log('📧 Verification Email (Development Mode):')
        console.log('To:', email)
        console.log('Verification URL:', verificationUrl)
        return
    }

    await transporter.sendMail(mailOptions)
}

export async function sendApprovalNotification(
    email: string,
    requestId: string,
    employeeName: string
) {
    const requestUrl = `${process.env.NEXTAUTH_URL}/requests/${requestId}`

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@bbmb.gov.in',
        to: email,
        subject: `Arrear Request Pending Your Approval - ${employeeName}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e40af;">Arrear Request Awaiting Approval</h2>
        <p>An arrear calculation request for <strong>${employeeName}</strong> is pending your approval.</p>
        <a href="${requestUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1e40af; color: white; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Review Request
        </a>
        <p>Or copy and paste this link in your browser:</p>
        <p style="color: #666; word-break: break-all;">${requestUrl}</p>
      </div>
    `,
    }

    if (!process.env.EMAIL_SERVER_USER) {
        console.log('📧 Approval Notification (Development Mode):')
        console.log('To:', email)
        console.log('Request URL:', requestUrl)
        return
    }

    await transporter.sendMail(mailOptions)
}

export async function sendRejectionNotification(
    email: string,
    employeeName: string,
    reason: string
) {
    const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@bbmb.gov.in',
        to: email,
        subject: `Arrear Request Rejected - ${employeeName}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Arrear Request Rejected</h2>
        <p>The arrear calculation request for <strong>${employeeName}</strong> has been rejected.</p>
        <p><strong>Reason:</strong></p>
        <p style="background-color: #fee2e2; padding: 12px; border-left: 4px solid #dc2626;">${reason}</p>
        <p>Please review and resubmit if necessary.</p>
      </div>
    `,
    }

    if (!process.env.EMAIL_SERVER_USER) {
        console.log('📧 Rejection Notification (Development Mode):')
        console.log('To:', email)
        console.log('Reason:', reason)
        return
    }

    await transporter.sendMail(mailOptions)
}
