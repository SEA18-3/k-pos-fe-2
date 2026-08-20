import * as React from "react"

import { cn } from "@/shared/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("rounded-lg border bg-card text-card-foreground", className)} {...props} />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center justify-between border-b px-4 py-3", className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-sm font-semibold", className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center border-t px-4 py-3", className)} {...props} />
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
