import { getImageUrl } from "../utils/api";
import "./OrderDetails.css";

export default function OrderDetails({ details }) {
  if (!details) return null;

  const { order, items = [] } = details;
  return (
    <div className="order-details">
      <div className="order-details-header">
        <div>
          <span className="order-details-kicker">ORDER CONTENTS</span>
          <strong>Order #{order.OrderID}</strong>
        </div>
        <span className="order-details-count">{items.length} {items.length === 1 ? "product" : "products"}</span>
      </div>
      <div className="order-details-address">
        <span className="order-details-label">Delivery</span>
        <span>{order.ShippingAddress || "In-store pickup"}</span>
      </div>
      <div className="order-products">
        {items.length === 0 ? (
          <span className="order-details-empty">No products were recorded for this order.</span>
        ) : (
          items.map((item) => (
            <div className="order-product" key={item.OrderItemID}>
              <div className="order-product-image">
              {getImageUrl(item.ImageUrl) && (
                <img src={getImageUrl(item.ImageUrl)} alt="" />
              )}
              {!getImageUrl(item.ImageUrl) && <span className="order-product-placeholder">CK</span>}
              </div>
              <div className="order-product-info">
                <strong>{item.Name || `Product #${item.ItemID}`}</strong>
                <span>{item.CarModel || "Universal fit"} · Qty {item.Quantity}</span>
              </div>
              <span className="order-product-total">${Number(item.LineTotal || 0).toFixed(2)}</span>
            </div>
          ))
        )}
      </div>
      <div className="order-details-total">
        <span>Order total</span>
        <strong>${Number(order.Total || 0).toFixed(2)}</strong>
      </div>
    </div>
  );
}
