import { UserProfile } from '@clerk/nextjs'

export default function SetupMfaPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-md w-full mb-6 text-center">
        <span className="text-2xl font-bold">Flow<span className="text-indigo-600">Pay</span></span>
        <h1 className="mt-4 text-xl font-semibold text-gray-900">Secure your account</h1>
        <p className="mt-2 text-sm text-gray-500">
          FlowPay requires two-factor authentication to protect your funds.
          Add an authenticator app (Google Authenticator, Authy, etc.) to continue.
        </p>
      </div>
      <UserProfile
        appearance={{
          elements: {
            rootBox: 'w-full max-w-2xl',
            card: 'shadow-sm rounded-2xl',
            navbar: 'hidden',
            navbarMobileMenuButton: 'hidden',
          },
        }}
        path="/setup-mfa"
        routing="path"
      />
    </div>
  )
}
