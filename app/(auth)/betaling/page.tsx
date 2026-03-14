export default function Betaling() {
  const stripeLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? '#'

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-gray-900">LokalProfil</span>
        </div>

        <div className="card mb-6">
          <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Prøveperioden er over</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            Dine kunder og data er trygge. Fortsett med LokalProfil for å sende påminnelser og hente inn anmeldelser.
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left border border-gray-100">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-semibold text-gray-900">LokalProfil</span>
              <span className="text-sm font-bold text-gray-900">399 kr/mnd</span>
            </div>
            <div className="text-xs text-gray-400">100 SMS inkludert · 0,40 kr per SMS etter det</div>
            <div className="text-xs text-gray-400 mt-0.5">Ingen binding · Avslutt når som helst</div>
          </div>

          <a
            href={stripeLink}
            className="btn-primary w-full text-center block py-3 text-base"
          >
            Betal og fortsett →
          </a>

          <p className="text-xs text-gray-400 mt-3">
            Sikker betaling via Stripe 🔒
          </p>
        </div>

        <p className="text-xs text-gray-400">
          Spørsmål? Send oss en SMS på{' '}
          <a href="tel:+4790000000" className="text-green-600 font-medium">+47 900 00 000</a>
        </p>
      </div>
    </div>
  )
}
