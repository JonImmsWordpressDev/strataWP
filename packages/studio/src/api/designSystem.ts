import apiFetch from '@wordpress/api-fetch'
import type {
  DesignTokens,
  DesignPreset,
  DesignSystemResponse,
  SaveDesignSystemRequest,
  ApiResponse,
} from '../types'

const API_BASE = '/stratawp/v1'

export async function fetchDesignSystem(): Promise<DesignSystemResponse> {
  return apiFetch<DesignSystemResponse>({
    path: `${API_BASE}/design-system`,
    method: 'GET',
  })
}

export async function saveDesignSystem(
  request: SaveDesignSystemRequest
): Promise<ApiResponse<DesignSystemResponse>> {
  return apiFetch<ApiResponse<DesignSystemResponse>>({
    path: `${API_BASE}/design-system`,
    method: 'POST',
    data: request,
  })
}

export async function fetchPresets(): Promise<DesignPreset[]> {
  return apiFetch<DesignPreset[]>({
    path: `${API_BASE}/design-system/presets`,
    method: 'GET',
  })
}

export async function applyPreset(presetId: string): Promise<ApiResponse<DesignSystemResponse>> {
  return apiFetch<ApiResponse<DesignSystemResponse>>({
    path: `${API_BASE}/design-system/presets/${presetId}/apply`,
    method: 'POST',
  })
}

export async function exportDesignSystem(): Promise<Blob> {
  const response = await apiFetch<DesignTokens>({
    path: `${API_BASE}/design-system/export`,
    method: 'GET',
  })
  return new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' })
}

export async function importDesignSystem(
  file: File
): Promise<ApiResponse<DesignSystemResponse>> {
  const formData = new FormData()
  formData.append('file', file)

  return apiFetch<ApiResponse<DesignSystemResponse>>({
    path: `${API_BASE}/design-system/import`,
    method: 'POST',
    body: formData,
  })
}
