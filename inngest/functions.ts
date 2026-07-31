import { inngest } from '@/lib/inngest'
import { prisma } from '@/lib/db/prisma'
import { ethPublicClient, polygonPublicClient } from '@/lib/viem'
import { Resend } from 'resend'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }

export const confirmOnChainTx = inngest.createFunction(
  { id: 'confirm-onchain-tx' },
  { event: 'payment/crypto.pending' },
  async ({ event, step }) => {
    await step.sleep('wait-for-blocks', '30s')

    const receipt = await step.run('check-receipt', async () => {
      const { txHash, chain } = event.data as { txHash: string; chain: string; transactionId: string }
      const client = chain === 'polygon' ? polygonPublicClient : ethPublicClient
      return client.getTransactionReceipt({ hash: txHash as `0x${string}` })
    })

    await step.run('update-db', async () => {
      const { transactionId } = event.data as { transactionId: string }
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: receipt.status === 'success' ? 'CONFIRMED' : 'FAILED' },
      })
    })
  }
)

export const sendInvoiceReminder = inngest.createFunction(
  { id: 'invoice-reminder' },
  { cron: '0 9 * * *' },
  async () => {
    const overdue = await prisma.invoice.findMany({
      where: { status: 'SENT', dueDate: { lt: new Date() } },
      include: { issuer: true },
    })

    for (const invoice of overdue) {
      await prisma.invoice.update({ where: { id: invoice.id }, data: { status: 'OVERDUE' } })

      await getResend().emails.send({
        from: 'River X <noreply@riverx.app>',
        to: invoice.clientEmail,
        subject: `Reminder: Invoice ${invoice.number} is overdue`,
        html: `
          <p>Hi ${invoice.clientName},</p>
          <p>Invoice <strong>${invoice.number}</strong> for <strong>${invoice.currency} ${invoice.total}</strong> is overdue.</p>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.paymentLink}">Pay Now</a></p>
        `,
      })
    }
  }
)

export const sendInvoiceEmail = inngest.createFunction(
  { id: 'send-invoice-email' },
  { event: 'invoice/send' },
  async ({ event }) => {
    const { invoiceId } = event.data as { invoiceId: string }
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { issuer: true, lineItems: true },
    })
    if (!invoice) return

    await getResend().emails.send({
      from: 'River X <noreply@riverx.app>',
      to: invoice.clientEmail,
      subject: `Invoice ${invoice.number} from ${invoice.issuer.name ?? invoice.issuer.email}`,
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:520px;margin:0 auto;background:#080807;color:#EDE8DF;padding:40px 32px">
          <div style="font-family:Georgia,serif;font-size:18px;letter-spacing:0.12em;margin-bottom:32px">
            RIVER <em style="font-style:normal;color:#C9922A">X</em>
          </div>
          <h2 style="font-family:Georgia,serif;font-weight:400;font-size:22px;margin-bottom:8px">Invoice ${invoice.number}</h2>
          <p style="color:#6B6558;font-size:13px;margin-bottom:24px">Hi ${invoice.clientName},</p>
          <p style="font-size:14px;margin-bottom:24px">You have received an invoice for <strong style="color:#C9922A">${invoice.currency} ${invoice.total}</strong> due on ${invoice.dueDate.toLocaleDateString()}.</p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
            <tr style="border-bottom:1px solid #252118">
              <th style="text-align:left;padding:8px;color:#6B6558;font-weight:400">Description</th>
              <th style="text-align:right;padding:8px;color:#6B6558;font-weight:400">Qty</th>
              <th style="text-align:right;padding:8px;color:#6B6558;font-weight:400">Total</th>
            </tr>
            ${invoice.lineItems.map(li => `<tr style="border-bottom:1px solid #1a1915"><td style="padding:8px">${li.description}</td><td style="padding:8px;text-align:right;color:#6B6558">${li.quantity}</td><td style="padding:8px;text-align:right">${li.total}</td></tr>`).join('')}
            <tr style="background:rgba(201,146,42,0.06);border-top:1px solid rgba(201,146,42,0.3)">
              <td colspan="2" style="padding:10px 8px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#6B6558">Total Due</td>
              <td style="padding:10px 8px;text-align:right;font-family:Georgia,serif;font-size:18px;color:#C9922A">${invoice.currency} ${invoice.total}</td>
            </tr>
          </table>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.paymentLink}" style="display:inline-block;background:#C9922A;color:#080807;padding:14px 28px;text-decoration:none;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:600">Pay Invoice</a>
        </div>
      `,
    })
  }
)
