import api from './api'

export const uploadService = {
  uploadReferenceImage: (file: File) => {
    const form = new FormData()
    form.append('image', file)
    // Do NOT set Content-Type manually — axios must set it automatically so it
    // includes the multipart boundary. Explicitly deleting it overrides the
    // instance-level 'application/json' default that would otherwise corrupt
    // the multipart request.
    return api.post<{ url: string }>('/uploads/reference-image', form, {
      headers: { 'Content-Type': undefined },
    })
  },
}
