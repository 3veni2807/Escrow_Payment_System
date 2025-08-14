module escrow::marketplace {
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use aptos_framework::event;

    // Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ORDER_NOT_FOUND: u64 = 2;
    const E_NOT_BUYER: u64 = 3;
    const E_NOT_SELLER: u64 = 4;
    const E_INVALID_STATUS: u64 = 5;
    const E_TIMELINE_NOT_EXPIRED: u64 = 6;
    const E_INSUFFICIENT_BALANCE: u64 = 7;

    // Order status
    const STATUS_PENDING: u8 = 1;
    const STATUS_DELIVERED: u8 = 2;
    const STATUS_REFUNDED: u8 = 3;

    struct Order has key, store, copy, drop {
        order_id: u64,
        buyer: address,
        seller: address,
        product_name: String,
        amount: u64,
        status: u8,
        created_at: u64,
        timeline_hours: u64,
        escrow_released: bool,
    }

    struct Marketplace has key {
        orders: vector<Order>,
        next_order_id: u64,
        escrow_pool: coin::Coin<AptosCoin>,
    }

    // Events
    #[event]
    struct OrderCreated has drop, store {
        order_id: u64,
        buyer: address,
        seller: address,
        amount: u64,
        timestamp: u64,
    }

    #[event]
    struct ProductDelivered has drop, store {
        order_id: u64,
        timestamp: u64,
    }

    #[event]
    struct RefundProcessed has drop, store {
        order_id: u64,
        buyer: address,
        amount: u64,
        timestamp: u64,
    }

    // Initialize marketplace
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);
        
        if (!exists<Marketplace>(admin_addr)) {
            move_to(admin, Marketplace {
                orders: vector::empty<Order>(),
                next_order_id: 1,
                escrow_pool: coin::zero<AptosCoin>(),
            });
        };
    }

    // Create new order and send money to escrow
    public entry fun create_order(
        buyer: &signer,
        seller_addr: address,
        product_name: vector<u8>,
        amount: u64,
        timeline_hours: u64,
        marketplace_addr: address,
    ) acquires Marketplace {
        let buyer_addr = signer::address_of(buyer);
        
        // Check if buyer has sufficient balance
        assert!(coin::balance<AptosCoin>(buyer_addr) >= amount, E_INSUFFICIENT_BALANCE);
        
        let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
        
        let order = Order {
            order_id: marketplace.next_order_id,
            buyer: buyer_addr,
            seller: seller_addr,
            product_name: string::utf8(product_name),
            amount,
            status: STATUS_PENDING,
            created_at: timestamp::now_seconds(),
            timeline_hours,
            escrow_released: false,
        };

        // Transfer money from buyer to escrow pool
        let payment = coin::withdraw<AptosCoin>(buyer, amount);
        coin::merge(&mut marketplace.escrow_pool, payment);
        
        vector::push_back(&mut marketplace.orders, order);
        marketplace.next_order_id = marketplace.next_order_id + 1;

        // Emit event
        event::emit(OrderCreated {
            order_id: order.order_id,
            buyer: buyer_addr,
            seller: seller_addr,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    // Buyer confirms product received
    public entry fun confirm_product_received(
        buyer: &signer,
        order_id: u64,
        marketplace_addr: address,
    ) acquires Marketplace {
        let buyer_addr = signer::address_of(buyer);
        let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
        
        let order_ref = get_order_mut(&mut marketplace.orders, order_id);
        assert!(order_ref.buyer == buyer_addr, E_NOT_BUYER);
        assert!(order_ref.status == STATUS_PENDING, E_INVALID_STATUS);
        
        // Update order status
        order_ref.status = STATUS_DELIVERED;
        order_ref.escrow_released = true;
        
        // Transfer money from escrow to seller
        let payment = coin::extract(&mut marketplace.escrow_pool, order_ref.amount);
        coin::deposit(order_ref.seller, payment);

        // Emit event
        event::emit(ProductDelivered {
            order_id,
            timestamp: timestamp::now_seconds(),
        });
    }

    // Process refund if timeline expired
    public entry fun process_refund(
        requester: &signer,
        order_id: u64,
        marketplace_addr: address,
    ) acquires Marketplace {
        let marketplace = borrow_global_mut<Marketplace>(marketplace_addr);
        
        let order_ref = get_order_mut(&mut marketplace.orders, order_id);
        assert!(order_ref.status == STATUS_PENDING, E_INVALID_STATUS);
        
        // Check if timeline has expired
        let current_time = timestamp::now_seconds();
        let expiry_time = order_ref.created_at + (order_ref.timeline_hours * 3600);
        assert!(current_time >= expiry_time, E_TIMELINE_NOT_EXPIRED);
        
        // Update order status
        order_ref.status = STATUS_REFUNDED;
        order_ref.escrow_released = true;
        
        // Refund money to buyer
        let refund = coin::extract(&mut marketplace.escrow_pool, order_ref.amount);
        coin::deposit(order_ref.buyer, refund);

        // Emit event
        event::emit(RefundProcessed {
            order_id,
            buyer: order_ref.buyer,
            amount: order_ref.amount,
            timestamp: current_time,
        });
    }

    // View functions
    #[view]
    public fun get_order(marketplace_addr: address, order_id: u64): Order acquires Marketplace {
        let marketplace = borrow_global<Marketplace>(marketplace_addr);
        *get_order_ref(&marketplace.orders, order_id)
    }

    #[view]
    public fun get_all_orders(marketplace_addr: address): vector<Order> acquires Marketplace {
        let marketplace = borrow_global<Marketplace>(marketplace_addr);
        marketplace.orders
    }

    #[view]
    public fun get_user_orders(marketplace_addr: address, user_addr: address): vector<Order> acquires Marketplace {
        let marketplace = borrow_global<Marketplace>(marketplace_addr);
        let user_orders = vector::empty<Order>();
        let i = 0;
        let len = vector::length(&marketplace.orders);
        
        while (i < len) {
            let order = vector::borrow(&marketplace.orders, i);
            if (order.buyer == user_addr || order.seller == user_addr) {
                vector::push_back(&mut user_orders, *order);
            };
            i = i + 1;
        };
        
        user_orders
    }

    #[view]
    public fun get_escrow_balance(marketplace_addr: address): u64 acquires Marketplace {
        let marketplace = borrow_global<Marketplace>(marketplace_addr);
        coin::value(&marketplace.escrow_pool)
    }

    // Helper functions
    fun get_order_ref(orders: &vector<Order>, order_id: u64): &Order {
        let i = 0;
        let len = vector::length(orders);
        
        while (i < len) {
            let order = vector::borrow(orders, i);
            if (order.order_id == order_id) {
                return order
            };
            i = i + 1;
        };
        
        abort E_ORDER_NOT_FOUND
    }

    fun get_order_mut(orders: &mut vector<Order>, order_id: u64): &mut Order {
        let i = 0;
        let len = vector::length(orders);
        
        while (i < len) {
            let order = vector::borrow_mut(orders, i);
            if (order.order_id == order_id) {
                return order
            };
            i = i + 1;
        };
        
        abort E_ORDER_NOT_FOUND
    }
}