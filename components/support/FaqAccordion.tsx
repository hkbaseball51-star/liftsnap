'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { type FaqCategory } from '@/data/faq'

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <button
        className="w-full flex items-start gap-3 px-4 py-4 text-left active:opacity-70 transition-opacity"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
      >
        <span
          className="text-[10px] font-black shrink-0 mt-0.5 w-4 text-center"
          style={{ color: '#ED742F' }}
        >
          Q
        </span>
        <span className="flex-1 text-sm font-bold leading-snug" style={{ color: '#f5f5f5' }}>
          {q}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'rgba(255,255,255,0.32)',
            flexShrink: 0,
            marginTop: 2,
            transition: 'transform 200ms',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div className="flex items-start gap-3 px-4 pb-4">
          <span
            className="text-[10px] font-black shrink-0 mt-0.5 w-4 text-center"
            style={{ color: 'rgba(255,255,255,0.38)' }}
          >
            A
          </span>
          <p className="flex-1 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.62)' }}>
            {a}
          </p>
        </div>
      )}
    </div>
  )
}

export default function FaqAccordion({ categories }: { categories: FaqCategory[] }) {
  return (
    <div className="flex flex-col gap-6">
      {categories.map(cat => (
        <section key={cat.id}>
          <p
            className="text-[10px] font-black tracking-widest mb-2 px-1"
            style={{ color: 'rgba(255,255,255,0.42)' }}
          >
            {cat.title}
          </p>
          <div
            style={{
              background: '#1D1D1D',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {cat.items.map((item, i) => (
              <div key={i} style={i === cat.items.length - 1 ? { borderBottom: 'none' } : {}}>
                <FaqItem q={item.q} a={item.a} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
