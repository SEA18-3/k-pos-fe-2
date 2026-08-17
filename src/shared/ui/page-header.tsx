import type { ReactNode } from "react"

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-[-0.035em] sm:text-2xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-sm">
          {description}
        </p>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}
