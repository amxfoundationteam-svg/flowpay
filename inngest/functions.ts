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
        from: 'FlowPay <noreply@flowpay.app>',
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
      from: 'FlowPay <noreply@flowpay.app>',
      to: invoice.clientEmail,
      subject: `Invoice ${invoice.number} from ${invoice.issuer.name ?? invoice.issuer.email}`,
      html: `
        <h2>Invoice ${invoice.number}</h2>
        <p>Hi ${invoice.clientName},</p>
        <p>You have received an invoice for <strong>${invoice.currency} ${invoice.total}</strong> due on ${invoice.dueDate.toLocaleDateString()}.</p>
        <table border="1" cellpadding="8" style="border-collapse:collapse">
          <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
          ${invoice.lineItems.map(li => `<tr><td>${li.description}</td><td>${li.quantity}</td><td>${li.unitPrice}</td><td>${li.total}</td></tr>`).join('')}
        </table>
        <br/>
        <p><strong>Total: ${invoice.currency} ${invoice.total}</strong></p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/pay/${invoice.paymentLink}" style="background:#6366f1;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px">Pay Invoice</a></p>
      `,
    })
  }
)
