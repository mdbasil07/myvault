'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { Toast, type ToastType } from '@/components/Toast'

type Bookmark = {
    id: string
    user_id: string
    title: string
    url: string
    created_at: string
}

export default function Dashboard() {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

    // Form state
    const [title, setTitle] = useState('')
    const [url, setUrl] = useState('')
    const [adding, setAdding] = useState(false)

    // UI state
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ message, type })
    }

    // ---------- Auth: Check + Listen ----------
    useEffect(() => {
        let ignore = false

        // 1. Initial check
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (ignore) return
            if (!user) {
                router.replace('/')
            } else {
                setUser(user)
                setLoading(false)
            }
        }
        checkUser()

        // 2. Realtime auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (ignore) return
            if (!session) {
                router.replace('/')
                setUser(null)
            } else {
                setUser(session.user)
                setLoading(false)
            }
        })

        return () => {
            ignore = true
            subscription.unsubscribe()
        }
    }, [router])

    // ---------- Fetch Helper (for fallbacks) ----------
    const fetchBookmarks = useCallback(async () => {
        const { data, error } = await supabase
            .from('bookmarks')
            .select('*')
            .order('created_at', { ascending: false })

        if (!error && data) setBookmarks(data)
    }, [])

    // ---------- Bookmarks: Initial Load + Realtime ----------
    useEffect(() => {
        if (!user?.id) return

        let ignore = false

        // 1. Initial Load
        const load = async () => {
            const { data, error } = await supabase
                .from('bookmarks')
                .select('*')
                .order('created_at', { ascending: false })

            if (!ignore && !error && data) {
                setBookmarks(data)
            }
        }
        load()

        // 2. Realtime Subscription
        const channel = supabase
            .channel(`bookmarks-realtime-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'bookmarks',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const newBookmark = payload.new as Bookmark
                    if (!ignore) {
                        setBookmarks((prev) =>
                            // Deduplicate: prevent adding if already present (optimistic update guard)
                            prev.some(b => b.id === newBookmark.id) ? prev : [newBookmark, ...prev]
                        )
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'bookmarks',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    const deletedId = (payload.old as Bookmark).id
                    if (!ignore) {
                        setBookmarks((prev) => prev.filter((b) => b.id !== deletedId))
                    }
                }
            )
            .subscribe()

        return () => {
            ignore = true
            supabase.removeChannel(channel)
        }
    }, [user?.id])

    // ---------- Actions ----------
    const addBookmark = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim() || !url.trim() || !user) return

        setAdding(true)
        try {
            const { data, error } = await supabase
                .from('bookmarks')
                .insert({ title: title.trim(), url: url.trim(), user_id: user.id })
                .select()
                .single()

            if (error) throw error

            if (data) {
                setBookmarks((prev) =>
                    prev.some(b => b.id === data.id) ? prev : [data, ...prev]
                )
                setTitle('')
                setUrl('')
                showToast('Bookmark added successfully')
            }
        } catch (err) {
            console.error('Add failed:', err)
            showToast('Failed to add bookmark. Please try again.', 'error')
        } finally {
            setAdding(false)
        }
    }

    const deleteBookmark = async (id: string) => {
        // Optimistic delete
        const bookmarkToRestore = bookmarks.find((b) => b.id === id)
        setBookmarks((prev) => prev.filter((b) => b.id !== id))

        try {
            const { error } = await supabase.from('bookmarks').delete().eq('id', id)
            if (error) throw error
            showToast('Bookmark deleted')
        } catch (err) {
            console.error('Delete failed:', err)
            // Rollback: Safe functional update
            if (bookmarkToRestore) {
                setBookmarks((prev) => {
                    if (prev.some((b) => b.id === bookmarkToRestore.id)) return prev
                    return [...prev, bookmarkToRestore].sort(
                        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )
                })
            } else {
                fetchBookmarks() // Fallback if we lost track of the item
            }
            showToast('Failed to delete bookmark.', 'error')
        }
    }

    const handleSignOut = async () => {
        try {
            await supabase.auth.signOut()
            router.replace('/')
        } catch (err) {
            console.error('Logout failed:', err)
            showToast('Failed to sign out', 'error')
        }
    }

    // ---------- Render ----------
    if (loading) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-50 to-slate-100">
                <svg className="h-10 w-10 animate-spin text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm font-medium text-slate-500">Loading your bookmarks…</p>
            </div>
        )
    }

    const isFormEmpty = !title.trim() || !url.trim()

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
                <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
                    <h1 className="flex items-center gap-2 text-lg font-bold text-slate-800 sm:text-xl">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </span>
                        MyVault
                    </h1>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <span className="hidden text-sm text-slate-500 sm:inline">{user?.email}</span>
                        <button
                            onClick={handleSignOut}
                            aria-label="Sign out"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 active:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
                            </svg>
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
                {/* Add Form */}
                <form
                    onSubmit={addBookmark}
                    className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                    <h2 className="mb-4 text-base font-semibold text-slate-700">Add a bookmark</h2>

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="flex-1">
                            <label htmlFor="title" className="sr-only">Title</label>
                            <input
                                id="title"
                                type="text"
                                placeholder="Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full rounded-lg border border-white/30 bg-white/40 backdrop-blur-md px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition-all focus:border-indigo-400 focus:bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:shadow-lg"
                            />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="url" className="sr-only">URL</label>
                            <input
                                id="url"
                                type="url"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full rounded-lg border border-white/30 bg-white/40 backdrop-blur-md px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition-all focus:border-indigo-400 focus:bg-white/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:shadow-lg"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={adding || isFormEmpty}
                            aria-busy={adding}
                            className="inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        >
                            {adding ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Adding…
                                </>
                            ) : (
                                '+ Add'
                            )}
                        </button>
                    </div>
                </form>

                {/* List */}
                {bookmarks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </div>
                        <h3 className="mb-1 text-lg font-semibold text-slate-700">No bookmarks yet</h3>
                        <p className="text-sm text-slate-400">Add your first bookmark above to get started.</p>
                    </div>
                ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                        {bookmarks.map((bm) => (
                            <div
                                key={bm.id}
                                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
                            >
                                <div className="mb-2 flex items-start justify-between gap-3">
                                    <p className="text-sm font-semibold text-slate-800 line-clamp-1">{bm.title}</p>
                                    <button
                                        onClick={() => deleteBookmark(bm.id)}
                                        aria-label={`Delete ${bm.title}`}
                                        className="shrink-0 cursor-pointer rounded-md p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                <a
                                    href={bm.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-indigo-500 transition-colors hover:text-indigo-700 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-500/20 rounded-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    <span className="truncate">{bm.url}</span>
                                </a>
                                <p className="mt-2 text-[11px] text-slate-400">
                                    {new Date(bm.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Toasts */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    )
}

