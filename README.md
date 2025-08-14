# Escrow Payment System

## Team Name: BTS

### Team Members

| Name                      | Email                         | LinkedIn |
|---------------------------|-------------------------------|----------|
| **Nidumolu Bala Keerthi** | nidumolubalakeerthi@gmail.com | [LinkedIn Profile](https://www.linkedin.com/in/balakeerthi-nidumolu-34435425b/) |
| **Nippulapalli Triveni**  | nippulapallitriveni@gmail.com | [LinkedIn Profile](https://www.linkedin.com/in/triveni-nippulapalli-0a129a272/) |
| **Mogal Safiya**          | mogalsafiya37@gmail.com       | [LinkedIn Profile](https://www.linkedin.com/in/mogal-safiya-a60115264/) |

## Project Description
An Escrow Payment System is a financial arrangement where a trusted third party (the escrow) temporarily holds funds during a transaction between a buyer and a seller. 
Funds are only released when predefined conditions are met. Using Aptos blockchain and Move smart contracts,this system can be fully decentralized, trustless, and transparent.


### Key Features

- **🔐 Trustless Transactions**: Smart contracts automatically handle fund management
- **⏰ Timeline Protection**: Automatic refunds if delivery timelines are exceeded  
- **💰 Secure Escrow**: Funds are locked until delivery confirmation
- **🔍 Order Tracking**: Real-time status updates for all transactions
- **⚡ Fast Settlement**: Instant fund release upon delivery confirmation
- **🌐 Decentralized**: No central authority required

### How It Works

1. **Order Creation**: Buyer creates an escrow order with seller details, product info, and payment
2. **Fund Locking**: Smart contract locks buyer's funds securely 
3. **Product Delivery**: Seller delivers the product to buyer
4. **Confirmation**: Buyer confirms receipt and releases funds to seller
5. **Automatic Protection**: If timeline expires, funds are automatically refunded to buyer

### Use Cases

- **E-commerce**: Secure online marketplace transactions
- **Freelance Services**: Project-based work with milestone payments
- **Digital Assets**: Safe trading of NFTs and digital goods
- **Peer-to-Peer Trading**: Direct buyer-seller transactions
- **Service Agreements**: Professional services with delivery guarantees

## Smart Contract Details

### Contract Architecture

- **Blockchain**: Aptos Testnet
- **Language**: Move Programming Language
- **Module Address**: `0xaba3b69b006249fa70a1d34f2de400e3419705ffb0b7db0831c714a7378379d7`
- **Module Name**: `marketplace`

### Core Functions

#### Public Entry Functions

```move
// Initialize the marketplace (one-time setup)
public entry fun initialize()

// Create a new escrow order
public entry fun create_order(
    seller_addr: address,
    product_name: vector<u8>,
    amount: u64,
    timeline_hours: u64,
    marketplace_addr: address
)

// Confirm product received and release funds (buyer only)
public entry fun confirm_product_received(
    order_id: u64,
    marketplace_addr: address
)

// Process refund for expired orders (anyone can call)
public entry fun process_refund(
    order_id: u64,
    marketplace_addr: address
)
```

#### View Functions

```move
// Get all orders for a specific user
public fun get_user_orders(
    marketplace_addr: address,
    user_addr: address
): vector<Order>

// Get current escrow balance
public fun get_escrow_balance(marketplace_addr: address): u64
```

### Data Structures

#### Order Struct
```move
struct Order has key, store {
    order_id: u64,          // Unique order identifier
    buyer: address,         // Buyer's wallet address
    seller: address,        // Seller's wallet address
    product_name: vector<u8>, // Product description
    amount: u64,            // Amount in Octas (1 APT = 100,000,000 Octas)
    status: u64,            // Order status (1=pending, 2=delivered, 3=refunded)
    created_at: u64,        // Timestamp of order creation
    timeline_hours: u64,    // Delivery timeline in hours
    escrow_released: bool   // Whether funds have been released
}
```

#### Marketplace Resource
```move
struct Marketplace has key {
    orders: Table<u64, Order>,  // All orders indexed by ID
    next_order_id: u64,         // Counter for generating unique IDs
    escrow_balance: u64         // Total funds held in escrow
}
```

### Security Features

- **Access Control**: Only buyers can confirm receipt and release funds
- **Timeline Protection**: Automatic refund mechanism for expired orders
- **Fund Safety**: Funds are locked in smart contract until resolution
- **Immutable Logic**: Smart contract rules cannot be changed after deployment

### Transaction Flow

1. **Marketplace Initialization**: Deploy and initialize marketplace resource
2. **Order Creation**: Buyer sends APT tokens to escrow with order details
3. **Fund Locking**: Smart contract holds funds securely
4. **Status Tracking**: Order status updates throughout process
5. **Resolution**: Either funds released to seller or refunded to buyer

## Technology Stack

### Frontend
- **React 18**: Modern UI framework with hooks
- **TypeScript**: Type-safe development
- **Aptos Wallet Adapter**: Seamless wallet integration
- **CSS3**: Custom styling for responsive design

### Blockchain
- **Aptos**: High-performance Layer 1 blockchain
- **Move**: Safe and flexible smart contract language
- **Aptos TypeScript SDK**: Blockchain interaction library

### Development Tools
- **Aptos CLI**: Smart contract compilation and deployment
- **Move Prover**: Formal verification for contract safety
- **Aptos Explorer**: Transaction and contract monitoring

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Aptos CLI
- Aptos Wallet (Petra, Martian, etc.)

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-repo/escrow-marketplace-dapp
cd escrow-marketplace-dapp
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
npm start
```

4. Connect your Aptos wallet and switch to Testnet

### Usage

1. **Initialize Marketplace**: Click "Initialize Marketplace" (first time only)
2. **Create Order**: Fill in seller address, product details, and amount
3. **Track Orders**: Monitor order status in "Your Orders" section
4. **Confirm Receipt**: Click "Confirm Received" when product is delivered
5. **Process Refund**: Use "Process Refund" for expired orders


---

*Built with ❤️ by Team BTS on Aptos blockchain*
