import axiosClient from './axiosClient'

export const electionApi = {
  getAll: () => axiosClient.get('/elections'),
  getById: (id) => axiosClient.get(`/elections/${id}`),
  getStats: () => axiosClient.get('/elections/stats'),
  create: (data) => axiosClient.post('/elections', data),
  updateStatus: (id, data) => axiosClient.put(`/elections/${id}/status`, typeof data === 'string' ? { status: data } : data),
  delete: (id) => axiosClient.delete(`/elections/${id}`),
  addCandidate: (electionId, data) => axiosClient.post(`/elections/${electionId}/candidates`, data),
}
