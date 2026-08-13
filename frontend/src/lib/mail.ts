import nodemailer from 'nodemailer';
import { BRAND } from '../config/brand';

// Outside production, missing SMTP credentials shouldn't break flows like OTP
// login — fall back to a no-op transport so the app keeps working locally
// (the OTP itself is already logged to the console in development).
const smtpConfigured = !!process.env.SMTP_HOST;
const isProduction = process.env.NODE_ENV === 'production';

if (!smtpConfigured && !isProduction) {
    console.warn('[mail] SMTP_HOST is not set — emails will be logged instead of sent.');
}

const transporter = (smtpConfigured || isProduction)
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    })
    : nodemailer.createTransport({ jsonTransport: true });

const FROM = `${process.env.SMTP_FROM}`;
const YEAR = new Date().getFullYear();

// Mirrors the site's "clay / sand / forest" palette and type stack (see globals.css)
// so transactional emails read as the same brand as the web app.
const FONT_SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const FONT_SERIF = "Georgia,'Times New Roman',serif";
const FONT_MONO = "ui-monospace,'SF Mono','Courier New',monospace";

const C = {
    forest: '#1f3b30',
    sand: '#f4ede0',
    paper: '#faf7f0',
    ink: '#1c1916',
    ink2: '#3a3530',
    muted: '#756e63',
    line: '#d8cdb6',
    line2: '#c9bda3',
    positive: '#1f7a4d',
    negative: '#b8443a',
    info: '#1e5ab4',
};

const wrapOpen = `<div style="font-family:${FONT_SANS};max-width:580px;margin:0 auto;padding:40px 20px;color:${C.ink2};background:${C.paper};">`;

const header = `
    <div style="text-align:center;margin-bottom:28px;">
        <h1 style="font-family:${FONT_SERIF};color:${C.forest};margin:0;font-size:26px;font-weight:700;letter-spacing:-0.01em;">${BRAND.name}</h1>
    </div>
`;

const cardOpen = `<div style="background:#ffffff;border-radius:8px;padding:32px;border:1px solid ${C.line};">`;

const footer = `
    <div style="text-align:center;margin-top:32px;padding-top:20px;border-top:1px solid ${C.line};">
        <p style="font-size:12px;color:${C.muted};margin:0;line-height:20px;">
            &copy; ${YEAR} ${BRAND.name}. All rights reserved.<br>
            You are receiving this email because of activity on your ${BRAND.name} account.<br>
            <a href="mailto:${BRAND.contactEmail}" style="color:${C.muted};text-decoration:underline;">${BRAND.contactEmail}</a>
        </p>
    </div>
`;

export async function sendOTPEmail(email: string, otp: string) {
    await transporter.sendMail({
        from: FROM,
        to: email,
        subject: `Your ${BRAND.name} verification code: ${otp}`,
        text: `Your ${BRAND.name} verification code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\n-- ${BRAND.name}`,
        html: `
            ${wrapOpen}
                ${header}

                ${cardOpen}
                    <h2 style="font-family:${FONT_SERIF};margin-top:0;color:${C.ink};font-size:20px;font-weight:600;">Verify your email address</h2>
                    <p style="font-size:15px;line-height:24px;color:${C.ink2};margin-bottom:24px;">
                        Thank you for signing up. Use the code below to complete your verification. This code expires in <strong>10 minutes</strong>.
                    </p>

                    <div style="background:${C.sand};border-radius:8px;padding:24px;text-align:center;border:1px solid ${C.line2};margin-bottom:24px;">
                        <span style="font-family:${FONT_MONO};font-size:38px;font-weight:700;color:${C.forest};letter-spacing:0.3em;">${otp}</span>
                    </div>

                    <p style="font-size:13px;color:${C.muted};margin:0;">
                        If you did not create an account with ${BRAND.name}, you can safely ignore this email.
                    </p>
                </div>

                ${footer}
            </div>
        `,
    });
    console.log(`[Email] OTP sent to ${email}`);
}

export async function sendPasswordResetEmail(email: string, otp: string) {
    await transporter.sendMail({
        from: FROM,
        to: email,
        subject: `Reset your ${BRAND.name} password`,
        text: `Your ${BRAND.name} password reset code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you did not request a password reset, please ignore this email.\n\n-- ${BRAND.name}`,
        html: `
            ${wrapOpen}
                ${header}

                ${cardOpen}
                    <h2 style="font-family:${FONT_SERIF};margin-top:0;color:${C.ink};font-size:20px;font-weight:600;">Reset your password</h2>
                    <p style="font-size:15px;line-height:24px;color:${C.ink2};margin-bottom:24px;">
                        We received a request to reset your password. Use the code below to proceed. This code expires in <strong>10 minutes</strong>.
                    </p>

                    <div style="background:${C.sand};border-radius:8px;padding:24px;text-align:center;border:1px solid ${C.line2};margin-bottom:24px;">
                        <span style="font-family:${FONT_MONO};font-size:38px;font-weight:700;color:${C.forest};letter-spacing:0.3em;">${otp}</span>
                    </div>

                    <p style="font-size:13px;color:${C.muted};margin:0;">
                        If you did not request a password reset, please ignore this email. Your password will not change.
                    </p>
                </div>

                ${footer}
            </div>
        `,
    });
    console.log(`[Email] Password reset sent to ${email}`);
}

export async function sendBookingTicketEmail(email: string, bookingId: string, ticketPdfBuffer?: Buffer) {
    const hasAttachment = !!ticketPdfBuffer;

    const mailOptions: any = {
        from: FROM,
        to: email,
        cc: BRAND.contactEmail,
        subject: `Booking Confirmed — ${bookingId} | ${BRAND.name}`,
        text: [
            `Hi,`,
            ``,
            `Your booking with ${BRAND.name} has been confirmed.`,
            ``,
            `Booking Reference: ${bookingId}`,
            ``,
            hasAttachment
                ? `Your E-Ticket is attached to this email as a PDF. Please save it for your journey.`
                : `You can view and download your E-Ticket from the "My Bookings" section of your account.`,
            ``,
            `Next steps:`,
            `- ${hasAttachment ? 'Save the attached E-Ticket PDF.' : 'Download your ticket from My Bookings.'}`,
            `- Carry a valid government-issued photo ID while travelling.`,
            `- Check the reporting time for your flight with the airline.`,
            ``,
            `For support, contact us at ${BRAND.contactEmail}`,
            ``,
            `-- ${BRAND.name}`,
        ].join('\n'),
        html: `
            ${wrapOpen}
                ${header}

                ${cardOpen}
                    <h2 style="font-family:${FONT_SERIF};margin-top:0;color:${C.ink};font-size:20px;font-weight:600;">Booking Confirmed</h2>
                    <p style="font-size:15px;line-height:24px;color:${C.ink2};margin-bottom:24px;">
                        Thank you for choosing ${BRAND.name}. Your booking has been successfully confirmed.
                    </p>

                    <div style="background:${C.sand};border-radius:8px;padding:18px 20px;border:1px solid ${C.line2};margin-bottom:24px;">
                        <p style="margin:0;font-size:12px;color:${C.muted};text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Booking Reference</p>
                        <p style="margin:6px 0 0;font-family:${FONT_MONO};font-size:20px;font-weight:700;color:${C.ink};">${bookingId}</p>
                    </div>

                    ${hasAttachment ? `
                    <div style="background:#eef3ef;border-radius:8px;padding:16px 20px;border:1px solid #c7d9cd;margin-bottom:24px;">
                        <p style="margin:0;font-size:14px;font-weight:600;color:${C.forest};">E-Ticket attached</p>
                        <p style="margin:4px 0 0;font-size:13px;color:${C.forest};">Your E-Ticket PDF is attached to this email. Please save it for your journey.</p>
                    </div>
                    ` : `
                    <p style="font-size:14px;line-height:22px;color:${C.ink2};margin-bottom:24px;">
                        You can view and download your E-Ticket from the <strong>My Bookings</strong> section of your account.
                    </p>
                    `}

                    <div style="border-top:1px solid ${C.line};padding-top:20px;">
                        <p style="font-size:13px;font-weight:600;color:${C.ink};margin:0 0 8px;">Next steps</p>
                        <ul style="font-size:13px;color:${C.muted};padding-left:18px;margin:0;line-height:22px;">
                            <li>${hasAttachment ? 'Save the attached E-Ticket PDF for your journey.' : 'Log in and download your ticket from <strong>My Bookings</strong>.'}</li>
                            <li>Carry a valid government-issued photo ID while travelling.</li>
                            <li>Check the reporting time for your flight with the airline.</li>
                        </ul>
                    </div>
                </div>

                ${footer}
            </div>
        `,
        ...(hasAttachment && {
            attachments: [{
                filename: `E-Ticket-${bookingId}.pdf`,
                content: ticketPdfBuffer,
                contentType: 'application/pdf',
            }]
        })
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email] Booking confirmation sent to ${email}${hasAttachment ? ' with attachment' : ''}`);
}

export async function sendAdminRefundRequestEmail(
    userName: string,
    userEmail: string,
    bookingRef: string,
    passengerCount: number,
    remarks?: string,
) {
    await transporter.sendMail({
        from: FROM,
        to: BRAND.contactEmail,
        subject: `[${BRAND.name}] Refund Request — ${bookingRef}`,
        text: [
            `A refund request has been submitted.`,
            ``,
            `User: ${userName} (${userEmail})`,
            `Booking Ref: ${bookingRef}`,
            `Passengers: ${passengerCount}`,
            `Remarks: ${remarks || 'None'}`,
            ``,
            `Please review and process this refund in the admin panel.`,
        ].join('\n'),
        html: `
            ${wrapOpen}
                ${header}
                ${cardOpen}
                    <h2 style="font-family:${FONT_SERIF};margin-top:0;color:${C.negative};font-size:18px;font-weight:600;">Refund Request Submitted</h2>
                    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;">
                        <tr><td style="padding:8px 0;color:${C.muted};font-weight:600;width:130px;">User</td><td style="padding:8px 0;color:${C.ink};">${userName} &lt;${userEmail}&gt;</td></tr>
                        <tr><td style="padding:8px 0;color:${C.muted};font-weight:600;">Booking Ref</td><td style="padding:8px 0;color:${C.ink};font-family:${FONT_MONO};">${bookingRef}</td></tr>
                        <tr><td style="padding:8px 0;color:${C.muted};font-weight:600;">Passengers</td><td style="padding:8px 0;color:${C.ink};">${passengerCount}</td></tr>
                        ${remarks ? `<tr><td style="padding:8px 0;color:${C.muted};font-weight:600;vertical-align:top;">Remarks</td><td style="padding:8px 0;color:${C.ink};">${remarks}</td></tr>` : ''}
                    </table>
                    <p style="font-size:13px;color:${C.muted};margin:0;">Please log in to the admin panel to review and process this refund.</p>
                </div>
                ${footer}
            </div>
        `,
    });
    console.log(`[Email] Admin refund notification sent for booking ${bookingRef}`);
}

export async function sendAdminTopUpRequestEmail(
    userName: string,
    userEmail: string,
    amount: number,
    requestId: number | string,
    method: 'MANUAL' | 'RAZORPAY',
    remarks?: string,
) {
    const methodLabel = method === 'RAZORPAY' ? 'Razorpay (auto-approved)' : 'Manual (pending approval)';
    await transporter.sendMail({
        from: FROM,
        to: BRAND.contactEmail,
        subject: `[${BRAND.name}] Wallet Top-Up Request — ₹${amount.toLocaleString('en-IN')} from ${userName}`,
        text: [
            `A wallet top-up request has been submitted.`,
            ``,
            `User: ${userName} (${userEmail})`,
            `Amount: ₹${amount.toLocaleString('en-IN')}`,
            `Method: ${methodLabel}`,
            `Request ID: ${requestId}`,
            remarks ? `Remarks: ${remarks}` : '',
            ``,
            method === 'MANUAL'
                ? `Please review and approve/reject this request in the admin panel.`
                : `This top-up was auto-approved after successful Razorpay payment.`,
        ].filter(Boolean).join('\n'),
        html: `
            ${wrapOpen}
                ${header}
                ${cardOpen}
                    <h2 style="font-family:${FONT_SERIF};margin-top:0;color:${C.info};font-size:18px;font-weight:600;">Wallet Top-Up Request</h2>
                    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;">
                        <tr><td style="padding:8px 0;color:${C.muted};font-weight:600;width:130px;">User</td><td style="padding:8px 0;color:${C.ink};">${userName} &lt;${userEmail}&gt;</td></tr>
                        <tr><td style="padding:8px 0;color:${C.muted};font-weight:600;">Amount</td><td style="padding:8px 0;color:${C.positive};font-weight:700;font-size:16px;">₹${amount.toLocaleString('en-IN')}</td></tr>
                        <tr><td style="padding:8px 0;color:${C.muted};font-weight:600;">Method</td><td style="padding:8px 0;color:${C.ink};">${methodLabel}</td></tr>
                        <tr><td style="padding:8px 0;color:${C.muted};font-weight:600;">Request ID</td><td style="padding:8px 0;color:${C.ink};font-family:${FONT_MONO};">${requestId}</td></tr>
                        ${remarks ? `<tr><td style="padding:8px 0;color:${C.muted};font-weight:600;vertical-align:top;">Remarks</td><td style="padding:8px 0;color:${C.ink};">${remarks}</td></tr>` : ''}
                    </table>
                    <p style="font-size:13px;color:${C.muted};margin:0;">
                        ${method === 'MANUAL'
                            ? 'Please log in to the admin panel to review and approve/reject this request.'
                            : 'This top-up was automatically approved after successful Razorpay payment. No action required.'}
                    </p>
                </div>
                ${footer}
            </div>
        `,
    });
    console.log(`[Email] Admin top-up notification sent — ₹${amount} (${method}) from ${userEmail}`);
}

export async function sendEnquiryNotificationEmail(name: string, email: string, message: string) {
    await transporter.sendMail({
        from: FROM,
        to: BRAND.contactEmail,
        replyTo: email,
        subject: `New enquiry from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\n-- ${BRAND.name} Contact Form`,
        html: `
            ${wrapOpen}
                ${header}
                ${cardOpen}
                    <h2 style="font-family:${FONT_SERIF};margin-top:0;color:${C.ink};font-size:18px;font-weight:600;">New Enquiry</h2>
                    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:14px;">
                        <tr>
                            <td style="padding:8px 0;color:${C.muted};font-weight:600;width:70px;">Name</td>
                            <td style="padding:8px 0;color:${C.ink};">${name}</td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;color:${C.muted};font-weight:600;">Email</td>
                            <td style="padding:8px 0;color:${C.ink};"><a href="mailto:${email}" style="color:${C.forest};">${email}</a></td>
                        </tr>
                    </table>
                    <div style="background:${C.sand};border-radius:8px;padding:18px;border:1px solid ${C.line2};">
                        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${C.muted};">Message</p>
                        <p style="margin:0;font-size:14px;color:${C.ink};white-space:pre-line;">${message}</p>
                    </div>
                </div>
            </div>
        `,
    });
    console.log(`[Email] Enquiry notification sent from ${email}`);
}
