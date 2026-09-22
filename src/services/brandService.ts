import api from './api'

export const brandService = {
  uploadLogo: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('logo', file)
    const response = await api.post<{ logoUrl: string }>('/brand/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.logoUrl
  },

  uploadReferenceImage: async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('image', file)
    const response = await api.post<{ imageUrl: string }>('/brand/upload-reference-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.imageUrl
  },

  removeReferenceImage: async (imageUrl: string): Promise<void> => {
    await api.delete('/brand/reference-image', { data: { imageUrl } })
  },

  saveImageScripts: async (imageScripts: {
    feed?: string
    story?: string
    carousel?: string
    reel?: string
  }): Promise<void> => {
    await api.patch('/brand/image-scripts', { imageScripts })
  },

  getDefaultImageScripts: async (): Promise<{
    feed: string
    story: string
    carousel: string
    reel: string
  }> => {
    const response = await api.get<{ scripts: { feed: string; story: string; carousel: string; reel: string } }>('/brand/image-scripts/defaults')
    return response.data.scripts
  },
}
