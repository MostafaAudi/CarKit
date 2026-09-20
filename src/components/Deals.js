import { useEffect, useState } from "react";
import "./Home.css";

export default function Deals() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:1500/items/items/get")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Could not load deals.")))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message));
  }, []);

  const deals = [...items]
    .filter((item) => Number(item.Quantity) > 0)
    .sort((a, b) => Number(a.Price) - Number(b.Price))
    .slice(0, 8);

  return (
    <main className="home-container" style={{ paddingTop: "48px" }}>
      <section className="filters-section">
        <span className="eyebrow">LIMITED-TIME VALUE</span>
        <h1>Deals & offers</h1>
        <p>Save on selected in-stock accessories, refreshed from our current catalog.</p>
      </section>
      {error && <div className="error-message">{error}</div>}
      {!error && !deals.length && <div className="applied-filter">No deals are available right now. Check back soon.</div>}
      <section className="product-section" id="deals">
        <div className="items-grid">
          {deals.map((item) => (
            <article className="product-card" key={item.ItemID || item.itemid}>
              <div className="product-image-wrap">
                {item.ImageUrl ? <img src={item.ImageUrl.startsWith("http") ? item.ImageUrl : `http://localhost:1500${item.ImageUrl}`} alt={item.Name} className="item-image" /> : <span className="item-image-fallback">DEAL</span>}
              </div>
              <span className="eyebrow">IN STOCK</span>
              <h3>{item.Name}</h3>
              <p>{item.CarModel || "Universal fit"}</p>
              <strong>${Number(item.Price || 0).toFixed(2)}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
