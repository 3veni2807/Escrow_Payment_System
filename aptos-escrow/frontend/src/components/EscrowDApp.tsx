import React, { useState, useEffect } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { WalletSelector } from '@aptos-labs/wallet-adapter-ant-design';
import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import './EscrowDApp.css';

// Configure Aptos client for Testnet
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// Replace with your deployed module address
const MODULE_ADDRESS = "0xaba3b69b006249fa70a1d34f2de400e3419705ffb0b7db0831c714a7378379d7";

interface Order {
  order_id: number;
  buyer: string;
  seller: string;
  product_name: string;
  amount: number;
  status: number;
  created_at: number;
  timeline_hours: number;
  escrow_released: boolean;
}

interface EscrowData {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  status: string;
}

const EscrowDApp: React.FC = () => {
  const { connected, account, signAndSubmitTransaction } = useWallet();
  const [escrows, setEscrows] = useState<EscrowData[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ 
    recipient: '', 
    amount: '', 
    productName: 'Test Product',
    timeline: '24' 
  });

  // ✅ Create new order (send money to escrow)
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !account) {
      alert('Please connect your wallet first');
      return;
    }

    if (!formData.recipient || !formData.amount || !formData.productName) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const amountInOctas = Math.floor(parseFloat(formData.amount) * 100000000); // Convert APT to Octas
      
      const transaction = {
        data: {
          function: `${MODULE_ADDRESS}::marketplace::create_order`,
          typeArguments: [],
          functionArguments: [
            formData.recipient,                                      // seller_addr: address
            Array.from(new TextEncoder().encode(formData.productName)), // product_name: vector<u8>
            amountInOctas,                                          // amount: u64
            parseInt(formData.timeline),                            // timeline_hours: u64
            MODULE_ADDRESS                                          // marketplace_addr: address
          ]
        }
      };

      const response = await signAndSubmitTransaction(transaction);
      console.log("Order created:", response);
      
      // Wait for transaction to be processed
      await aptos.waitForTransaction({ transactionHash: response.hash });
      
      alert('Order created successfully!');
      setFormData({ 
        recipient: '', 
        amount: '', 
        productName: 'Test Product',
        timeline: '24' 
      });
      await fetchEscrows();
    } catch (error: any) {
      console.error("Error creating order:", error);
      alert(`Error creating order: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Confirm product received (release escrow) - Only buyer can do this
  const handleReleaseOrder = async (orderId: string) => {
    if (!connected || !account) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const transaction = {
        data: {
          function: `${MODULE_ADDRESS}::marketplace::confirm_product_received`,
          typeArguments: [],
          functionArguments: [
            parseInt(orderId),    // order_id: u64
            MODULE_ADDRESS       // marketplace_addr: address
          ]
        }
      };

      const response = await signAndSubmitTransaction(transaction);
      console.log("Order released:", response);
      
      // Wait for transaction to be processed
      await aptos.waitForTransaction({ transactionHash: response.hash });
      
      alert('Escrow released successfully!');
      await fetchEscrows();
    } catch (error: any) {
      console.error("Error releasing order:", error);
      alert(`Error releasing order: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Process refund (if timeline expired) - Anyone can trigger this
  const handleProcessRefund = async (orderId: string) => {
    if (!connected || !account) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const transaction = {
        data: {
          function: `${MODULE_ADDRESS}::marketplace::process_refund`,
          typeArguments: [],
          functionArguments: [
            parseInt(orderId),    // order_id: u64
            MODULE_ADDRESS       // marketplace_addr: address
          ]
        }
      };

      const response = await signAndSubmitTransaction(transaction);
      console.log("Refund processed:", response);
      
      // Wait for transaction to be processed
      await aptos.waitForTransaction({ transactionHash: response.hash });
      
      alert('Refund processed successfully!');
      await fetchEscrows();
    } catch (error: any) {
      console.error("Error processing refund:", error);
      alert(`Error processing refund: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch user orders using view function
  const fetchEscrows = async () => {
    if (!account) return;
    
    try {
      setLoading(true);
      
      // Get user orders using view function
      const userOrders = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::marketplace::get_user_orders`,
          typeArguments: [],
          functionArguments: [MODULE_ADDRESS, account.address.toString()]
        }
      }) as Order[][];

      // Convert to EscrowData format
      const orders = userOrders[0] || [];
      const formattedEscrows: EscrowData[] = orders.map((order: Order) => ({
        id: order.order_id.toString(),
        sender: order.buyer,
        recipient: order.seller,
        amount: order.amount / 100000000, // Convert from Octas to APT
        status: getStatusString(order.status)
      }));

      setEscrows(formattedEscrows);
      
    } catch (error: any) {
      console.error("Error fetching escrows:", error);
      // Don't show alert for fetch errors, just log them
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert status number to string
  const getStatusString = (status: number): string => {
    switch (status) {
      case 1: return 'pending';
      case 2: return 'delivered';
      case 3: return 'refunded';
      default: return 'unknown';
    }
  };

  // Check if marketplace is initialized
  const checkMarketplaceInitialized = async (): Promise<boolean> => {
    try {
      await aptos.getAccountResource({
        accountAddress: MODULE_ADDRESS,
        resourceType: `${MODULE_ADDRESS}::marketplace::Marketplace`
      });
      return true;
    } catch (error) {
      console.log("Marketplace not initialized");
      return false;
    }
  };

  // Initialize marketplace if needed
  const initializeMarketplace = async () => {
    if (!connected || !account) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const transaction = {
        data: {
          function: `${MODULE_ADDRESS}::marketplace::initialize`,
          typeArguments: [],
          functionArguments: []
        }
      };

      const response = await signAndSubmitTransaction(transaction);
      console.log("Marketplace initialized:", response);
      
      await aptos.waitForTransaction({ transactionHash: response.hash });
      alert('Marketplace initialized successfully!');
      
    } catch (error: any) {
      console.error("Error initializing marketplace:", error);
      alert(`Error initializing marketplace: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Get escrow balance
  const getEscrowBalance = async () => {
    try {
      const balance = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::marketplace::get_escrow_balance`,
          typeArguments: [],
          functionArguments: [MODULE_ADDRESS]
        }
      }) as number[];
      
      const balanceInAPT = balance[0] / 100000000;
      alert(`Current escrow balance: ${balanceInAPT} APT`);
    } catch (error: any) {
      console.error("Error fetching escrow balance:", error);
      alert(`Error fetching balance: ${error.message || 'Unknown error'}`);
    }
  };

  useEffect(() => {
    if (connected && account) {
      fetchEscrows();
    }
  }, [connected, account]);

  if (!connected) {
    return (
      <div className="wallet-connect">
        <div className="connect-card">
          <h2>Connect Your Wallet</h2>
          <p>Connect your Aptos wallet to start using the escrow service</p>
          <WalletSelector />
        </div>
      </div>
    );
  }

  return (
    <div className="escrow-dapp">
      <div className="user-info">
        <div>
          <h2>Welcome to Escrow DApp</h2>
          <p><strong>Connected:</strong> {account?.address.toString()}</p>
        </div>
        <div className="header-actions">
          <button 
            onClick={initializeMarketplace} 
            disabled={loading}
            className="init-btn"
          >
            Initialize Marketplace
          </button>
          <button 
            onClick={getEscrowBalance} 
            disabled={loading}
            className="balance-btn"
          >
            Check Balance
          </button>
        </div>
      </div>

      <div className="escrow-sections">
        <div className="create-section">
          <h3>Create New Escrow Order</h3>
          <form onSubmit={handleCreateOrder} className="escrow-form">
            <div className="form-group">
              <label htmlFor="recipient">Seller Address:</label>
              <input
                type="text"
                id="recipient"
                value={formData.recipient}
                onChange={(e) => setFormData({...formData, recipient: e.target.value})}
                placeholder="0x..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="productName">Product Name:</label>
              <input
                type="text"
                id="productName"
                value={formData.productName}
                onChange={(e) => setFormData({...formData, productName: e.target.value})}
                placeholder="Enter product name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount (APT):</label>
              <input
                type="number"
                id="amount"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="0.0"
                step="0.01"
                min="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="timeline">Timeline (hours):</label>
              <input
                type="number"
                id="timeline"
                value={formData.timeline}
                onChange={(e) => setFormData({...formData, timeline: e.target.value})}
                placeholder="24"
                min="1"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="create-btn">
              {loading ? 'Creating...' : 'Create Escrow Order'}
            </button>
          </form>
        </div>

        <div className="escrows-section">
          <h3>Your Orders</h3>
          <button onClick={fetchEscrows} disabled={loading} className="refresh-btn">
            {loading ? 'Loading...' : 'Refresh Orders'}
          </button>
          
          {escrows.length === 0 ? (
            <p className="no-escrows">No orders found</p>
          ) : (
            <div className="escrows-list">
              {escrows.map((escrow) => (
                <div key={escrow.id} className="escrow-card">
                  <div className="escrow-info">
                    <p><strong>Order ID:</strong> {escrow.id}</p>
                    <p><strong>Buyer:</strong> {escrow.sender.slice(0, 6)}...{escrow.sender.slice(-4)}</p>
                    <p><strong>Seller:</strong> {escrow.recipient.slice(0, 6)}...{escrow.recipient.slice(-4)}</p>
                    <p><strong>Amount:</strong> {escrow.amount} APT</p>
                    <p><strong>Status:</strong> <span className={`status-${escrow.status}`}>{escrow.status.toUpperCase()}</span></p>
                  </div>
                  <div className="escrow-actions">
                    {/* Only buyer can confirm product received */}
                    {escrow.status === 'pending' && escrow.sender === account?.address.toString() && (
                      <button
                        onClick={() => handleReleaseOrder(escrow.id)}
                        disabled={loading}
                        className="release-btn"
                      >
                        Confirm Received
                      </button>
                    )}
                    {/* Anyone can process refund if timeline expired */}
                    {escrow.status === 'pending' && (
                      <button
                        onClick={() => handleProcessRefund(escrow.id)}
                        disabled={loading}
                        className="refund-btn"
                      >
                        Process Refund
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EscrowDApp;