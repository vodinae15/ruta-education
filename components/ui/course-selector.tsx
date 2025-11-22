"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BookOpenIcon, ChevronDownIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

interface Course {
  id: string
  title: string
}

interface CourseSelectorProps {
  courses: Course[]
  selectedCourseId: string | null
  onCourseChange: (courseId: string | null) => void
  className?: string
}

export function CourseSelector({ courses, selectedCourseId, onCourseChange, className }: CourseSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedCourse = courses.find(c => c.id === selectedCourseId) || null

  const handleSelect = (courseId: string | null) => {
    onCourseChange(courseId)
    setIsOpen(false)
  }

  // Закрываем при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.course-selector')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={cn("relative course-selector", className)}>
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between h-12 px-4"
      >
        <div className="flex items-center gap-2">
          <BookOpenIcon className="w-4 h-4" />
          <span className="font-medium">
            {selectedCourse ? selectedCourse.title : "Все курсы"}
          </span>
        </div>
        <ChevronDownIcon className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-64 overflow-y-auto border-2">
          <CardContent className="p-2">
            <div className="space-y-1">
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg transition-colors",
                  "hover:bg-light-blue/50",
                  !selectedCourseId && "bg-light-blue text-[#5589a7] font-medium"
                )}
              >
                <div className="flex items-center gap-2">
                  <BookOpenIcon className="w-4 h-4" />
                  <span>Все курсы</span>
                </div>
              </button>
              
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => handleSelect(course.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg transition-colors",
                    "hover:bg-light-blue/50",
                    selectedCourseId === course.id && "bg-light-blue text-[#5589a7] font-medium"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <BookOpenIcon className="w-4 h-4" />
                    <span className="truncate">{course.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

