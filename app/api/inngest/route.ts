import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { confirmOnChainTx, sendInvoiceReminder, sendInvoiceEmail } from '@/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [confirmOnChainTx, sendInvoiceReminder, sendInvoiceEmail],
})
