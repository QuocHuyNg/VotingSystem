import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { electionApi } from '../api/electionApi'
import { voteApi } from '../api/voteApi'
import { useWeb3 } from '../context/Web3Context'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Vote, CheckCircle, Wallet, AlertTriangle, Copy, ExternalLink } from 'lucide-react'

const ETHERSCAN_TX_URL = import.meta.env.VITE_ETHERSCAN_TX_URL || 'https://sepolia.etherscan.io/tx'

export default function VotePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { account, contract, connectWallet, isCorrectNetwork, switchToSepoliaNetwork } = useWeb3()
  const { user } = useAuth()

  const [election, setElection] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [alreadyVoted, setAlreadyVoted] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [isAuthorized, setIsAuthorized] = useState(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    electionApi.getById(id).then(r => {
      setElection(r.data.election)
      setCandidates(r.data.candidates || [])
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!account || !contract || !id) return
    const check = async () => {
      try {
        const [voted, authorized] = await Promise.all([
          contract.hasVoterVoted(BigInt(id), account),
          contract.isVoterAuthorized(BigInt(id), account),
        ])
        setAlreadyVoted(voted)
        setIsAuthorized(authorized)
        if (voted) {
          const hash = await contract.getVoteReceipt(BigInt(id), account)
          setReceipt(hash)
        }
      } catch {}
    }
    check()
  }, [account, contract, id])

  const handleVote = async () => {
    if (!selected) return toast.error('Chọn ứng viên trước')
    if (!contract) return toast.error('Kết nối MetaMask trước')
    if (!isCorrectNetwork) return toast.error('Sai mạng! Vui lòng chuyển sang Sepolia Testnet')
    setSubmitting(true)
    try {
      const candidateOnChainId = candidates.find(c => c.id === selected)?.on_chain_id
      const tx = await contract.castVote(BigInt(id), BigInt(candidateOnChainId))
      toast.loading('Đang ghi phiếu bầu lên blockchain...', { id: 'vote' })
      const rec = await tx.wait()
      const event = rec.logs.find(l => l.fragment?.name === 'VoteCast')
      const voteHash = event?.args?.[2]

      await voteApi.record({
        election_id: Number(id), voter_wallet: account,
        tx_hash: rec.hash, vote_hash: voteHash, block_number: rec.blockNumber
      })

      toast.success('Bỏ phiếu thành công!', { id: 'vote' })
      setSuccess({ txHash: rec.hash, voteHash, blockNumber: rec.blockNumber })
      setAlreadyVoted(true)
    } catch (err) {
      if (err.code === 4001) toast.error('Giao dịch bị hủy', { id: 'vote' })
      else toast.error(err.reason || err.message || 'Lỗi khi bỏ phiếu', { id: 'vote' })
    } finally {
      setSubmitting(false)
      setShowConfirm(false)
    }
  }

  if (loading) return <Layout><div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><div className="spinner spinner-lg" /></div></Layout>

  // Success screen
  if (success) return (
    <Layout>
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center', paddingTop: 40 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(46,213,115,0.15)', border: '2px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'glow 2s ease infinite' }}>
          <CheckCircle size={40} color="var(--success)" />
        </div>
        <h2 style={{ marginBottom: 8, color: 'var(--success)' }}>Bỏ Phiếu Thành Công!</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Phiếu bầu của bạn đã được ghi lên blockchain</p>
        <div className="card" style={{ textAlign: 'left', marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[['Transaction Hash', success.txHash], ['Vote Hash (Ẩn danh)', success.voteHash], ['Block Number', '#' + success.blockNumber]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="hash-display" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
                  <button className="btn btn-icon btn-secondary" onClick={() => { navigator.clipboard.writeText(val); toast.success('Đã sao chép!') }}>
                    <Copy size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/elections/${id}/results`)}>Xem Kết Quả</button>
          <button className="btn btn-primary" onClick={() => navigate('/verify')}>Tra Cứu Phiếu</button>
          <a className="btn btn-secondary" href={`${ETHERSCAN_TX_URL}/${success.txHash}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} /> Etherscan
          </a>
        </div>
      </div>
    </Layout>
  )

  const selectedCandidate = candidates.find(c => c.id === selected)

  return (
    <Layout>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="page-header">
          <h1 className="page-title">{election?.name}</h1>
          <p className="page-subtitle">{election?.description}</p>
        </div>

        {/* Warnings */}
        {!account && (
          <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(108,99,255,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Wallet size={20} color="var(--primary)" />
              <div style={{ flex: 1 }}>Kết nối MetaMask để bỏ phiếu</div>
              <button className="btn btn-primary btn-sm" onClick={connectWallet}>Kết nối</button>
            </div>
          </div>
        )}
        {account && !isCorrectNetwork && (
          <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(255,165,2,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <AlertTriangle size={20} color="var(--warning)" />
              <div style={{ flex: 1, fontSize: '0.9rem' }}>Sai mạng! Vui lòng chuyển sang <strong>Sepolia Testnet</strong> để bỏ phiếu</div>
              <button className="btn btn-sm btn-secondary" onClick={switchToSepoliaNetwork}>Chuyển sang Sepolia</button>
            </div>
          </div>
        )}
        {account && isAuthorized === false && (
          <div className="card" style={{ marginBottom: 16, borderColor: 'rgba(255,71,87,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={18} color="var(--danger)" />
              <span style={{ fontSize: '0.9rem' }}>Địa chỉ ví của bạn chưa được cấp quyền bỏ phiếu trong cuộc bầu cử này.</span>
            </div>
          </div>
        )}
        {alreadyVoted && (
          <div className="card" style={{ marginBottom: 16, background: 'rgba(46,213,115,0.05)', borderColor: 'rgba(46,213,115,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: receipt ? 12 : 0 }}>
              <CheckCircle size={18} color="var(--success)" />
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>Bạn đã bỏ phiếu trong cuộc bầu cử này</span>
            </div>
            {receipt && <div className="hash-display" style={{ marginTop: 8 }}>Vote Hash: {receipt}</div>}
          </div>
        )}

        {/* Candidates */}
        {!alreadyVoted && (
          <>
            <h3 style={{ marginBottom: 16, color: 'var(--text-muted)', fontWeight: 500 }}>Chọn ứng viên của bạn</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              {candidates.map((c, i) => (
                <div key={c.id} onClick={() => setSelected(c.id)} style={{
                  padding: '18px 20px', borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${selected === c.id ? 'var(--primary)' : 'var(--border)'}`,
                  background: selected === c.id ? 'var(--primary-light)' : 'var(--surface)',
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 16,
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                    background: selected === c.id ? 'var(--primary)' : 'var(--surface-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '1.1rem', color: selected === c.id ? '#fff' : 'var(--text-muted)',
                  }}>{i + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{c.name}</div>
                    {c.description && <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.description}</div>}
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${selected === c.id ? 'var(--primary)' : 'var(--border)'}`,
                    background: selected === c.id ? 'var(--primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected === c.id && <CheckCircle size={14} color="#fff" />}
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn-primary btn-lg btn-block" disabled={!selected || submitting || !account || isAuthorized === false || !isCorrectNetwork}
              onClick={() => setShowConfirm(true)}>
              <Vote size={18} /> Bỏ Phiếu
            </button>
          </>
        )}

        {/* Confirm Modal */}
        {showConfirm && (
          <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 420 }}>
              <h2 className="modal-title" style={{ marginBottom: 20 }}>Xác Nhận Bỏ Phiếu</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.9rem' }}>
                Hành động này không thể hoàn tác. Phiếu bầu sẽ được ghi vĩnh viễn lên blockchain.
              </p>
              <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Ứng viên đã chọn</div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedCandidate?.name}</div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowConfirm(false)} disabled={submitting}>Hủy</button>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleVote} disabled={submitting}>
                  {submitting ? <><div className="spinner" />Đang xử lý...</> : <><Vote size={16} />Xác Nhận</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
