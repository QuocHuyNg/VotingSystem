import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { blockchainApi } from '../api/userApi'
import { voteApi } from '../api/voteApi'
import { Search, Blocks, CheckCircle, XCircle, Copy, ExternalLink, RefreshCw, Plus, Activity } from 'lucide-react'
import toast from 'react-hot-toast'

export default function BlockchainExplorer() {
  const [searchHash, setSearchHash] = useState('')
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [activity, setActivity] = useState([])
  const [nodeInfo, setNodeInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    Promise.all([blockchainApi.getActivity(), blockchainApi.getInfo()])
      .then(([a, i]) => { setActivity(a.data.activity || []); setNodeInfo(i.data.info) })
      .catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleVerify = async () => {
    if (!searchHash.trim()) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      const { data } = await voteApi.verify(searchHash.trim())
      setVerifyResult(data)
    } catch (err) {
      if (err.response?.status === 404) setVerifyResult({ success: false, message: 'Giao dịch không liên quan đến hệ thống bầu cử' })
      else toast.error('Lỗi kết nối')
    } finally { setVerifying(false) }
  }

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Đã sao chép!') }

  const activityIcon = (type) => ({
    election: <Plus size={16} color="var(--primary)" />,
    vote: <CheckCircle size={16} color="var(--success)" />,
  }[type])

  const activityLabel = (type) => ({
    election: 'Tạo Bầu Cử',
    vote: 'Bỏ Phiếu',
  }[type])

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title">Blockchain Explorer</h1>
        <p className="page-subtitle">Theo dõi các giao dịch thời gian thực trên Sepolia Testnet</p>
      </div>

      {/* Search Section */}
      <div className="card" style={{ marginBottom: 28 }}>
        <h3 style={{ marginBottom: 16 }}><Search size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />Tra Cứu Giao Dịch Hệ Thống</h3>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input className="input" style={{ flex: 1 }} placeholder="Dán Transaction Hash (0x...) để kiểm tra" value={searchHash} onChange={e => setSearchHash(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVerify()} />
          <button className="btn btn-primary" onClick={handleVerify} disabled={verifying || !searchHash.trim()}>
            {verifying ? <div className="spinner" /> : <Search size={15} />} Kiểm tra
          </button>
        </div>

        {verifyResult && (
          <div style={{ borderRadius: 12, border: `1px solid ${verifyResult.valid ? 'rgba(46,213,115,0.3)' : 'rgba(255,71,87,0.3)'}`, background: verifyResult.valid ? 'rgba(46,213,115,0.05)' : 'rgba(255,71,87,0.05)', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: verifyResult.valid ? 16 : 0 }}>
              {verifyResult.valid ? <CheckCircle size={22} color="var(--success)" /> : <XCircle size={22} color="var(--danger)" />}
              <span style={{ fontWeight: 700, fontSize: '1.05rem', color: verifyResult.valid ? 'var(--success)' : 'var(--danger)' }}>
                {verifyResult.valid ? 'Xác minh thành công' : 'Không tìm thấy'}
              </span>
            </div>
            {verifyResult.valid && verifyResult.receipt && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Loại giao dịch</div>
                  <div style={{ fontWeight: 600 }}>{verifyResult.type === 'vote' ? 'Phiếu Bầu' : 'Tạo Cuộc Bầu Cử'}</div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Cuộc bầu cử</div>
                    <div style={{ fontWeight: 600 }}>{verifyResult.receipt.electionName}</div>
                  </div>
                  <div style={{ background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Thời gian ghi nhận</div>
                    <div style={{ fontWeight: 600 }}>{new Date(verifyResult.receipt.votedAt).toLocaleString('vi-VN')}</div>
                  </div>
                </div>

                <div style={{ background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Thông báo từ hệ thống</div>
                  <div style={{ color: 'var(--primary)', fontWeight: 500 }}>{verifyResult.receipt.details}</div>
                </div>

                <div style={{ background: 'var(--surface-2)', padding: '12px 16px', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 4 }}>Transaction Hash</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="font-mono text-sm truncate">{verifyResult.receipt.txHash}</span>
                    <button className="btn btn-icon btn-secondary" style={{ width: 28, height: 28 }} onClick={() => copy(verifyResult.receipt.txHash)}><Copy size={12} /></button>
                    <a className="btn btn-icon btn-secondary" style={{ width: 28, height: 28 }} href={`https://sepolia.etherscan.io/tx/${verifyResult.receipt.txHash}`} target="_blank" rel="noreferrer"><ExternalLink size={12} /></a>
                  </div>
                </div>
              </div>
            )}
            {!verifyResult.valid && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 8 }}>{verifyResult.message}</p>}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        {/* System Activity */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Activity size={18} color="var(--primary)" /> Hoạt Động Hệ Thống</h3>
            <button className="btn btn-icon btn-secondary" onClick={loadData}><RefreshCw size={14} /></button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
            ) : activity.length === 0 ? (
              <div className="empty-state">Chưa có hoạt động nào</div>
            ) : activity.map((a, i) => (
              <div key={i} className="card-glass" style={{ padding: '14px 16px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  {activityIcon(a.type)}
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{activityLabel(a.type)}</span>
                  <span className="text-muted" style={{ fontSize: '0.8rem', marginLeft: 'auto' }}>{new Date(a.timestamp).toLocaleString('vi-VN')}</span>
                </div>
                <div style={{ fontSize: '0.85rem', marginBottom: 10 }}>
                  Cuộc bầu cử: <strong style={{ color: 'var(--text)' }}>{a.name}</strong>
                  {a.details && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>Cử tri: {a.details.slice(0, 10)}...{a.details.slice(-8)}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="hash-display" style={{ flex: 1, fontSize: '0.75rem' }}>{a.tx_hash}</span>
                  <button className="btn btn-icon btn-secondary" style={{ width: 24, height: 24 }} onClick={() => copy(a.tx_hash)}><Copy size={11} /></button>
                  <a className="btn btn-icon btn-secondary" style={{ width: 24, height: 24 }} href={`https://sepolia.etherscan.io/tx/${a.tx_hash}`} target="_blank" rel="noreferrer"><ExternalLink size={11} /></a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Network Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="card">
            <h3 style={{ marginBottom: 16 }}>Trạng Thái Mạng</h3>
            {nodeInfo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['Mạng', nodeInfo.name],
                  ['Chain ID', nodeInfo.chainId],
                  ['Block hiện tại', '#' + nodeInfo.blockNumber],
                ].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span className="text-muted">{l}</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{v}</span>
                  </div>
                ))}
                <div className="divider" style={{ margin: '8px 0' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>Kết nối Sepolia ổn định</span>
                </div>
              </div>
            ) : <div className="spinner" />}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Về Explorer</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Trang web này truy xuất dữ liệu trực tiếp từ các cuộc bầu cử và phiếu bầu được lưu trữ trên blockchain Sepolia. 
              Mỗi hành động (tạo bầu cử, bỏ phiếu) đều tạo ra một hash duy nhất không thể thay đổi.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
