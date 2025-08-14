import React, { useEffect } from 'react';
import { AptosWalletAdapterProvider, useWallet } from '@aptos-labs/wallet-adapter-react';
import { PetraWallet } from 'petra-plugin-wallet-adapter';
import { MartianWallet } from '@martianwallet/aptos-wallet-adapter';
import { PontemWallet } from '@pontem/wallet-adapter-plugin';
import { Network } from '@aptos-labs/ts-sdk';
import EscrowDApp from './components/EscrowDApp';
import './App.css';

// Configure wallets for TESTNET - matches your deployed contract
const wallets = [
  new PetraWallet(),
  new MartianWallet(),
  new PontemWallet(),
];

function WalletTimeoutController() {
  const { disconnect, connected } = useWallet();

  useEffect(() => {
    if (!connected) return; // Only start timer when connected

    console.log('Wallet connected - starting 30min timeout timer');
    
    // Set a 30-min timeout (30*60*1000 ms)
    const timer = setTimeout(() => {
      console.log('Wallet timeout reached - disconnecting');
      disconnect();
      alert('🕐 Wallet session expired after 30 minutes for security. Please reconnect to continue using the escrow service.');
    }, 30 * 60 * 1000);

    // Cleanup timer if user disconnects manually or component unmounts
    return () => {
      console.log('Cleaning up wallet timeout timer');
      clearTimeout(timer);
    };
  }, [disconnect, connected]); // Re-run when connection status changes

  return null;
}

function App(): JSX.Element {
  return (
    <AptosWalletAdapterProvider 
      wallets={wallets} 
      autoConnect={false} // Manual connection for better UX
      dappConfig={{
        network: Network.TESTNET, // 🔥 CRITICAL: Must match your deployed contract network
        mizuwallet: {
          manifestURL: "https://assets.mz.xyz/static/config/mizuwallet-connect-manifest.json",
        },
      }}
      onError={(error) => {
        console.error("❌ Wallet adapter error:", error);
        // Show user-friendly error for common issues
        if (error.message?.includes('network')) {
          alert('Network error: Please make sure your wallet is set to Aptos Testnet');
        } else if (error.message?.includes('rejected')) {
          // User rejected - no alert needed
        } else {
          alert(`Wallet connection error: ${error.message}`);
        }
      }}
    >
      <WalletTimeoutController />
      <div className="App">
        <header className="App-header">
          <div className="header-content">
            <div className="title-section">
              <h1>🔐 Aptos Escrow Marketplace</h1>
              <p>Secure peer-to-peer transactions with automatic escrow on Aptos blockchain</p>
            </div>
            <div className="network-info">
              <div className="network-badge testnet">
                <span className="network-dot"></span>
                TESTNET
              </div>
              <div className="contract-info">
                <small>Contract: 0xaba3...379d7</small>
              </div>
            </div>
          </div>
          
          <div className="features-bar">
            <div className="feature">
              <span className="feature-icon">⚡</span>
              <span>Instant Escrow</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🔒</span>
              <span>Secure Transactions</span>
            </div>
            <div className="feature">
              <span className="feature-icon">⏱️</span>
              <span>Auto Refunds</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📊</span>
              <span>Order Tracking</span>
            </div>
          </div>
        </header>
        
        <main>
          <EscrowDApp />
        </main>
        
        <footer className="app-footer">
          <div className="footer-content">
            <div className="footer-section">
              <h4>About</h4>
              <p>A decentralized escrow marketplace built on Aptos blockchain, ensuring secure peer-to-peer transactions.</p>
            </div>
            <div className="footer-section">
              <h4>Features</h4>
              <ul>
                <li>✅ Automatic escrow management</li>
                <li>✅ Timeline-based refunds</li>
                <li>✅ Real-time order tracking</li>
                <li>✅ Multi-wallet support</li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Security</h4>
              <ul>
                <li>🔐 Smart contract verified</li>
                <li>🔐 Non-custodial design</li>
                <li>🔐 Automatic session timeout</li>
                <li>🔐 Testnet environment</li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Aptos Escrow Marketplace | Built with Move & React</p>
            <p>
              <strong>Smart Contract:</strong> 
              <code>0xaba3b69b006249fa70a1d34f2de400e3419705ffb0b7db0831c714a7378379d7::marketplace</code>
            </p>
          </div>
        </footer>
      </div>
    </AptosWalletAdapterProvider>
  );
}

export default App;