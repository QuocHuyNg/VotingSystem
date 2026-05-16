import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import toast from 'react-hot-toast'
import contractData from '../contracts/Voting.json'

const Web3Context = createContext(null)
const SEPOLIA_CHAIN_ID = '0xaa36a7' // 11155111 in hex

export function Web3Provider({ children }) {
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [account, setAccount] = useState(null)
  const [contract, setContract] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false)

  const getContractInstance = useCallback((signerOrProvider) => {
    if (!contractData?.address || !contractData?.abi) return null
    return new ethers.Contract(contractData.address, contractData.abi, signerOrProvider)
  }, [])

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('MetaMask chưa được cài đặt! Vui lòng cài MetaMask.')
      return false
    }
    try {
      setIsConnecting(true)
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      const web3Provider = new ethers.BrowserProvider(window.ethereum)
      const web3Signer = await web3Provider.getSigner()
      const network = await web3Provider.getNetwork()
      const cId = '0x' + network.chainId.toString(16)

      setProvider(web3Provider)
      setSigner(web3Signer)
      setAccount(accounts[0])
      setChainId(cId)
      setIsCorrectNetwork(cId === SEPOLIA_CHAIN_ID)
      setContract(getContractInstance(web3Signer))

      toast.success(`Đã kết nối: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`)
      return true
    } catch (err) {
      toast.error('Kết nối ví thất bại: ' + (err.message || 'Unknown error'))
      return false
    } finally {
      setIsConnecting(false)
    }
  }

  const switchToSepoliaNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      })
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: SEPOLIA_CHAIN_ID,
            chainName: 'Sepolia Test Network',
            nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://rpc.ankr.com/eth_sepolia'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          }],
        })
      }
    }
  }

  const disconnectWallet = () => {
    setProvider(null); setSigner(null)
    setAccount(null); setContract(null)
    setChainId(null); setIsCorrectNetwork(false)
  }

  // Initialize on mount
  useEffect(() => {
    if (!window.ethereum) return

    const init = async () => {
      try {
        const web3Provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        
        if (accounts.length > 0) {
          const network = await web3Provider.getNetwork()
          const cId = '0x' + network.chainId.toString(16)
          const web3Signer = await web3Provider.getSigner()
          
          setProvider(web3Provider)
          setSigner(web3Signer)
          setAccount(accounts[0])
          setChainId(cId)
          setIsCorrectNetwork(cId === SEPOLIA_CHAIN_ID)
          setContract(getContractInstance(web3Signer))
        }
      } catch (err) {
        console.error('Web3 init failed:', err)
      }
    }
    init()

    const handleAccounts = (accounts) => {
      if (accounts.length === 0) disconnectWallet()
      else window.location.reload() // Reload on account change is also safer
    }
    const handleChain = (_chainId) => {
      window.location.reload()
    }
    window.ethereum.on('accountsChanged', handleAccounts)
    window.ethereum.on('chainChanged', handleChain)
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccounts)
      window.ethereum.removeListener('chainChanged', handleChain)
    }
  }, [getContractInstance])

  return (
    <Web3Context.Provider value={{
      provider, signer, account, contract, chainId,
      isConnecting, isCorrectNetwork,
      connectWallet, disconnectWallet, switchToSepoliaNetwork,
      contractAddress: contractData?.address,
    }}>
      {children}
    </Web3Context.Provider>
  )
}

export const useWeb3 = () => useContext(Web3Context)
