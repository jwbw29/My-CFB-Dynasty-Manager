import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const TeamStats = dynamic(() => import('@/components/TeamStats'), {
  loading: () => <LoadingSpinner fullPage />,
})

export default function TeamStatsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <TeamStats />
    </Suspense>
  )
}