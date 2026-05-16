import axiosClient from './axiosClient'

export const userApi = {
  getAll: () => axiosClient.get('/users'),
  getElectionVoters: (electionId) => axiosClient.get(`/users/voters/${electionId}`),
  authorizeVoter: (electionId, data) => axiosClient.post(`/users/voters/${electionId}/authorize`, data),
  authorizeVotersBatch: (electionId, data) => axiosClient.post(`/users/voters/${electionId}/authorize-batch`, data),
  revokeVoter: (electionId, wallet) => axiosClient.delete(`/users/voters/${electionId}/${wallet}`),
}

export const blockchainApi = {
  getInfo: () => axiosClient.get('/blockchain/info'),
  getBlocks: (limit = 10) => axiosClient.get('/blockchain/blocks?limit=' + limit),
  getTransaction: (hash) => axiosClient.get('/blockchain/tx/' + hash),
  getActivity: () => axiosClient.get('/blockchain/activity'),
}
