import { cn } from "@/lib/utils"
import { type TextareaHTMLAttributes, forwardRef } from "react"

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helper?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helper, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
        <textarea
          className={cn(
            "flex min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-base",
            "placeholder:text-slate-400 focus:border-primary focus:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
            "resize-vertical",
            error && "border-red-500 focus:border-red-500",
            className,
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helper && !error && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
      </div>
    )
  },
)

Textarea.displayName = "Textarea"

export { Textarea }
