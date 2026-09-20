import { useState, useEffect } from "react";
import "./Home.css";

export default function Home() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [carModelFilter, setCarModelFilter] = useState("");

  // Fetch items and categories from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch categories
        try {
          const catRes = await fetch("http://localhost:1500/categories/cat/get");
          if (catRes.ok) {
            const catData = await catRes.json();
            setCategories(Array.isArray(catData) ? catData : []);
          } else {
            console.warn("Categories endpoint returned status:", catRes.status);
          }
        } catch (catErr) {
          console.warn("Could not load categories from backend:", catErr.message);
        }

        // Fetch items
        const itemsRes = await fetch("http://localhost:1500/items/items/get");
        if (itemsRes.ok) {
          const itemsData = await itemsRes.json();
          setItems(Array.isArray(itemsData) ? itemsData : []);
        } else if (itemsRes.status === 404) {
          setItems([]);
        } else {
          throw new Error(`Failed to fetch items. Server returned code ${itemsRes.status}`);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Could not retrieve data from the backend. Please check if the backend server is running on port 1500.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = () => {
    setSubmittedSearch(searchTerm.trim());
  };

  const getCategoryName = (id) => {
    const found = categories.find(
      (category) => String(category.categoryid) === String(id)
    );
    return found ? found.categoryname : "Accessories";
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    return imageUrl.startsWith("http") ? imageUrl : `http://localhost:1500${imageUrl}`;
  };

  const handleAddToCart = async (item) => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    if (Number(item.Quantity) < 1) {
      setError("This product is out of stock.");
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      const response = await fetch("http://localhost:1500/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ItemID: item.ItemID || item.itemid, Quantity: 1 }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Could not add product to cart.");
        return;
      }
      setSuccess(`${item.Name} added to cart.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError("Could not connect to the cart service.");
    }
  };

  // The text search matches product names only. Category filtering is handled separately below.
  const filteredItems = items.filter((item) => {
    const matchesSearch = submittedSearch
      ? getItemName(item).toLowerCase().includes(submittedSearch.toLowerCase())
      : true;

    const matchesCategory =
      selectedCategory === "All"
        ? true
        : String(item.categoryid) === String(selectedCategory);

    const matchesCarModel = carModelFilter
      ? getCarModel(item).toLowerCase().includes(carModelFilter.toLowerCase())
      : true;

    return matchesSearch && matchesCategory && matchesCarModel;
  });

  const featuredItems = items.slice(0, 4);
  const displayItems = submittedSearch || selectedCategory !== "All" || carModelFilter
    ? filteredItems
    : featuredItems;

  return (
    <div className="home-container">
      <header className="hero-section">
        <div className="hero-content">
          <span className="eyebrow">CARKIT PERFORMANCE SYSTEMS</span>
          <h1>Upgrade<br /><em>Your Drive.</em></h1>
          <p>Premium car kits and accessories for comfort, safety and performance.</p>
          <div className="hero-actions">
            <a className="hero-btn primary" href="#featured-products">Shop Car Kits</a>
            <a className="hero-btn secondary" href="#categories">Explore Accessories</a>
          </div>
          <div className="hero-benefits">
            <span>◈ Premium Quality</span>
            <span>◉ Easy Installation</span>
            <span>◇ Perfect Fit</span>
          </div>
        </div>
      </header>

      <section className="filters-section">
        <div className="filter-title"><span className="eyebrow">FIND YOUR PERFECT SETUP</span><h2>Search the collection</h2></div>
        <div className="search-filters">
          {/* Item Name Search */}
          <div className="search-wrapper">
            <label htmlFor="search-input">Search Products</label>
            <div className="search-input-group">
              <input
                id="search-input"
                type="text"
                placeholder="Search by product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button className="Searchbutton" type="button" onClick={handleSearch}>
                🔍 Search
              </button>
            </div>
          </div>

          {/* Car Model Compatibility Search */}
          <div className="model-wrapper">
            <label htmlFor="model-input">Filter by Car Model</label>
            <input
              id="model-input"
              className="filter-input"
              type="text"
              placeholder="e.g. BMW, Honda Civic, Toyota"
              value={carModelFilter}
              onChange={(e) => setCarModelFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Category filter tabs */}
        <div className="category-tabs-container">
          <span className="category-tabs-label">Search by Category:</span>
          <div className="category-tabs">
            <button
              className={`category-btn ${selectedCategory === "All" ? "active" : ""}`}
              onClick={() => setSelectedCategory("All")}
            >
              All Products
            </button>
            {categories.map((cat) => (
              <button
                key={cat.categoryid}
                className={`category-btn ${selectedCategory === String(cat.categoryid) ? "active" : ""}`}
                onClick={() => setSelectedCategory(String(cat.categoryid))}
              >
                {cat.categoryname}
              </button>
            ))}
          </div>
        </div>
      </section>

      {submittedSearch && (
        <div className="applied-filter">
          Showing results for: <strong>"{submittedSearch}"</strong>{" "}
          <button
            style={{
              background: "none",
              border: "none",
              color: "#0366d6",
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
              marginLeft: "8px",
            }}
            onClick={() => {
              setSearchTerm("");
              setSubmittedSearch("");
            }}
          >
            Clear Search
          </button>
        </div>
      )}

      {error && <div className="error-message">⚠️ {error}</div>}
      {success && <div className="success-message">{success}</div>}

      <section className="product-section" id="featured-products">
        <div className="section-heading">
          <div><span className="eyebrow">ENGINEERED FOR THE ROAD</span><h2>Featured Products</h2></div>
          <a href="#catalog" className="view-all-link">View all products →</a>
        </div>
        {loading ? (
          <div className="loading-indicator">Loading premium accessories...</div>
        ) : (
          <div className="items-grid" id="catalog">
            {displayItems.length ? displayItems.map((item) => (
              <ProductCard key={item.ItemID || item.itemid} item={item} getCategoryName={getCategoryName} getImageUrl={getImageUrl} handleAddToCart={handleAddToCart} />
            )) : <div className="no-results"><h3>No products found</h3><p>Try another category, search term, or vehicle model.</p></div>}
          </div>
        )}
      </section>

      <section className="compatibility-section">
        <div className="compatibility-copy"><span className="eyebrow">BUILT AROUND YOUR VEHICLE</span><h2>Find the right kit for your car</h2><p>Select your vehicle to see compatible products.</p></div>
        <div className="compatibility-form">
          <select defaultValue=""><option value="" disabled>Select Make</option><option>BMW</option><option>Honda</option><option>Toyota</option></select>
          <select defaultValue=""><option value="" disabled>Select Model</option><option>3 Series</option><option>Civic</option><option>Camry</option></select>
          <select defaultValue=""><option value="" disabled>Select Year</option><option>2024</option><option>2023</option><option>2022</option></select>
          <button className="hero-btn primary" type="button" onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })}>Find Kits</button>
        </div>
      </section>

      <section className="benefits-bar">
        {[
          ["◈", "Vehicle Compatibility", "Kits designed for your car"],
          ["⌁", "Easy Installation", "Plug & play, no hassle"],
          ["▱", "Fast Shipping", "Free over $99"],
          ["◇", "Warranty", "2 years protection"],
          ["▣", "Secure Payment", "100% secure checkout"],
        ].map(([icon, title, text]) => <div className="benefit" key={title}><b>{icon}</b><span><strong>{title}</strong><small>{text}</small></span></div>)}
      </section>

      <section className="reviews-section">
        <div className="section-heading centered"><div><span className="eyebrow">DRIVEN BY TRUST</span><h2>What our customers say</h2></div></div>
        <div className="reviews-grid">
          {[
            ["The installation was super easy and the quality is amazing. Highly recommend!", "Michael R."],
            ["Best upgrade I have done to my car. CarPlay works flawlessly!", "Jason T."],
            ["Great customer service and fast shipping. Will definitely buy again.", "David L."],
          ].map(([quote, name]) => <article className="review-card" key={name}><div className="stars">★★★★★</div><p>“{quote}”</p><strong>● {name}</strong></article>)}
        </div>
      </section>

      <section className="newsletter-section">
        <div><span className="eyebrow">STAY AHEAD OF THE CURVE</span><h2>Stay in the driver's seat</h2><p>Get the latest deals, new products and exclusive offers.</p></div>
        <form onSubmit={(event) => event.preventDefault()}><input type="email" placeholder="Enter your email" required /><button className="hero-btn primary" type="submit">Subscribe</button></form>
      </section>

      <footer className="site-footer">
        <div><strong className="footer-logo">CAR<span>KIT</span></strong><p>Premium car kits and accessories<br />for a smarter, safer drive.</p></div>
        <div><b>Shop</b><a href="#catalog">Car Kits</a><a href="#categories">Accessories</a><a href="#catalog">Dash Cams</a></div>
        <div><b>Support</b><a href="/contact">Contact Us</a><a href="/contact">Installation Help</a><a href="/contact">Warranty</a></div>
        <div><b>Company</b><a href="/about">About Us</a><a href="/about">Reviews</a><a href="/contact">Careers</a></div>
        <div><b>Contact Us</b><span>+1 (555) 123-4567</span><span>support@carkit.com</span><span>123 Auto Drive, Los Angeles</span></div>
      </footer>

    </div>
  );
}

function ProductCard({ item, getCategoryName, getImageUrl, handleAddToCart }) {
  const quantity = Number(item.Quantity);
  return (
    <article className="item-card">
      <div className="item-image-placeholder">
        {getImageUrl(item.ImageUrl) ? <img src={getImageUrl(item.ImageUrl)} alt={getItemName(item)} className="item-image" /> : <span className="item-image-fallback">CARKIT</span>}
        <span className="product-badge">FEATURED</span>
      </div>
      <div className="item-info">
        <div className="item-meta"><span className="item-category-badge">{getCategoryName(item.categoryid)}</span><span className="item-price">${Number(item.Price).toFixed(2)}</span></div>
        <h2 className="item-name">{getItemName(item)}</h2>
        <p className="item-spec">{getCarModel(item) || "Universal fitment"}</p>
        <div className="rating"><span>★★★★★</span> <small>Premium fitment</small></div>
        <p className={`item-status ${quantity > 0 ? (quantity < 5 ? "status-low-stock" : "status-in-stock") : "status-out-of-stock"}`}>
          {quantity > 0 ? `${quantity < 5 ? "Low stock · " : ""}${quantity} available` : "Out of stock"}
        </p>
        <button type="button" className="cart-add-btn" disabled={quantity < 1} onClick={() => handleAddToCart(item)}>{quantity < 1 ? "Out of Stock" : "Add to Cart  →"}</button>
      </div>
    </article>
  );
}

function getItemName(item) {
  return item.Name || item.name || item.ItemName || "Automotive accessory";
}

function getCarModel(item) {
  return item.CarModel || item.carmodel || item.CarModelName || "";
}
