'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

const slides = [
  { src: '/slide-1.jpg', alt: 'Students in class' },
  { src: '/slide-2.jpg', alt: 'Students in class' },
  { src: '/slide-3.jpg', alt: 'Students in class' },
  { src: '/slide-4.jpg', alt: 'Students in class' },
  { src: '/slide-5.jpg', alt: 'Students in class' },
  { src: '/slide-6.jpg', alt: 'Students in class' },
  { src: '/slide-7.jpg', alt: 'Students in class' },
  { src: '/slide-8.jpg', alt: 'Students in class' },
  { src: '/slide-9.jpg', alt: 'Students in class' },
]

export default function HeroSlider() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="absolute inset-0 z-0">
      {slides.map((slide, i) => (
        <div
          key={slide.src}
          className="absolute inset-0 transition-opacity duration-1000"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <Image
            src={slide.src}
            alt={slide.alt}
            fill
            sizes="100vw"
            quality={95}
            className="object-cover"
            priority={i === 0}
          />
        </div>
      ))}


      {/* Navigation dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: i === current ? '24px' : '8px',
              backgroundColor: i === current ? 'white' : 'rgba(255,255,255,0.45)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
