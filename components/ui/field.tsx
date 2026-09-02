import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Field = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  )
)
Field.displayName = "Field"

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label ref={ref} className={cn("block", className)} {...props} />
))
FieldLabel.displayName = "FieldLabel"

const FieldDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
)
FieldDescription.displayName = "FieldDescription"

interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  errors?: { message?: string }[]
}

const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, errors, ...props }, ref) => {
    if (!errors?.length) return null
    return (
      <p ref={ref} className={cn("text-sm font-medium text-destructive", className)} {...props}>
        {errors[0]?.message}
      </p>
    )
  }
)
FieldError.displayName = "FieldError"

export { Field, FieldLabel, FieldDescription, FieldError }
