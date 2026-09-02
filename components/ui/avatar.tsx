import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  fallback?: string
}

function Avatar({ src, alt, fallback, className, ...props }: AvatarProps) {
  const [hasError, setHasError] = React.useState(false)

  return (
    <div
      className={cn(
        "relative flex size-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted items-center justify-center text-xs font-semibold text-muted-foreground",
        className
      )}
      {...props}
    >
      {src && !hasError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt || "Avatar"}
          className="aspect-square size-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="select-none uppercase tracking-wider">{fallback || "U"}</span>
      )}
    </div>
  )
}

export { Avatar }
