import { useCallback, useEffect, useState } from "react";
import "./Cart.css";

const getAuthHeaders = (includeJson = false) => {
  const token = localStorage.getItem("token");
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  return imageUrl.startsWith("http") ? imageUrl : `http://localhost:1500${imageUrl}`;
};

export default function Cart() {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  // Checkout Step: "cart" | "checkout" | "confirmed"
  const [step, setStep] = useState("cart");

  // Checkout Form Details
  const [fulfillment, setFulfillment] = useState("delivery"); // "delivery" | "pickup"
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null);

  const fetchCart = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      setError("Please log in to view your cart.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("http://localhost:1500/cart/get", {
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Could not load your cart.");
        setCart({ items: [], total: 0 });
        return;
      }
      setError(null);
      setCart(data);
    } catch (err) {
      setError("Could not connect to the cart service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Cart & Checkout - CarKit";
    fetchCart();

    // Auto pre-fill address and phone from localStorage user profile if present
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.Address) setAddress(u.Address);
        if (u.Phone) setPhone(u.Phone);
      }
    } catch (e) {
      // ignore
    }
  }, [fetchCart]);

  const updateQuantity = async (item, nextQuantity) => {
    if (nextQuantity < 1) return;
    if (nextQuantity > Number(item.Stock)) {
      setError(`Only ${item.Stock} available in stock.`);
      return;
    }

    try {
      setUpdatingId(item.CartItemID);
      const response = await fetch(`http://localhost:1500/cart/update/${item.CartItemID}`, {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ Quantity: nextQuantity }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Could not update quantity.");
        return;
      }
      await fetchCart();
    } catch (err) {
      setError("Could not update cart item.");
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (item) => {
    try {
      setUpdatingId(item.CartItemID);
      const response = await fetch(`http://localhost:1500/cart/delete/${item.CartItemID}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Could not remove product.");
        return;
      }
      await fetchCart();
    } catch (err) {
      setError("Could not remove product from cart.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError(null);

    if (!phone.trim()) {
      setError("Please enter a valid contact phone number.");
      return;
    }

    if (fulfillment === "delivery" && !address.trim()) {
      setError("Please enter your delivery address.");
      return;
    }

    const shippingInfo =
      fulfillment === "delivery"
        ? `[Delivery] Address: ${address.trim()} | Phone: ${phone.trim()} | Cash on Delivery${
            orderNotes ? ` | Note: ${orderNotes.trim()}` : ""
          }`
        : `[In-Store Pickup] Store: 123 CarKit Ave, Suite 400 | Phone: ${phone.trim()} | Cash on Pickup${
            orderNotes ? ` | Note: ${orderNotes.trim()}` : ""
          }`;

    try {
      setUpdatingId("checkout");
      const response = await fetch("http://localhost:1500/cart/checkout", {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          ShippingAddress: shippingInfo,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Checkout failed. Please review stock levels.");
        await fetchCart();
        return;
      }

      setPlacedOrder(data);
      setStep("confirmed");
      setCart({ items: [], total: 0 });
    } catch (err) {
      setError("Could not complete order. Please check backend connection.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="cart-container">
        <div className="loading-indicator">Loading your cart...</div>
      </div>
    );
  }

  // STEP 3: Order Confirmation
  if (step === "confirmed" && placedOrder) {
    return (
      <div className="cart-container">
        <div className="order-confirmed-card">
          <div className="confirmed-icon">🎉</div>
          <h1>Order Placed Successfully!</h1>
          <p className="confirmed-subtitle">
            Thank you for shopping with CarKit. Your order has been registered as <strong>Pending</strong>.
          </p>

          <div className="confirmed-details">
            <div className="confirmed-row">
              <span>Order Number:</span>
              <strong>#{placedOrder.OrderID}</strong>
            </div>
            <div className="confirmed-row">
              <span>Total Amount:</span>
              <strong>${Number(placedOrder.total || 0).toFixed(2)}</strong>
            </div>
            <div className="confirmed-row">
              <span>Fulfillment:</span>
              <strong>{fulfillment === "delivery" ? "🚚 Delivery" : "🏪 In-Store Pickup"}</strong>
            </div>
            <div className="confirmed-row">
              <span>Payment Method:</span>
              <strong style={{ color: "#16a34a" }}>💵 Cash Only ({fulfillment === "delivery" ? "Pay upon Delivery" : "Pay at Pickup"})</strong>
            </div>
            <div className="confirmed-row">
              <span>Contact Phone:</span>
              <strong>{phone}</strong>
            </div>
            {fulfillment === "delivery" && (
              <div className="confirmed-row">
                <span>Shipping Address:</span>
                <strong>{address}</strong>
              </div>
            )}
          </div>

          <div style={{ marginTop: "28px", display: "flex", gap: "12px", justifyContent: "center" }}>
            <button className="admin-btn primary" onClick={() => (window.location.href = "/")}>
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      {/* Header */}
      <div className="cart-header">
        <div>
          <h1>{step === "checkout" ? "Checkout & Details" : "Shopping Cart"}</h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "0.95rem" }}>
            {step === "checkout"
              ? "Complete your shipping and contact information below"
              : `Review products in your cart (${cart.items.length} items)`}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {step === "checkout" && (
            <button className="admin-btn secondary" onClick={() => setStep("cart")}>
              ← Back to Cart
            </button>
          )}
          <a className="admin-btn secondary" href="/">
            Store Catalog
          </a>
        </div>
      </div>

      {error && <div className="error-message">⚠️ {error}</div>}

      {/* Empty State */}
      {cart.items.length === 0 && step === "cart" ? (
        <div className="no-results">
          <h3>Your cart is empty</h3>
          <p>Explore our wide range of car parts and accessories to place an order.</p>
          <a className="admin-btn primary" href="/" style={{ marginTop: "16px", display: "inline-block" }}>
            Browse Accessories
          </a>
        </div>
      ) : step === "cart" ? (
        /* STEP 1: CART ITEMS VIEW */
        <>
          <div className="cart-list">
            {cart.items.map((item) => (
              <div className="cart-row" key={item.CartItemID}>
                <div className="cart-product">
                  <div className="cart-image">
                    {getImageUrl(item.ImageUrl) ? (
                      <img src={getImageUrl(item.ImageUrl)} alt={item.Name} />
                    ) : (
                      <span>Car Part</span>
                    )}
                  </div>
                  <div>
                    <h2>{item.Name}</h2>
                    <p>${Number(item.Price).toFixed(2)} each</p>
                    <p style={{ color: Number(item.Stock) <= 3 ? "#b45309" : "#64748b" }}>
                      {item.Stock} available in stock
                    </p>
                  </div>
                </div>

                <div className="cart-quantity">
                  <button
                    disabled={updatingId === item.CartItemID || item.Quantity <= 1}
                    onClick={() => updateQuantity(item, item.Quantity - 1)}
                    title="Decrease quantity"
                  >
                    -
                  </button>
                  <span>{item.Quantity}</span>
                  <button
                    disabled={updatingId === item.CartItemID || item.Quantity >= item.Stock}
                    onClick={() => updateQuantity(item, item.Quantity + 1)}
                    title="Increase quantity"
                  >
                    +
                  </button>
                </div>

                <strong>${Number(item.Subtotal).toFixed(2)}</strong>

                <button
                  className="action-btn delete"
                  disabled={updatingId === item.CartItemID}
                  onClick={() => removeItem(item)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div>
              <span>Subtotal:</span>
              <strong>${Number(cart.total).toFixed(2)}</strong>
            </div>
            <button
              className="admin-btn primary"
              style={{ padding: "14px 28px", fontSize: "1.05rem" }}
              onClick={() => setStep("checkout")}
            >
              Proceed to Checkout →
            </button>
          </div>
        </>
      ) : (
        /* STEP 2: CHECKOUT DETAILS PAGE */
        <div className="checkout-layout">
          {/* Left: Fulfillment & Contact Form */}
          <form onSubmit={handlePlaceOrder} className="checkout-form-card">
            <h2>1. Fulfillment Method</h2>
            <div className="fulfillment-options">
              <label
                className={`fulfillment-card ${fulfillment === "delivery" ? "selected" : ""}`}
                onClick={() => setFulfillment("delivery")}
              >
                <input
                  type="radio"
                  name="fulfillment"
                  value="delivery"
                  checked={fulfillment === "delivery"}
                  onChange={() => setFulfillment("delivery")}
                />
                <div className="fulfillment-details">
                  <strong>🚚 Home / Workshop Delivery</strong>
                  <p>Delivered directly to your address. Payment collected in cash upon arrival.</p>
                </div>
              </label>

              <label
                className={`fulfillment-card ${fulfillment === "pickup" ? "selected" : ""}`}
                onClick={() => setFulfillment("pickup")}
              >
                <input
                  type="radio"
                  name="fulfillment"
                  value="pickup"
                  checked={fulfillment === "pickup"}
                  onChange={() => setFulfillment("pickup")}
                />
                <div className="fulfillment-details">
                  <strong>🏪 In-Store Pickup</strong>
                  <p>Pick up at CarKit Headquarters (123 CarKit Ave, Auto City). Cash at counter.</p>
                </div>
              </label>
            </div>

            <h2 style={{ marginTop: "28px" }}>2. Contact & Delivery Details</h2>

            {fulfillment === "delivery" && (
              <div className="form-group" style={{ marginBottom: "16px" }}>
                <label>
                  Delivery Address <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Street, Building, Apartment, City"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
              </div>
            )}

            {fulfillment === "pickup" && (
              <div className="pickup-info-box" style={{ marginBottom: "16px" }}>
                📍 <strong>Pickup Location:</strong> CarKit Store & Workshop, 123 CarKit Ave, Suite 400, Auto City.
                <br />
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Hours: Mon - Sat: 9:00 AM - 7:00 PM</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label>
                Contact Phone Number <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="tel"
                placeholder="e.g. +1 555-0199 or 03-123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>Order Notes / Special Instructions (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Call before delivery, car license plate, etc."
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
              />
            </div>

            <h2>3. Payment Method</h2>
            <div className="cash-payment-badge">
              <div className="cash-icon">💵</div>
              <div>
                <strong>Cash Payment Only</strong>
                <p>
                  {fulfillment === "delivery"
                    ? "Pay in cash to the delivery courier when your items are handed over."
                    : "Pay in cash at the store counter when picking up your order."}
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="admin-btn primary place-order-btn"
              disabled={updatingId === "checkout"}
            >
              {updatingId === "checkout" ? "Submitting Order..." : `Confirm & Place Order ($${Number(cart.total).toFixed(2)})`}
            </button>
          </form>

          {/* Right: Order Summary */}
          <div className="checkout-summary-card">
            <h3>Order Summary</h3>
            <div className="checkout-items-list">
              {cart.items.map((item) => (
                <div key={item.CartItemID} className="checkout-item-row">
                  <div className="checkout-item-title">
                    <span>{item.Name}</span>
                    <small>Qty: {item.Quantity} × ${Number(item.Price).toFixed(2)}</small>
                  </div>
                  <strong>${Number(item.Subtotal).toFixed(2)}</strong>
                </div>
              ))}
            </div>

            <div className="checkout-totals">
              <div className="summary-row">
                <span>Items Subtotal:</span>
                <span>${Number(cart.total).toFixed(2)}</span>
              </div>
              <div className="summary-row">
                <span>Fulfillment Fee:</span>
                <span style={{ color: "#16a34a", fontWeight: "600" }}>Free</span>
              </div>
              <div className="summary-row total-row">
                <span>Total Due:</span>
                <strong>${Number(cart.total).toFixed(2)}</strong>
              </div>
            </div>

            <div className="cash-reminder">
              💵 Please prepare <strong>${Number(cart.total).toFixed(2)}</strong> in cash.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
