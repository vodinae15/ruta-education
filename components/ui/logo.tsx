import Image from "next/image"

interface LogoProps {
  className?: string
  size?: "sm" | "md" | "lg" | "header"
}

export function Logo({ className = "", size = "lg" }: LogoProps) {
  // Фиксированные размеры для предотвращения сдвигов при загрузке
  const sizeConfig = {
    sm: { height: 32, width: 80, className: "h-8" },
    md: { height: 48, width: 120, className: "h-12" },
    lg: { height: 144, width: 360, className: "h-36" },
    header: { height: 40, width: 100, className: "h-10" }
  }

  const config = sizeConfig[size]

  return (
    <div className={`flex items-center gap-3 ${className}`} style={{ minHeight: config.height }}>
      <Image
        src="/images/ruta-logo-compact.png"
        alt="Ruta.education"
        width={config.width}
        height={config.height}
        className={`${config.className} w-auto`}
        priority
      />
    </div>
  )
}
