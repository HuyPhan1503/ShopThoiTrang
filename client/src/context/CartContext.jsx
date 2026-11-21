import { createContext, useContext, useMemo, useState } from 'react';
import cartService from '../services/cartService';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => cartService.getCart());

    const addToCart = (product, variant, quantity = 1) => {
        const updated = cartService.addItem(product, variant, quantity);
        setCartItems([...updated]);
    };

    const updateQuantity = (bienTheId, quantity) => {
        const updated = cartService.updateQuantity(bienTheId, quantity);
        setCartItems([...updated]);
    };

    const removeFromCart = (bienTheId) => {
        const updated = cartService.removeItem(bienTheId);
        setCartItems([...updated]);
    };

    const clearCart = () => {
        const updated = cartService.clearCart();
        setCartItems(updated);
    };

    const summary = useMemo(() => {
        const totalItems = cartItems.reduce((sum, item) => sum + item.soLuong, 0);
        const totalAmount = cartItems.reduce((sum, item) => sum + item.gia * item.soLuong, 0);
        return { totalItems, totalAmount };
    }, [cartItems]);

    return (
        <CartContext.Provider
            value={{
                cartItems,
                totalItems: summary.totalItems,
                totalAmount: summary.totalAmount,
                addToCart,
                updateQuantity,
                removeFromCart,
                clearCart
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);