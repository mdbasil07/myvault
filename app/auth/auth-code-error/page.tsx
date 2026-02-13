'use client'

import { useRouter } from 'next/navigation'

export default function AuthCodeError() {
    const router = useRouter()

    return (
        <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                {/* Icon */}
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                <h1 className="mb-2 text-xl font-bold text-slate-800">Authentication Failed</h1>
                <p className="mb-6 text-sm text-slate-500">
                    Something went wrong during sign-in. Please try again.
                </p>

                <button
                    onClick={() => router.push('/')}
                    className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-[0.97]"
                >
                    Back to Home
                </button>
            </div>
        </main>
    )
}
