'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

interface GalleryProps {
  images: string[]
  folder: string
}

export function Gallery({ images, folder }: GalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!isHovered) {
      const interval = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % images.length)
      }, 3000) // Change image every 3 seconds

      return () => clearInterval(interval)
    }
  }, [isHovered, images.length])

  return (
    <div
      className="my-8 space-y-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main featured image */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
        <Image
          src={`/images/${folder}/${images[activeIndex]}`}
          alt={`Gallery image ${activeIndex + 1}`}
          fill
          className="object-cover transition-opacity duration-500"
          sizes="(max-width: 768px) 100vw, 800px"
          priority
        />
      </div>

      {/* Thumbnail strip */}
      <div className="grid grid-cols-4 gap-3">
        {images.map((image, index) => (
          <div
            key={index}
            className={`relative aspect-square cursor-pointer overflow-hidden rounded-lg transition-all duration-300 ${
              index === activeIndex
                ? 'ring-2 ring-blue-600 dark:ring-blue-400 scale-105'
                : 'opacity-60 hover:opacity-100'
            }`}
            onClick={() => setActiveIndex(index)}
          >
            <Image
              src={`/images/${folder}/${image}`}
              alt={`Thumbnail ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 25vw, 200px"
            />
          </div>
        ))}
      </div>
    </div>
  )
}
