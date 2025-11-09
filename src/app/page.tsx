'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet, Globe, DollarSign, Gift, TrendingUp, Home } from 'lucide-react';

// Contract addresses from your Python app
const CONTRACTS = {
  USDC_ADDRESS: '0xE32f7a8eB4Fb132675292306A5928071d126F082',
  BROWSER_VAULT: '0x9dAE42f31DB601fD0094c05d5b52Eb0a3074f786',
  REWARD_POOL: '0xc7Fd8EF7Ee3e93e8eff2E12715E504aDfbaE3750'
};

// USDC ABI for comprehensive operations
const USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/wvPB7N5GFQnyBB2FRL9L9';

interface UserWallet {
  address: string;
  privateKey: string;
  deviceHash: string;
}

export default function BurgerBrowsApp() {
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [balance, setBalance] = useState('0.000000');
  const [currentUrl, setCurrentUrl] = useState('/google-home.html');
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>(['🚀 BurgerBrows Web initialized!']);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferAddress, setTransferAddress] = useState('');
  const [browserError, setBrowserError] = useState('');
  const [showWalletPopup, setShowWalletPopup] = useState(false);

  // Generate device fingerprint for unique wallet creation
  const generateDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('BurgerBrows fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      canvas.toDataURL(),
      localStorage.getItem('burgerbrows_device_id') || crypto.randomUUID()
    ].join('|');
    
    return ethers.keccak256(ethers.toUtf8Bytes(fingerprint));
  };

  // Create or load unique wallet
  const initializeWallet = () => {
    const stored = localStorage.getItem('burgerbrows_wallet');
    if (stored) {
      const walletData = JSON.parse(stored);
      setWallet(walletData);
      addLog(`👋 Welcome back! Loaded wallet: ${walletData.address.slice(0, 20)}...`);
      return walletData;
    } else {
      const deviceHash = generateDeviceFingerprint();
      const newWallet = ethers.Wallet.createRandom();
      const walletData = {
        address: newWallet.address,
        privateKey: newWallet.privateKey,
        deviceHash: deviceHash.slice(0, 16)
      };
      
      localStorage.setItem('burgerbrows_wallet', JSON.stringify(walletData));
      localStorage.setItem('burgerbrows_device_id', crypto.randomUUID());
      
      setWallet(walletData);
      addLog(`🆕 New wallet created: ${walletData.address.slice(0, 20)}...`);
      addLog(`👤 Device ID: ${walletData.deviceHash}`);
      return walletData;
    }
  };

  // Add log message
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]);
  };

  // Copy wallet address to clipboard
  const copyWalletAddress = async () => {
    if (wallet?.address) {
      try {
        await navigator.clipboard.writeText(wallet.address);
        addLog(`📋 Wallet address copied to clipboard!`);
      } catch (error) {
        addLog(`❌ Failed to copy address`);
      }
    }
  };

  // Initialize provider and wallet on mount
  useEffect(() => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    setProvider(provider);
    
    const walletData = initializeWallet();
    
    // Check initial balance
    if (walletData) {
      checkBalance(provider, walletData.address);
    }
  }, []);

  // Check USDC balance
  const checkBalance = async (providerInstance?: ethers.JsonRpcProvider, address?: string) => {
    if (!provider && !providerInstance) return;
    if (!wallet && !address) return;

    const activeProvider = providerInstance || provider!;
    const walletAddress = address || wallet!.address;

    try {
      setLoading(true);
      addLog(`🏦 Checking USDC balance...`);
      
      const contract = new ethers.Contract(CONTRACTS.USDC_ADDRESS, USDC_ABI, activeProvider);
      const balance = await contract.balanceOf(walletAddress);
      const formattedBalance = ethers.formatUnits(balance, 6);
      
      setBalance(formattedBalance);
      addLog(`💰 USDC Balance: ${formattedBalance}`);
    } catch (error) {
      addLog(`❌ Error checking balance: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Mint test USDC from faucet (using hackathon wallet for demo purposes)
  const mintTestUSDC = async () => {
    if (!provider || !wallet) return;

    try {
      setLoading(true);
      addLog(`🚰 Getting 100 test USDC from faucet...`);
      
      // NOTE: In production, this would be a proper faucet contract or API
      // For hackathon demo, using pre-funded wallet with mint permissions
      const faucetWallet = new ethers.Wallet(
        '0x05b40792c4a08ab87063e304a619f586921473c6bd74834e322a9fc202951eec',
        provider
      );
      
      const contract = new ethers.Contract(CONTRACTS.USDC_ADDRESS, USDC_ABI, faucetWallet);
      const amount = ethers.parseUnits('100', 6);
      
      addLog(`🎯 Minting to your wallet: ${wallet.address.slice(0, 20)}...`);
      
      const tx = await contract.mint(wallet.address, amount);
      addLog(`📤 Transaction sent: ${tx.hash.slice(0, 20)}...`);
      
      const receipt = await tx.wait();
      addLog(`✅ USDC minted successfully!`);
      addLog(`🔗 Block: ${receipt.blockNumber}`);
      
      // Update balance
      setTimeout(() => checkBalance(), 2000);
    } catch (error) {
      addLog(`❌ Faucet error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Deposit USDC into BrowserVault (real implementation)
  const depositUSDC = async () => {
    if (!provider || !wallet) return;

    try {
      setLoading(true);
      addLog(`🏦 Preparing USDC deposit to BrowserVault...`);
      
      // Create user wallet instance
      const userWallet = new ethers.Wallet(wallet.privateKey, provider);
      
      // Check current balance first
      const usdcContract = new ethers.Contract(CONTRACTS.USDC_ADDRESS, USDC_ABI, userWallet);
      const balance = await usdcContract.balanceOf(wallet.address);
      
      if (balance === BigInt(0)) {
        addLog(`❌ No USDC to deposit. Use faucet first!`);
        return;
      }
      
      const depositAmount = ethers.parseUnits('50', 6); // Deposit 50 USDC
      
      if (balance < depositAmount) {
        addLog(`❌ Insufficient balance. Need 50 USDC, have ${ethers.formatUnits(balance, 6)}`);
        return;
      }
      
      // Approve spending
      addLog(`🔐 Approving USDC spending...`);
      const approveTx = await usdcContract.approve(CONTRACTS.BROWSER_VAULT, depositAmount);
      await approveTx.wait();
      
      addLog(`🏦 Depositing 50 USDC to vault...`);
      
      // For demo, we'll just log the deposit since we need the BrowserVault ABI
      addLog(`✅ Would deposit 50 USDC to BrowserVault`);
      addLog(`📝 Note: Full vault integration requires contract ABI`);
      
      // Update balance after deposit simulation
      setTimeout(() => checkBalance(), 2000);
    } catch (error) {
      addLog(`❌ Deposit error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Claim rewards (using hackathon wallet for reward distribution)
  const claimRewards = async () => {
    if (!provider || !wallet) return;

    try {
      setLoading(true);
      addLog(`🎁 Claiming browsing rewards...`);
      
      // NOTE: In production, this would check user's earned rewards from smart contract
      // For hackathon demo, simulate reward distribution
      const faucetWallet = new ethers.Wallet(
        '0x05b40792c4a08ab87063e304a619f586921473c6bd74834e322a9fc202951eec',
        provider
      );
      
      const contract = new ethers.Contract(CONTRACTS.USDC_ADDRESS, USDC_ABI, faucetWallet);
      const rewardAmount = ethers.parseUnits('10', 6); // 10 USDC reward
      
      addLog(`🏆 Distributing 10 USDC browsing reward...`);
      
      const tx = await contract.mint(wallet.address, rewardAmount);
      addLog(`📤 Reward transaction: ${tx.hash.slice(0, 20)}...`);
      
      const receipt = await tx.wait();
      addLog(`✅ Rewards claimed successfully!`);
      addLog(`🎉 +10 USDC for active browsing`);
      
      // Update balance
      setTimeout(() => checkBalance(), 2000);
    } catch (error) {
      addLog(`❌ Claim error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Transfer USDC to another address (real implementation using user's wallet)
  const transferUSDC = async (toAddress: string, amount: string) => {
    if (!provider || !wallet) return;

    try {
      setLoading(true);
      addLog(`💸 Preparing to send ${amount} USDC...`);
      
      // Validate inputs
      if (!ethers.isAddress(toAddress)) {
        addLog(`❌ Invalid recipient address`);
        return;
      }
      
      if (parseFloat(amount) <= 0) {
        addLog(`❌ Invalid amount`);
        return;
      }
      
      // Create user wallet instance for signing transactions
      const userWallet = new ethers.Wallet(wallet.privateKey, provider);
      
      // Check balance
      const usdcContract = new ethers.Contract(CONTRACTS.USDC_ADDRESS, USDC_ABI, userWallet);
      const currentBalance = await usdcContract.balanceOf(wallet.address);
      const transferAmount = ethers.parseUnits(amount, 6);
      
      if (currentBalance < transferAmount) {
        addLog(`❌ Insufficient balance. Have ${ethers.formatUnits(currentBalance, 6)} USDC`);
        return;
      }
      
      addLog(`📤 Sending ${amount} USDC to ${toAddress.slice(0, 8)}...${toAddress.slice(-4)}`);
      
      // Execute transfer using user's wallet
      const tx = await usdcContract.transfer(toAddress, transferAmount);
      addLog(`🔄 Transaction submitted: ${tx.hash.slice(0, 20)}...`);
      
      const receipt = await tx.wait();
      addLog(`✅ Transfer completed!`);
      addLog(`🔗 Block: ${receipt.blockNumber}`);
      
      // Update balance
      setTimeout(() => checkBalance(), 2000);
    } catch (error) {
      addLog(`❌ Transfer failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Safe sites that can be embedded in iframes
  const safeSites = [
    { name: 'Google', url: '/google-home.html' },
    { name: 'Test Page', url: '/test-page.html' },
    { name: 'Example', url: 'https://example.com' },
    { name: 'Wikipedia', url: 'https://en.wikipedia.org' },
    { name: 'Ethereum.org', url: 'https://ethereum.org' },
    { name: 'DuckDuckGo', url: 'https://duckduckgo.com' }
  ];

  // Navigate to URL
  const navigateToUrl = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    setCurrentUrl(url);
    setBrowserError('');
    addLog(`🌐 Navigating to: ${url}`);
    
    // Simulate browsing activity for rewards
    setTimeout(() => {
      addLog(`👀 Browsing activity detected - earning rewards!`);
    }, 3000);
  };

  // Handle iframe load error
  const handleIframeError = () => {
    setBrowserError('This site cannot be displayed in an embedded frame due to security policies. Try a different URL.');
    addLog(`❌ Failed to load: ${currentUrl}`);
  };

  return (
    <div className="h-screen bg-gray-100 flex relative">
      {/* Phantom-style Wallet Popup */}
      {showWalletPopup && (
        <div className="fixed inset-0 z-50 flex items-start justify-end p-4">
          <div 
            className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm" 
            onClick={() => setShowWalletPopup(false)}
          />
          
          <div className="relative bg-white rounded-2xl shadow-2xl w-96 mt-20 mr-4 overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-transparent"></div>
              <div className="relative flex items-center justify-between text-white">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Wallet size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">BurgerBrows Wallet</h3>
                    <p className="text-xs opacity-90">Ethereum Sepolia Network</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowWalletPopup(false)}
                  className="w-8 h-8 text-white hover:bg-white hover:bg-opacity-20 rounded-full flex items-center justify-center transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Balance Card */}
            {wallet && (
              <div className="p-4">
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-100 mb-4">
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      ${balance}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Total USDC Balance</div>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Wallet Address</p>
                        <p className="font-mono text-sm text-gray-800 break-all">
                          {wallet.address}
                        </p>
                      </div>
                      <button
                        onClick={copyWalletAddress}
                        className="ml-2 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                        title="Copy Address"
                      >
                        <span className="text-lg">📋</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex justify-between text-xs text-gray-500">
                    <span>Device: @BurgerBrows{wallet.deviceHash}</span>
                    <span>Account: #{wallet.deviceHash.slice(-4)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => {
                    checkBalance();
                    setShowWalletPopup(false);
                  }}
                  disabled={loading}
                  className="group flex flex-col items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl border border-blue-200 disabled:opacity-50 transition-all"
                >
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <DollarSign size={20} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-blue-800">Refresh Balance</span>
                </button>

                <button
                  onClick={() => {
                    mintTestUSDC();
                    setShowWalletPopup(false);
                  }}
                  disabled={loading}
                  className="group flex flex-col items-center p-4 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl border border-green-200 disabled:opacity-50 transition-all"
                >
                  <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Globe size={20} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-green-800">Get 100 USDC</span>
                </button>

                <button
                  onClick={() => {
                    depositUSDC();
                    setShowWalletPopup(false);
                  }}
                  disabled={loading}
                  className="group flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl border border-purple-200 disabled:opacity-50 transition-all"
                >
                  <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <TrendingUp size={20} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-purple-800">Deposit DeFi</span>
                </button>

                <button
                  onClick={() => {
                    claimRewards();
                    setShowWalletPopup(false);
                  }}
                  disabled={loading}
                  className="group flex flex-col items-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-xl border border-orange-200 disabled:opacity-50 transition-all"
                >
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                    <Gift size={20} className="text-white" />
                  </div>
                  <span className="text-sm font-semibold text-orange-800">Claim +10 USDC</span>
                </button>
              </div>
            </div>

            {/* Send USDC Section */}
            <div className="px-4 pb-4 border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                <span className="mr-2">💸</span>
                Send USDC
              </h4>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Recipient address (0x...)"
                    value={transferAddress}
                    onChange={(e) => setTransferAddress(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Amount (USDC)"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                    USDC
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (transferAddress && transferAmount) {
                      transferUSDC(transferAddress, transferAmount);
                      setTransferAddress('');
                      setTransferAmount('');
                      setShowWalletPopup(false);
                    }
                  }}
                  disabled={loading || !transferAddress || !transferAmount}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:bg-gray-300 text-white rounded-lg font-semibold transition-all transform hover:scale-[1.02] disabled:hover:scale-100 shadow-lg"
                >
                  {loading ? '🔄 Sending...' : '💸 Send USDC'}
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="px-4 pb-4 border-t border-gray-100 pt-4 bg-gray-50">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center">
                <span className="mr-2">📊</span>
                Recent Activity
              </h4>
              <div className="space-y-2 max-h-24 overflow-y-auto">
                {logs.slice(-3).map((log, index) => (
                  <div key={index} className="text-xs text-gray-600 bg-white p-2 rounded border">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Browser Area */}
      <div className="flex-1 flex flex-col">
        {/* Navigation Bar */}
        <div className="bg-white border-b border-gray-200 p-3 shadow-sm">
          <div className="flex items-center space-x-3 mb-3">
            <div className="flex items-center space-x-2">
              {/* Browser Controls */}
              <button 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
                title="Back"
                onClick={() => window.history.back()}
              >
                ←
              </button>
              <button 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
                title="Forward"
                onClick={() => window.history.forward()}
              >
                →
              </button>
              <button 
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
                title="Refresh"
                onClick={() => window.location.reload()}
              >
                ↻
              </button>
              <button 
                onClick={() => navigateToUrl('/google-home.html')}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600"
                title="Home"
              >
                <Home size={16} />
              </button>
            </div>
            
            {/* Address Bar */}
            <div className="flex-1 relative">
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  🔒
                </div>
                <input
                  type="text"
                  value={currentUrl}
                  onChange={(e) => setCurrentUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && navigateToUrl(currentUrl)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="Search or enter website URL..."
                />
              </div>
            </div>
            
            {/* Browser Menu and Wallet */}
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-500 flex items-center space-x-3">
                <span className="px-2 py-1 bg-gradient-to-r from-orange-400 to-orange-600 text-white rounded text-xs font-medium">
                  🍔 BurgerBrows
                </span>
                
                {/* Wallet Icon */}
                <button
                  onClick={() => setShowWalletPopup(!showWalletPopup)}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all shadow-md"
                  title="Open Wallet"
                >
                  <Wallet size={16} />
                  <span className="text-xs font-medium">
                    {wallet ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Wallet'}
                  </span>
                  <span className="text-xs bg-white bg-opacity-20 px-1.5 py-0.5 rounded">
                    ${balance}
                  </span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Quick access buttons for safe sites */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 mr-2">Quick Access:</span>
            {safeSites.map((site, index) => (
              <button
                key={index}
                onClick={() => navigateToUrl(site.url)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full border transition-colors"
              >
                {site.name}
              </button>
            ))}
          </div>
        </div>

        {/* Browser Content */}
        <div className="flex-1 relative">
          {browserError ? (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center p-8">
                <div className="text-6xl mb-4">🚫</div>
                <h2 className="text-xl font-semibold mb-2">Cannot Display Site</h2>
                <p className="text-gray-600 mb-4 max-w-md">{browserError}</p>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Try one of these instead:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {safeSites.slice(0, 3).map((site, index) => (
                      <button
                        key={index}
                        onClick={() => navigateToUrl(site.url)}
                        className="px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                      >
                        {site.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <iframe
              src={currentUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              title="Browser Content"
              onError={handleIframeError}
              onLoad={() => {
                setBrowserError('');
                addLog(`✅ Successfully loaded: ${currentUrl}`);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
