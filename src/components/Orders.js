import { useCallback, useEffect, useState } from "react";
import "./Orders.css";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:1500/orders/order/my", { headers: authHeaders() });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.message || "Could not load your orders.");
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "My Orders - CarKit";
    loadOrders();
  }, [loadOrders]);

  const requestCancellation = async (orderId) => {
    if (!window.confirm("Request cancellation for this order?")) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`http://localhost:1500/orders/order/${orderId}/cancel-request`, {
        method: "PATCH",
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not request cancellation.");
      setMessage("Cancellation request sent. Our team will review it.");
      loadOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <main className="orders-page"><p>Loading your orders...</p></main>;

  return (
    <main className="orders-page">
      <div className="orders-heading">
        <div><span className="orders-eyebrow">CARKIT ACCOUNT</span><h1>My Orders</h1><p>Track your orders and request cancellation while they are pending.</p></div>
        <a className="orders-button secondary" href="/">Continue shopping</a>
      </div>
      {message && <div className="orders-notice success">{message}</div>}
      {error && <div className="orders-notice error">{error}</div>}
      {!orders.length ? <div className="orders-empty">You have not placed any orders yet.</div> : (
        <div className="orders-list">
          {orders.map((order) => {
            const status = String(order.OrderStatus || "Pending").toLowerCase();
            const canRequest = status === "pending";
            return (
              <article className="order-card" key={order.OrderID}>
                <div><span className="order-label">Order</span><strong>#{order.OrderID}</strong></div>
                <div><span className="order-label">Placed</span><span>{new Date(order.OrderDate).toLocaleDateString()}</span></div>
                <div><span className="order-label">Total</span><strong>${Number(order.Total || 0).toFixed(2)}</strong></div>
                <div><span className="order-label">Status</span><span className={`order-status ${status.replaceAll(" ", "-")}`}>{order.OrderStatus || "Pending"}</span></div>
                {canRequest && <button className="orders-button danger" onClick={() => requestCancellation(order.OrderID)}>Request cancellation</button>}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
