import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { ScanResult } from './types'

export function useScans() {
  return useQuery({
    queryKey: ['scans'],
    queryFn: () => api.get<ScanResult[]>('/scans'),
  })
}

export function useScan(id: string | undefined) {
  return useQuery({
    queryKey: ['scan', id],
    queryFn: () => api.get<ScanResult>(`/scans/${id}`),
    enabled: !!id,
  })
}

export function useRunScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (repoUrl: string) => api.post<ScanResult>('/scans', { repo_url: repoUrl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scans'] }),
  })
}

export function useDeleteScan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del(`/scans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scans'] }),
  })
}
