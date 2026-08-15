'use client'

import { Component, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  onRetry?: () => void
}

type State = {
  hasError: boolean
  error: Error | null
}

export class GameErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[GameEngine] Crash:', error, info.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    this.props.onRetry?.()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-black px-6 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-red-500/40 bg-red-500/10">
            <svg className="size-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <p className="font-mono text-lg font-bold text-red-400">OYUN HATASI</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              3D motor beklenmeyen bir hatayla karşılaştı.
            </p>
          </div>
          {this.state.error && (
            <details className="w-full max-w-sm rounded-lg border border-border bg-card/60 p-3">
              <summary className="cursor-pointer font-mono text-[0.65rem] text-muted-foreground">
                Hata detayı
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[0.6rem] text-red-300/80">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="rounded-xl bg-primary px-5 py-2.5 font-mono text-xs font-bold tracking-wider text-primary-foreground border-glow-purple active:scale-95"
            >
              TEKRAR DENE
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl border border-border bg-card/60 px-5 py-2.5 font-mono text-xs font-bold tracking-wider text-muted-foreground active:scale-95"
            >
              SAYFAYI YENİLE
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
