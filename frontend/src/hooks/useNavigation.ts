import { useState } from 'react'
import type { PageId } from '@/types'

export function useNavigation(initial: PageId = 'dashboard') {
  const [currentPage, setCurrentPage] = useState<PageId>(initial)
  return { currentPage, navigate: setCurrentPage }
}
