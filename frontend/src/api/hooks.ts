import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import type {
  CalculateResult,
  Factor,
  Journal,
  JournalListItem,
  Order,
  OrderLink,
  OrderListResponse,
  PnlSummary,
  PositionType,
  Preset,
  Tag,
} from './types'

// ---- Tags ----

export function useTags() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await apiClient.get<Tag[]>('/api/tags')).data,
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { name: string; color?: string }) =>
      (await apiClient.post<Tag>('/api/tags', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  })
}

// ---- Journals ----

export interface JournalFilters {
  date_from?: string
  date_to?: string
  tag_id?: number[]
  search?: string
}

export function useJournals(filters: JournalFilters) {
  return useQuery({
    queryKey: ['journals', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.date_from) params.set('date_from', filters.date_from)
      if (filters.date_to) params.set('date_to', filters.date_to)
      if (filters.search) params.set('search', filters.search)
      filters.tag_id?.forEach((id) => params.append('tag_id', String(id)))
      return (await apiClient.get<JournalListItem[]>(`/api/journals?${params.toString()}`)).data
    },
  })
}

export function useJournal(id: number | undefined) {
  return useQuery({
    queryKey: ['journal', id],
    queryFn: async () => (await apiClient.get<Journal>(`/api/journals/${id}`)).data,
    enabled: id !== undefined,
  })
}

export function useCreateJournal() {
  const qc = useQueryClient()
  return useMutation({
    // The backend treats this as "create or get": posting a date that already
    // has a journal just returns the existing one instead of erroring.
    mutationFn: async (payload: { date: string; notes?: string }) =>
      (await apiClient.post<Journal>('/api/journals', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journals'] }),
  })
}

export function useUpdateJournal(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { date?: string; notes?: string }) =>
      (await apiClient.patch<Journal>(`/api/journals/${id}`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal', id] })
      qc.invalidateQueries({ queryKey: ['journals'] })
    },
  })
}

export function useDeleteJournal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/api/journals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journals'] }),
  })
}

// ---- Orders ----

function invalidateOrderRelated(qc: ReturnType<typeof useQueryClient>, journalId: number) {
  qc.invalidateQueries({ queryKey: ['journal', journalId] })
  qc.invalidateQueries({ queryKey: ['journals'] })
  qc.invalidateQueries({ queryKey: ['orders'] })
}

export function useCreateOrder(journalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      ticker: string
      price: number
      quantity: number
      direction: 'buy' | 'sell'
      position_type: PositionType
      status?: 'pending' | 'filled'
      note?: string
      tag_ids?: number[]
    }) => (await apiClient.post<Order>(`/api/journals/${journalId}/orders`, payload)).data,
    onSuccess: () => invalidateOrderRelated(qc, journalId),
  })
}

export function useUpdateOrder(journalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      orderId,
      ...payload
    }: { orderId: number; tag_ids?: number[] } & Partial<Omit<Order, 'tags' | 'id' | 'journal_id'>>) =>
      (await apiClient.patch<Order>(`/api/orders/${orderId}`, payload)).data,
    onSuccess: () => invalidateOrderRelated(qc, journalId),
  })
}

export function useDeleteOrder(journalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderId: number) => apiClient.delete(`/api/orders/${orderId}`),
    onSuccess: () => invalidateOrderRelated(qc, journalId),
  })
}

export function useOrders(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['orders', page, pageSize],
    queryFn: async () =>
      (
        await apiClient.get<OrderListResponse>('/api/orders', {
          params: { page, page_size: pageSize },
        })
      ).data,
  })
}

export function useLinkableOrders(ticker: string | undefined, excludeOrderId: number | undefined) {
  return useQuery({
    queryKey: ['linkable-orders', ticker, excludeOrderId],
    queryFn: async () =>
      (
        await apiClient.get<Order[]>('/api/orders/linkable', {
          params: { ticker, exclude_order_id: excludeOrderId },
        })
      ).data,
    enabled: !!ticker,
  })
}

export function useCreateLink(journalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      fromOrderId,
      toOrderId,
      quantity,
    }: {
      fromOrderId: number
      toOrderId: number
      quantity: number
    }) =>
      (
        await apiClient.post<OrderLink>(`/api/orders/${fromOrderId}/links`, {
          to_order_id: toOrderId,
          quantity,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal', journalId] })
      qc.invalidateQueries({ queryKey: ['linkable-orders'] })
      qc.invalidateQueries({ queryKey: ['pnl'] })
    },
  })
}

export function useDeleteLink(journalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (linkId: number) => apiClient.delete(`/api/orders/links/${linkId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal', journalId] })
      qc.invalidateQueries({ queryKey: ['pnl'] })
    },
  })
}

// ---- Images ----

export function useUploadJournalImage(journalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return (await apiClient.post(`/api/journals/${journalId}/images`, form)).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal', journalId] }),
  })
}

export function useUploadOrderImage(journalId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ orderId, file }: { orderId: number; file: File }) => {
      const form = new FormData()
      form.append('file', file)
      return (await apiClient.post(`/api/orders/${orderId}/images`, form)).data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal', journalId] }),
  })
}

export function imageUrl(kind: 'journal' | 'order', imageId: number): string {
  const base = (import.meta as { env: { VITE_API_BASE_URL?: string } }).env.VITE_API_BASE_URL || 'http://localhost:8000'
  return `${base}/api/${kind}-images/${imageId}/raw`
}

// ---- P&L ----

export function usePnl() {
  return useQuery({
    queryKey: ['pnl'],
    queryFn: async () => (await apiClient.get<PnlSummary>('/api/pnl')).data,
  })
}

// ---- Entry Quality Calculator ----

export function usePresets() {
  return useQuery({
    queryKey: ['presets'],
    queryFn: async () => (await apiClient.get<Preset[]>('/api/calculator/presets')).data,
    staleTime: Infinity, // static catalog, no need to refetch
  })
}

export function useFactors() {
  return useQuery({
    queryKey: ['factors'],
    queryFn: async () => (await apiClient.get<Factor[]>('/api/calculator/factors')).data,
  })
}

export function useCreateFactor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { preset_key: string; weight?: number }) =>
      (await apiClient.post<Factor>('/api/calculator/factors', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['factors'] }),
  })
}

export function useUpdateFactor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: { id: number; weight?: number; sort_order?: number }) =>
      (await apiClient.patch<Factor>(`/api/calculator/factors/${id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['factors'] }),
  })
}

export function useDeleteFactor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => apiClient.delete(`/api/calculator/factors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['factors'] }),
  })
}

export function useCalculate() {
  return useMutation({
    mutationFn: async (values: Record<number, number>) =>
      (await apiClient.post<CalculateResult>('/api/calculator/calculate', { values })).data,
  })
}
