'use client'

import { useEffect, useState } from 'react'

export type ToastType = 'success' | 'error'

interface ToastProps {
    message: string
    type: ToastType
    onClose: () => void
}

export function Toast({ message, type, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true))

        // Auto-dismiss
        const timer = setTimeout(() => {
            setIsVisible(false)
            // Wait for exit animation to finish before unmounting
            setTimeout(onClose, 300)
        }, 3000)

        return () => clearTimeout(timer)
    }, [onClose])

    return (
        <div
            className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                } ${type === 'success'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
            role="alert"
        >
            {type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
            )}
            <p className="text-sm font-medium">{message}</p>
        </div>
    )
}
