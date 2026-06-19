import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/dashboard')

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-gray-900">
            Flow<span className="text-indigo-600">Pay</span>
          </h1>
          <p className="text-xl text-gray-600">
            The hybrid payment platform. Send money with stablecoins, cards, or bank transfers — all in one place.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 my-12">
          {[
            { icon: '💳', title: 'Cards', desc: 'Stripe-powered card payments' },
            { icon: '🏦', title: 'ACH / Bank', desc: 'Direct bank transfers via Plaid' },
            { icon: '🪙', title: 'Stablecoins', desc: 'USDC & USDT on Ethereum & Polygon' },
          ].map(f => (
            <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm border">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900">{f.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-4 justify-center">
          <Link href="/sign-up" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition">
            Get Started
          </Link>
          <Link href="/sign-in" className="bg-white text-gray-900 px-8 py-3 rounded-xl font-semibold border hover:bg-gray-50 transition">
            Sign In
          </Link>
        </div>
      </div>
    </main>
  )
}
