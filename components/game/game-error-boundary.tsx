'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

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
        <div className="flex h-dvh w-full flex-col items-center justify-center gap-5 bg-background px-6 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl glass border border-destructive/20">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <div>
            <p className="font-mono text-sm font-bold tracking-[0.15em] text-foreground">ENGINE ERROR</p>
            <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">
              The 3D engine encountered an unexpected issue.
            </p>
          </div>
          {this.state.error && (
            <details className="w-full max-w-sm glass rounded-xl p-3">
              <summary className="cursor-pointer font-mono text-[9px] tracking-wider text-muted-foreground">
                Error details
              </summary>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[9px] text-destructive/70">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="rounded-xl bg-primary/90 px-6 py-3 font-mono text-[10px] font-bold tracking-[0.2em] text-primary-foreground active:scale-95 transition-transform"
            >
              RETRY
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl glass px-6 py-3 font-mono text-[10px] font-bold tracking-[0.2em] text-muted-foreground active:scale-95 transition-transform"
            >
              RELOAD
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
