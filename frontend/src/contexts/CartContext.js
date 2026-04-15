import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserContext } from '../UserContext';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { userId } = useContext(UserContext);
  const [cartItems, setCartItems] = useState([]);
  const [orderId, setOrderId] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${userId}`);
    if (savedCart) {
      const { items, orderId: savedOrderId, restaurantId: savedRestaurantId } = JSON.parse(savedCart);
      setCartItems(items || []);
      setOrderId(savedOrderId);
      setRestaurantId(savedRestaurantId);
    }
  }, [userId]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`cart_${userId}`, JSON.stringify({
        items: cartItems,
        orderId,
        restaurantId
      }));
    }
  }, [cartItems, orderId, restaurantId, userId]);

  const addItem = (item) => {
    setCartItems(prev => {
      // Check if item already exists
      const existingIndex = prev.findIndex(i => i.menu_item_id === item.menu_item_id);

      if (existingIndex >= 0) {
        // Update quantity
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + (item.quantity || 1)
        };
        return updated;
      } else {
        // Add new item
        return [...prev, { ...item, quantity: item.quantity || 1 }];
      }
    });
  };

  const removeItem = (itemId) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setCartItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setOrderId(null);
    setRestaurantId(null);
    if (userId) {
      localStorage.removeItem(`cart_${userId}`);
    }
  };

  const getTotal = () => {
    const subtotal = cartItems.reduce((sum, item) =>
      sum + (item.unit_price_cents * item.quantity), 0
    );
    const tax = Math.round(subtotal * 0.08); // 8% tax
    const deliveryFee = 0; // Delivery fee calculated on backend
    return {
      subtotal,
      tax,
      deliveryFee,
      total: subtotal + tax + deliveryFee
    };
  };

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        orderId,
        restaurantId,
        loading,
        itemCount,
        setOrderId,
        setRestaurantId,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotal,
        setLoading
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
