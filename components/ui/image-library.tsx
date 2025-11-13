"use client"

import React, { useState, useEffect } from "react"
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Input } from "./input"
import { Badge } from "./badge"
import { SearchIcon, DownloadIcon, UploadIcon, ExternalLinkIcon } from "./icons"

interface UnsplashImage {
  id: string
  urls: {
    small: string
    regular: string
    full: string
  }
  alt_description: string
  user: {
    name: string
    username: string
  }
  links: {
    download: string
    html: string
  }
}

interface ImageLibraryProps {
  onImageSelect: (imageUrl: string, imageData: UnsplashImage) => void
  onCustomUpload?: (file: File) => void
  className?: string
}

export function ImageLibrary({
  onImageSelect,
  onCustomUpload,
  className = ""
}: ImageLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [images, setImages] = useState<UnsplashImage[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [showCopyrightDisclaimer, setShowCopyrightDisclaimer] = useState(false)

  const categories = [
    { id: "business", name: "Бизнес", query: "business" },
    { id: "education", name: "Образование", query: "education" },
    { id: "technology", name: "Технологии", query: "technology" },
    { id: "nature", name: "Природа", query: "nature" },
    { id: "abstract", name: "Абстракция", query: "abstract" },
    { id: "people", name: "Люди", query: "people" },
  ]

  // Загружаем изображения при изменении поискового запроса или категории
  useEffect(() => {
    const query = selectedCategory || searchQuery || "education"
    if (query) {
      fetchImages(query)
    }
  }, [searchQuery, selectedCategory])

  const fetchImages = async (query: string) => {
    setLoading(true)
    try {
      // Используем Unsplash API (бесплатный, с ограничениями)
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`,
        {
          headers: {
            // В реальном приложении нужно добавить Access Key
            'Authorization': `Client-ID ${process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || 'demo'}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setImages(data.results || [])
      } else {
        // Fallback: используем демо-изображения
        setImages(getDemoImages())
      }
    } catch (error) {
      console.error('Ошибка загрузки изображений:', error)
      // Fallback: используем демо-изображения
      setImages(getDemoImages())
    } finally {
      setLoading(false)
    }
  }

  // Демо-изображения для случая, когда API недоступен
  const getDemoImages = (): UnsplashImage[] => [
    {
      id: "demo1",
      urls: {
        small: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400",
        regular: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800",
        full: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200"
      },
      alt_description: "Образование и обучение",
      user: { name: "Demo User", username: "demo" },
      links: { download: "#", html: "#" }
    },
    {
      id: "demo2",
      urls: {
        small: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400",
        regular: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800",
        full: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200"
      },
      alt_description: "Бизнес и технологии",
      user: { name: "Demo User", username: "demo" },
      links: { download: "#", html: "#" }
    }
  ]

  const handleImageSelect = (image: UnsplashImage) => {
    onImageSelect(image.urls.regular, image)
    setShowCopyrightDisclaimer(true)
  }

  const handleCustomUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && onCustomUpload) {
      onCustomUpload(file)
      setShowCopyrightDisclaimer(true)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Поиск и категории */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Библиотека изображений</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Поиск */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Поиск изображений..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Категории */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge
                key={category.id}
                variant={selectedCategory === category.query ? "default" : "info"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(
                  selectedCategory === category.query ? "" : category.query
                )}
              >
                {category.name}
              </Badge>
            ))}
          </div>

          {/* Загрузка собственного изображения */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleCustomUpload}
              className="hidden"
              id="custom-image-upload"
            />
            <label htmlFor="custom-image-upload" className="cursor-pointer">
              <UploadIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600">Загрузить собственное изображение</p>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Галерея изображений */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="aspect-video bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="group relative aspect-video rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500"
                  onClick={() => handleImageSelect(image)}
                >
                  <img
                    src={image.urls.small}
                    alt={image.alt_description}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                    <Button
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <DownloadIcon className="w-4 h-4 mr-2" />
                      Выбрать
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <p className="text-white text-xs truncate">
                      {image.user.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Дисклеймер об авторских правах */}
      {showCopyrightDisclaimer && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600">⚠️</div>
              <div className="text-sm">
                <p className="font-medium text-yellow-800 mb-2">
                  Важно: Авторские права на изображения
                </p>
                <p className="text-yellow-700 mb-2">
                  Все изображения из библиотеки предоставляются по лицензии Unsplash и могут использоваться бесплатно для любых целей, включая коммерческие.
                </p>
                <p className="text-yellow-700">
                  При загрузке собственных изображений убедитесь, что у вас есть права на их использование. 
                  Вы несете ответственность за соблюдение авторских прав.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
