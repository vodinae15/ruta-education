import Image from "next/image"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function Logo({ className = "", size = "lg" }: LogoProps) {
  const sizeClasses = {
    sm: "h-8",
    md: "h-12",
    lg: "h-36"
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/images/ruta-logo-compact.png"
        alt="Ruta.education"
        width={360}
        height={144}
        className={`${sizeClasses[size]} w-auto`}
        priority
      />
    </div>
  )
}
