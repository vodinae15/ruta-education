import Image from "next/image"

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/images/ruta-logo-compact.png"
        alt="Ruta.education"
        width={360}
        height={144}
        className="h-36 w-[90px]"
        priority
      />
    </div>
  )
}
