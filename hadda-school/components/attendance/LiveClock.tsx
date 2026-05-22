'use client'

import { useEffect, useState } from 'react'

export default function LiveClock({ lateThreshold }: { lateThreshold: string }) {
  const [time, setTime] = useState('')
  const [isLate, setIsLate] = useState(false)

  useEffect(() => {
    function tick() {
      const now = new Date()
      const hh = now.getHours().toString().padStart(2, '0')
      const mm = now.getMinutes().toString().padStart(2, '0')
      const ss = now.getSeconds().toString().padStart(2, '0')
      setTime(`${hh}:${mm}:${ss}`)

      const [th, tm] = lateThreshold.split(':').map(Number)
      setIsLate(now.getHours() > th || (now.getHours() === th && now.getMinutes() > tm))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lateThreshold])

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-semibold ${isLate ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
      <span className={`w-2 h-2 rounded-full animate-pulse ${isLate ? 'bg-red-500' : 'bg-green-500'}`} />
      {time || '--:--:--'}
      <span className="text-xs font-normal ml-1 font-sans">
        {isLate ? `Late (after ${lateThreshold})` : `On time (before ${lateThreshold})`}
      </span>
    </div>
  )
}
