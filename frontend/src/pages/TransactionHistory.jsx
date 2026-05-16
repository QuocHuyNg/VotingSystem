import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import { voteApi } from '../api/voteApi'
import { ExternalLink, Search, Hash, Clock, CheckCircle, XCircle, Copy, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

const ETHERSCAN_TX_URL = import.meta.env.VITE_ETHERSCAN_TX_URL || 'https://sepolia.etherscan.io/tx'

function truncate(str, start = 8, end = 6) {
  if (!str) return '—'
  if (str.length <= start + end) return str
  return `${str.slice(0, start)}...${str.slice(-end)}`
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
  toast.success('Đã sao chép!')
}

function TimeAgo({ ts }) {
  if (!ts) return <span>—</span>
  const date = new Date(ts)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return <span>{diff} giây trước</span>
  if (diff < 3600) return <span>{Math.floor(diff / 60)} phút trước</span>
  if (diff < 86400) return <span>{Math.floor(diff / 3600)} giờ trước</span>
  return <span>{date.toLocaleDateString('vi-VN')}</span>
}

export default function TransactionHistory() {
  const { user } = useAuth()
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    voteApi.getMyReceipts()
      .then(res => setReceipts(res.data.receipts || []))
      .catch(err => {
        console.error(err)
        setError('Không thể tải lịch sử giao dịch')
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = receipts.filter(r => {
    const q = search.toLowerCase()
    return (
      r.tx_hash?.toLowerCase().includes(q) ||
      r.vote_hash?.toLowerCase().includes(q) ||
      String(r.election_id).includes(q)
    )
  })

  return (
    <Layout>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Header */}
        <div className="page-header">
          <h1 className="page-title">Lịch Sử Giao Dịch</h1>
          <p className="page-subtitle">
            Các phiếu bầu của <strong>{user?.username}</strong> đã được ghi lên Sepolia Testnet
          </p>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 40 }}
            placeholder="Tìm theo Tx Hash, Vote Hash, Election ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <div className="spinner spinner-lg" />
          </div>
        ) : error ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <XCircle size={40} color="var(--danger)" style={{ marginBottom: 12 }} />
            <p style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '56px 24px' }}>
            <FileText size={48} color="var(--text-muted)" style={{ marginBottom: 16, opacity: 0.5 }} />
            <h3 style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
              {search ? 'Không tìm thấy giao dịch nào' : 'Chưa có giao dịch nào'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {search ? 'Thử từ khóa khác.' : 'Khi bạn bỏ phiếu, transaction hash sẽ xuất hiện ở đây.'}
            </p>
          </div>
        ) : (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
              {filtered.length} giao dịch
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((r) => (
                <div key={r.id} className="card" style={{ padding: '18px 20px' }}>
                  {/* Row 1: Status + Election ID + Time */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <CheckCircle size={16} color="var(--success)" />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      Đã bỏ phiếu — Cuộc bầu cử #{r.election_id}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={12} />
                      <TimeAgo ts={r.voted_at} />
                    </span>
                  </div>

                  {/* Row 2: Hashes */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Tx Hash */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', width: 110, flexShrink: 0 }}>
                        Transaction Hash
                      </span>
                      <span className="hash-display" style={{ flex: 1, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.tx_hash}
                      </span>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button className="btn btn-icon btn-secondary" title="Sao chép" onClick={() => copyToClipboard(r.tx_hash)}>
                          <Copy size={13} />
                        </button>
                        <a
                          className="btn btn-icon btn-secondary"
                          href={`${ETHERSCAN_TX_URL}/${r.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Xem trên Sepolia Etherscan"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                    </div>

                    {/* Vote Hash */}
                    {r.vote_hash && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', width: 110, flexShrink: 0 }}>
                          Vote Hash (ẩn danh)
                        </span>
                        <span className="hash-display" style={{ flex: 1, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.vote_hash}
                        </span>
                        <button className="btn btn-icon btn-secondary" title="Sao chép" onClick={() => copyToClipboard(r.vote_hash)}>
                          <Copy size={13} />
                        </button>
                      </div>
                    )}

                    {/* Block Number */}
                    {r.block_number && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', width: 110, flexShrink: 0 }}>
                          Block Number
                        </span>
                        <a
                          href={`https://sepolia.etherscan.io/block/${r.block_number}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          #{r.block_number} <ExternalLink size={11} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
