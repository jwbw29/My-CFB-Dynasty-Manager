import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

const PlayerAwardsPage = dynamic(() => import('@/components/PlayerAwardsPage'), {
  loading: () => <LoadingSpinner fullPage />,
})

export default function AwardsPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <PlayerAwardsPage />
    </Suspense>
  )
}