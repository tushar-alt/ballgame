import { Database, Terminal } from 'lucide-react'

export function SetupNotice() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md glass-strong rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary border-glow-purple">
            <Database className="size-5" />
          </div>
          <h1 className="font-mono text-sm font-bold tracking-[0.15em] text-foreground">
            SETUP REQUIRED
          </h1>
        </div>
        <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">
          Cizre Paintball requires a Supabase connection. Add these variables to your project settings:
        </p>
        <ul className="mb-4 space-y-2">
          <li className="glass rounded-lg px-3 py-2 font-mono text-[10px] text-accent tracking-wider">
            NEXT_PUBLIC_SUPABASE_URL
          </li>
          <li className="glass rounded-lg px-3 py-2 font-mono text-[10px] text-accent tracking-wider">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </li>
        </ul>
        <div className="flex items-start gap-2 rounded-lg border border-accent/15 bg-accent/5 px-3 py-2.5">
          <Terminal className="mt-0.5 size-3.5 shrink-0 text-accent" />
          <span className="text-[10px] text-muted-foreground">
            Then run <span className="text-foreground font-medium">scripts/001_init_schema.sql</span> in the Supabase SQL editor.
          </span>
        </div>
      </div>
    </div>
  )
}
