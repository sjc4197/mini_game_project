import { useSyncExternalStore } from 'react'
import { metrics, type Metrics } from '@/app/metrics'

export const useMetrics = (): Metrics =>
  useSyncExternalStore(metrics.subscribe, metrics.get, metrics.get)
