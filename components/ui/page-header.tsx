import type React from "react"
import { Breadcrumbs, type BreadcrumbItem } from "./breadcrumbs"

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, breadcrumbs, actions, className = "" }: PageHeaderProps) {
  return (
    <div className={`bg-white border-b border-light-gray ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className="mb-4" />}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{title}</h1>
            {description && <p className="mt-2 text-lg text-slate-600">{description}</p>}
          </div>

          {actions && <div className="flex items-center space-x-3">{actions}</div>}
        </div>
      </div>
    </div>
  )
}
