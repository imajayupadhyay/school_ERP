import { api } from '@/lib/api'

export interface SearchResultItem {
  id: number
  label: string
  sublabel: string
  url: string
}

export interface SearchGroup {
  type: 'students' | 'employees' | 'guardians' | 'classes'
  label: string
  items: SearchResultItem[]
}

export interface SearchResponse {
  groups: SearchGroup[]
  total: number
}

export async function globalSearch(q: string): Promise<SearchResponse> {
  const { data } = await api.get<{ data: SearchResponse }>('/search', { params: { q } })
  return data.data
}
