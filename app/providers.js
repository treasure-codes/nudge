'use client'
import { JourneyProvider } from '@/context/JourneyContext'

export function Providers({ children }) {
  return <JourneyProvider>{children}</JourneyProvider>
}
