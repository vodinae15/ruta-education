import { cn } from "@/lib/utils"
import { type InputHTMLAttributes, forwardRef, type ReactNode } from "react"

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
  icon?: ReactNode // Adding icon support
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helper, icon, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}
        <div className="relative">
          {icon && <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">{icon}</div>}
          <input
            type={type}
            className={cn(
              "flex h-12 w-full rounded-lg border border-slate-200 bg-white py-2 text-base",
              "placeholder:text-slate-400 focus:border-primary focus:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",
              error && "border-red-500 focus:border-red-500",
              icon ? "pl-10 pr-4" : "px-4", // Adjust padding based on icon presence
              className,
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helper && !error && <p className="mt-1 text-sm text-slate-500">{helper}</p>}
      </div>
    )
  },
)

Input.displayName = "Input"

export { Input }
