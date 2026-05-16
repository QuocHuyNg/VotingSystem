import axiosClient from './axiosClient'

export const voteApi = {
  record: (data) => axiosClient.post('/votes/record', data),
  getStatus: (electionId, wallet) => axiosClient.get(`/votes/status/${electionId}?wallet=${wallet}`),
  verify: (txHash) => axiosClient.get(`/votes/verify/${txHash}`),
  getResults: (electionId) => axiosClient.get(`/votes/results/${electionId}`),
  // Lịch sử phiếu bầu của user đang đăng nhập (theo wallet_address)
  getMyReceipts: () => axiosClient.get('/votes/my-receipts'),
}
