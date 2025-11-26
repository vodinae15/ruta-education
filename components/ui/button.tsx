import { cn } from "@/lib/utils"
import { type ButtonHTMLAttributes, forwardRef, type ReactElement } from "react"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "text" | "success" | "warning" | "error" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, asChild, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"

    const variants = {
      primary: "bg-ruta-primary text-white hover:bg-[#5A8BAD] shadow-ruta-sm hover:shadow-ruta-md",
      secondary:
        "border-2 border-ruta-primary text-ruta-primary bg-transparent hover:bg-ruta-primary-light hover:text-ruta-primary",
      outline:
        "border-2 border-ruta-primary text-ruta-primary bg-transparent hover:bg-ruta-primary-light hover:text-ruta-primary",
      text: "text-ruta-primary hover:text-[#4A7A9A] hover:bg-ruta-primary-light/50",
      ghost: "text-ruta-primary hover:bg-ruta-primary-light/50 hover:text-ruta-primary",
      success: "bg-green-500 text-white hover:bg-green-600",
      warning: "bg-amber-500 text-white hover:bg-amber-600",
      error: "bg-red-500 text-white hover:bg-red-600",
    }

    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    }

    const buttonClasses = cn(baseStyles, variants[variant], sizes[size], loading && "cursor-wait", className)

    if (asChild && children) {
      const child = children as ReactElement
      return (
        <child.type
          {...child.props}
          className={cn(buttonClasses, child.props.className)}
          ref={ref}
        >
          {child.props.children}
        </child.type>
      )
    }

    return (
      <button
        className={buttonClasses}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}
        {children}
      </button>
    )
  },
)

Button.displayName = "Button"

export { Button }
