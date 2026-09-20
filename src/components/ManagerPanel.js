import { Fragment, useCallback, useEffect, useState } from "react";
import "./ManagerPanel.css";
import { authenticatedFetch } from "../utils/api";
import OrderDetails from "./OrderDetails";

const getAuthHeaders = (includeJson = false) => {
  const token = localStorage.getItem("token");
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getRole = (user = {}) => {
  const roleValues = [user.RoleeName, user.RoleName, user.role, user.RoleeID]
    .filter((role) => role !== undefined && role !== null)
    .map((role) => String(role).trim().toLowerCase());

  if (roleValues.some((role) => ["admin", "administrator", "1"].includes(role))) {
    return "admin";
  }

  if (roleValues.some((role) => ["manager", "staff", "3"].includes(role))) {
    return "manager";
  }

  return roleValues[0] || "";
};

const isManagerOrAdmin = (user = {}) => {
  const role = getRole(user);
  return ["manager", "staff", "3", "admin", "administrator", "1"].includes(role);
};

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  return imageUrl.startsWith("http") ? imageUrl : `http://localhost:1500${imageUrl}`;
};

const isDoneOrder = (order = {}) =>
  ["done", "completed", "picked up", "pickedup"].includes(String(order.OrderStatus || "").toLowerCase());

const isPendingOrder = (order = {}) =>
  String(order.OrderStatus || "Pending").toLowerCase() === "pending";

export default function ManagerPanel() {
  const [activeTab, setActiveTab] = useState("overview"); // overview, products, categories, orders, customers, inventory
  const [currentUser, setCurrentUser] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Data states
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [orderDetails, setOrderDetails] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Product forms
  const [newItem, setNewItem] = useState({
    Name: "",
    Price: "",
    Quantity: "",
    CarModel: "",
    categoryid: "",
  });
  const [newItemImage, setNewItemImage] = useState(null);
  const [newItemPreview, setNewItemPreview] = useState(null);

  const [newCategory, setNewCategory] = useState({
    categoryname: "",
  });

  const [editingItem, setEditingItem] = useState(null);
  const [editingItemImage, setEditingItemImage] = useState(null);
  const [editingItemPreview, setEditingItemPreview] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch customers independently so a failure in another dashboard section
      // cannot prevent managers from opening the customer list.
      const custRes = await authenticatedFetch("http://localhost:1500/customers/cust/get", {
        headers: getAuthHeaders(),
      });
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(Array.isArray(custData) ? custData : []);
      } else if (custRes.status === 404) {
        setCustomers([]);
      } else {
        const data = await custRes.json().catch(() => ({}));
        throw new Error(data.message || "Unable to load customers.");
      }

      // Fetch the remaining dashboard sections.
      const itemsRes = await authenticatedFetch("http://localhost:1500/items/items/get", {
        headers: getAuthHeaders(),
      });
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(Array.isArray(itemsData) ? itemsData : []);
      } else {
        const data = await itemsRes.json().catch(() => ({}));
        throw new Error(data.message || "Unable to load products.");
      }

      // 2. Fetch Categories
      const catRes = await authenticatedFetch("http://localhost:1500/categories/cat/get", {
        headers: getAuthHeaders(),
      });
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
      } else {
        const data = await catRes.json().catch(() => ({}));
        throw new Error(data.message || "Unable to load categories.");
      }

      // Fetch orders.
      const ordRes = await authenticatedFetch("http://localhost:1500/orders/order/get", {
        headers: getAuthHeaders(),
      });
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(Array.isArray(ordData) ? ordData : []);
      } else {
        const data = await ordRes.json().catch(() => ({}));
        throw new Error(data.message || "Unable to load orders.");
      }
    } catch (err) {
      console.error("Error loading manager data:", err);
      setError(err instanceof Error ? err.message : "Unable to load manager data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Manager Panel - CarKit";
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (!storedUser || !storedToken) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      if (!isManagerOrAdmin(user)) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      setCurrentUser(user);
    } catch (e) {
      console.error(e);
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    fetchAllData();
  }, [fetchAllData]);

  const showNotification = (msg, isSuccess = true) => {
    if (isSuccess) {
      setSuccess(msg);
      setError(null);
    } else {
      setError(msg);
      setSuccess(null);
    }
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 4000);
  };

  const validateImage = (file) => {
    if (!file) return true;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      showNotification("Invalid image format. Only JPG, PNG, WEBP, and GIF are allowed.", false);
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      showNotification("Image size too large. Maximum size is 5MB.", false);
      return false;
    }
    return true;
  };

  const handleNewItemImageChange = (file) => {
    if (!validateImage(file)) return;
    setNewItemImage(file || null);
    setNewItemPreview(file ? URL.createObjectURL(file) : null);
  };

  const openEditItem = (item) => {
    setEditingItem(item);
    setEditingItemImage(null);
    setEditingItemPreview(getImageUrl(item.ImageUrl));
  };

  const handleEditItemImageChange = (file) => {
    if (!validateImage(file)) return;
    setEditingItemImage(file || null);
    setEditingItemPreview(file ? URL.createObjectURL(file) : getImageUrl(editingItem?.ImageUrl));
  };

  // Add Product
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.Name || !newItem.Price || !newItem.Quantity || !newItem.CarModel) {
      showNotification("Please fill in all required product fields.", false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("Name", newItem.Name.trim());
      formData.append("Price", Number.parseFloat(newItem.Price));
      formData.append("Quantity", Number.parseInt(newItem.Quantity, 10));
      formData.append("CarModel", newItem.CarModel.trim());
      if (newItem.categoryid) formData.append("categoryid", Number.parseInt(newItem.categoryid, 10));
      if (newItemImage) formData.append("image", newItemImage);

      const res = await authenticatedFetch("http://localhost:1500/items/items/add", {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        showNotification("Product added successfully!");
        setNewItem({ Name: "", Price: "", Quantity: "", CarModel: "", categoryid: "" });
        setNewItemImage(null);
        setNewItemPreview(null);
        fetchAllData();
      } else {
        showNotification(data.message || "Failed to add product.", false);
      }
    } catch (err) {
      showNotification("Error connecting to server.", false);
    }
  };

  // Edit Product
  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const formData = new FormData();
      formData.append("Name", editingItem.Name);
      formData.append("Price", Number.parseFloat(editingItem.Price));
      formData.append("Quantity", Number.parseInt(editingItem.Quantity, 10));
      formData.append("CarModel", editingItem.CarModel);
      if (editingItem.categoryid) formData.append("categoryid", Number.parseInt(editingItem.categoryid, 10));
      if (editingItemImage) formData.append("image", editingItemImage);

      const res = await authenticatedFetch(`http://localhost:1500/items/items/update/${editingItem.ItemID || editingItem.itemid}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        showNotification("Product updated successfully!");
        setEditingItem(null);
        setEditingItemImage(null);
        setEditingItemPreview(null);
        fetchAllData();
      } else {
        showNotification(data.message || "Failed to update product.", false);
      }
    } catch (err) {
      showNotification("Error updating product.", false);
    }
  };

  // Delete Product (with confirmation warning)
  const handleDeleteItem = async (id) => {
    if (!window.confirm("⚠️ Manager Action: Are you sure you want to delete this product?")) return;
    try {
      const res = await authenticatedFetch(`http://localhost:1500/items/items/delete/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        showNotification("Product deleted successfully!");
        fetchAllData();
      } else {
        showNotification("Failed to delete product.", false);
      }
    } catch (err) {
      showNotification("Error deleting product.", false);
    }
  };

  // Add Category
  const handleAddCategory = async (e) => {
    e.preventDefault();
    const categoryname = newCategory.categoryname.trim();
    if (!categoryname) {
      showNotification("Please enter a category name.", false);
      return;
    }

    try {
      const res = await authenticatedFetch("http://localhost:1500/categories/cat/add", {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ categoryname }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showNotification("Category added successfully!");
        setNewCategory({ categoryname: "" });
        fetchAllData();
      } else {
        showNotification(data.message || "Failed to add category.", false);
      }
    } catch (err) {
      showNotification("Unable to connect to the server while adding the category.", false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await authenticatedFetch(`http://localhost:1500/categories/cat/delete/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        showNotification(data.message || "Category and products deleted successfully!");
        fetchAllData();
      } else {
        const data = await res.json().catch(() => ({}));
        showNotification(data.message || "Failed to delete category.", false);
      }
    } catch (err) {
      showNotification("Error deleting category.", false);
    }
  };

  // Mark Order as Done (Pending -> Done)
  const handleMarkDone = async (id) => {
    try {
      const res = await authenticatedFetch(`http://localhost:1500/orders/order/${id}/done`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showNotification("Order marked as Done / Picked Up.");
        fetchAllData();
      } else {
        showNotification(data.message || "Failed to update order status.", false);
      }
    } catch (err) {
      showNotification("Error updating order status.", false);
    }
  };

  const handleCancelOrder = async (id) => {
    if (!window.confirm("Cancel this order and return its items to inventory?")) return;
    try {
      const res = await authenticatedFetch(`http://localhost:1500/orders/order/${id}/cancel`, { method: "PATCH", headers: getAuthHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to cancel order.");
      showNotification("Order cancelled and inventory restored.");
      fetchAllData();
    } catch (err) {
      showNotification(err.message || "Error cancelling order.", false);
    }
  };

  const handleViewOrderDetails = async (id) => {
    if (orderDetails[id]) {
      setOrderDetails((current) => ({ ...current, [id]: null }));
      return;
    }
    try {
      const response = await authenticatedFetch(`http://localhost:1500/orders/order/details/${id}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not load order details.");
      setOrderDetails((current) => ({ ...current, [id]: data }));
    } catch (err) {
      showNotification(err.message, false);
    }
  };

  // Calculations
  const pendingOrders = orders.filter(isPendingOrder);
  const doneOrders = orders.filter(isDoneOrder);
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.Total) || 0), 0);
  const lowStockItems = items.filter((i) => Number(i.Quantity) <= 5);

  const filteredItems = items.filter((i) =>
    (i.Name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.CarModel || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "pending") return isPendingOrder(o);
    if (orderFilter === "done") return isDoneOrder(o);
    return true;
  });

  if (accessDenied) {
    return (
      <div className="admin-container">
        <div className="error-message" style={{ margin: "50px auto", maxWidth: "500px", textAlign: "center" }}>
          <h2>Access Denied</h2>
          <p>You must be logged in as a Manager to access this panel.</p>
          <button className="admin-btn primary" onClick={() => (window.location.href = "/login")}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>💼 Manager Panel</h1>
          <p className="admin-subtitle">Store Operations, Catalog & Order Management</p>
        </div>
        <div className="admin-user-info">
          <span>Logged in as: <strong>{currentUser?.Username || "Manager"}</strong> (Manager)</span>
          <button
            className="admin-logout-btn"
            onClick={() => {
              localStorage.removeItem("token");
              localStorage.removeItem("user");
              window.location.href = "/login";
            }}
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Navigation Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Dashboard
        </button>
        <button
          className={`admin-tab-btn ${activeTab === "products" ? "active" : ""}`}
          onClick={() => setActiveTab("products")}
        >
          📦 Products ({items.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === "categories" ? "active" : ""}`}
          onClick={() => setActiveTab("categories")}
        >
          🏷️ Categories ({categories.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          🛒 Orders ({orders.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === "inventory" ? "active" : ""}`}
          onClick={() => setActiveTab("inventory")}
        >
          📋 Stock & Inventory
        </button>
        <button
          className={`admin-tab-btn ${activeTab === "customers" ? "active" : ""}`}
          onClick={() => setActiveTab("customers")}
        >
          👥 View Customers ({customers.length})
        </button>
      </div>

      {/* Content Area */}
      <div className="admin-tab-content">
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>Loading manager dashboard...</div>
        ) : (
          <>
            {/* 1. OVERVIEW / DASHBOARD */}
            {activeTab === "overview" && (
              <div>
                <div className="stats-grid">
                  <div className="stat-card" onClick={() => setActiveTab("products")}>
                    <span className="stat-icon">📦</span>
                    <div className="stat-details">
                      <h3>Total Products</h3>
                      <p className="stat-number">{items.length}</p>
                    </div>
                  </div>
                  <div className="stat-card" onClick={() => setActiveTab("categories")}>
                    <span className="stat-icon">🏷️</span>
                    <div className="stat-details">
                      <h3>Categories</h3>
                      <p className="stat-number">{categories.length}</p>
                    </div>
                  </div>
                  <div className="stat-card" onClick={() => setActiveTab("orders")}>
                    <span className="stat-icon">⏳</span>
                    <div className="stat-details">
                      <h3>Pending Orders</h3>
                      <p className="stat-number" style={{ color: "#d97706" }}>{pendingOrders.length}</p>
                    </div>
                  </div>
                  <div className="stat-card" onClick={() => setActiveTab("orders")}>
                    <span className="stat-icon">✅</span>
                    <div className="stat-details">
                      <h3>Picked Up / Done</h3>
                      <p className="stat-number" style={{ color: "#16a34a" }}>{doneOrders.length}</p>
                    </div>
                  </div>
                  <div className="stat-card" onClick={() => setActiveTab("orders")}>
                    <span className="stat-icon">🧾</span>
                    <div className="stat-details">
                      <h3>Total Orders</h3>
                      <p className="stat-number">{orders.length}</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-icon">💰</span>
                    <div className="stat-details">
                      <h3>Total Revenue</h3>
                      <p className="stat-number">${totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="quick-actions-card" style={{ marginTop: "24px" }}>
                  <h3>Manager Quick Actions</h3>
                  <div className="quick-actions-buttons">
                    <button className="admin-btn primary" onClick={() => setActiveTab("products")}>
                      ➕ Add New Product
                    </button>
                    <button className="admin-btn secondary" onClick={() => setActiveTab("categories")}>
                      🏷️ Manage Categories
                    </button>
                    <button className="admin-btn secondary" onClick={() => setActiveTab("orders")}>
                      🛒 Process Orders ({pendingOrders.length} Pending)
                    </button>
                    <button className="admin-btn secondary" onClick={fetchAllData}>
                      🔄 Refresh Data
                    </button>
                  </div>
                </div>

                {lowStockItems.length > 0 && (
                  <div className="admin-form-card" style={{ marginTop: "24px", borderLeft: "4px solid #ef4444" }}>
                    <h3 style={{ color: "#ef4444" }}>⚠️ Low Stock Alert ({lowStockItems.length} items)</h3>
                    <p style={{ marginBottom: "12px", color: "#666" }}>The following products have 5 or fewer items remaining in stock:</p>
                    <div className="admin-table-container">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Car Model</th>
                            <th>Price</th>
                            <th>Stock Remaining</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowStockItems.map((item) => (
                            <tr key={item.ItemID || item.itemid}>
                              <td><strong>{item.Name}</strong></td>
                              <td>{item.CarModel}</td>
                              <td>${Number(item.Price).toFixed(2)}</td>
                              <td>
                                <span className="stock-badge out-of-stock">{item.Quantity} left</span>
                              </td>
                              <td>
                                <button className="action-btn edit" onClick={() => openEditItem(item)}>
                                  Restock
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. PRODUCTS TAB */}
            {activeTab === "products" && (
              <div>
                <div className="admin-form-card">
                  <h3>Add New Product</h3>
                  <form onSubmit={handleAddItem} className="admin-inline-form">
                    <input
                      type="text"
                      placeholder="Product Name"
                      value={newItem.Name}
                      onChange={(e) => setNewItem({ ...newItem, Name: e.target.value })}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Price ($)"
                      step="0.01"
                      value={newItem.Price}
                      onChange={(e) => setNewItem({ ...newItem, Price: e.target.value })}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Stock Quantity"
                      value={newItem.Quantity}
                      onChange={(e) => setNewItem({ ...newItem, Quantity: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Car Model (e.g. Universal, BMW E46)"
                      value={newItem.CarModel}
                      onChange={(e) => setNewItem({ ...newItem, CarModel: e.target.value })}
                      required
                    />
                    <select
                      value={newItem.categoryid}
                      onChange={(e) => setNewItem({ ...newItem, categoryid: e.target.value })}
                    >
                      <option value="">Select Category</option>
                      {categories.map((c) => (
                        <option key={c.categoryid} value={c.categoryid}>
                          {c.categoryname}
                        </option>
                      ))}
                    </select>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: "600" }}>Product Picture:</label>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={(e) => handleNewItemImageChange(e.target.files?.[0])}
                      />
                      {newItemPreview && (
                        <div style={{ marginTop: "6px" }}>
                          <img
                            src={newItemPreview}
                            alt="Preview"
                            style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "6px", border: "1px solid #ccc" }}
                          />
                        </div>
                      )}
                    </div>

                    <button type="submit" className="admin-btn primary">
                      Save Product
                    </button>
                  </form>
                </div>

                <div className="admin-search-bar">
                  <input
                    type="text"
                    placeholder="🔍 Search products by name or car model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Image</th>
                        <th>Product Name</th>
                        <th>Price</th>
                        <th>Stock</th>
                        <th>Car Model</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: "center" }}>No products found.</td>
                        </tr>
                      ) : (
                        filteredItems.map((item) => (
                          <tr key={item.ItemID || item.itemid}>
                            <td>{item.ItemID || item.itemid}</td>
                            <td>
                              {item.ImageUrl ? (
                                <img
                                  src={getImageUrl(item.ImageUrl)}
                                  alt={item.Name}
                                  style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px", border: "1px solid #e5e7eb" }}
                                />
                              ) : (
                                <span style={{ color: "#9ca3af", fontSize: "12px" }}>No image</span>
                              )}
                            </td>
                            <td><strong>{item.Name}</strong></td>
                            <td>${Number(item.Price).toFixed(2)}</td>
                            <td>
                              <span className={`stock-badge ${Number(item.Quantity) > 0 ? "in-stock" : "out-of-stock"}`}>
                                {item.Quantity} in stock
                              </span>
                            </td>
                            <td>{item.CarModel}</td>
                            <td>
                              <button className="action-btn edit" onClick={() => openEditItem(item)} title="Edit Product">
                                ✏️ Edit
                              </button>
                              <button className="action-btn delete" onClick={() => handleDeleteItem(item.ItemID || item.itemid)} title="Delete Product">
                                🗑️ Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. CATEGORIES TAB */}
            {activeTab === "categories" && (
              <div>
                <div className="admin-form-card">
                  <h3>Add New Category</h3>
                  <form onSubmit={handleAddCategory} className="admin-inline-form">
                    <input
                      type="text"
                      placeholder="Category Name"
                      value={newCategory.categoryname}
                      onChange={(e) => setNewCategory({ categoryname: e.target.value })}
                      required
                    />
                    <button type="submit" className="admin-btn primary">
                      Add Category
                    </button>
                  </form>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Category ID</th>
                        <th>Category Name</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat) => (
                        <tr key={cat.categoryid}>
                          <td>{cat.categoryid}</td>
                          <td><strong>{cat.categoryname}</strong></td>
                          <td>
                            <button className="action-btn delete" onClick={() => handleDeleteCategory(cat.categoryid)}>
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. ORDERS TAB */}
            {activeTab === "orders" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h2>Order Management</h2>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className={`admin-btn ${orderFilter === "all" ? "primary" : "secondary"}`}
                      onClick={() => setOrderFilter("all")}
                    >
                      All Orders ({orders.length})
                    </button>
                    <button
                      className={`admin-btn ${orderFilter === "pending" ? "primary" : "secondary"}`}
                      onClick={() => setOrderFilter("pending")}
                    >
                      ⏳ Pending ({pendingOrders.length})
                    </button>
                    <button
                      className={`admin-btn ${orderFilter === "done" ? "primary" : "secondary"}`}
                      onClick={() => setOrderFilter("done")}
                    >
                      ✅ Picked Up / Done ({doneOrders.length})
                    </button>
                  </div>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Customer ID</th>
                        <th>Date</th>
                        <th>Total</th>
                        <th>Shipping Address</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: "center" }}>No orders matching filter.</td>
                        </tr>
                      ) : (
                        filteredOrders.map((ord) => {
                          const isDone = isDoneOrder(ord);
                          return (
                            <Fragment key={ord.OrderID}>
                            <tr>
                              <td>#{ord.OrderID}</td>
                              <td>Customer #{ord.CustomerID}</td>
                              <td>{new Date(ord.OrderDate).toLocaleDateString()}</td>
                              <td><strong>${Number(ord.Total).toFixed(2)}</strong></td>
                              <td>{ord.ShippingAddress || "In-store pickup"}</td>
                              <td>
                                <span
                                  className="stock-badge"
                                  style={{
                                    backgroundColor: isDone ? "#dcfce7" : "#fef3c7",
                                    color: isDone ? "#166534" : "#92400e",
                                    fontWeight: "600",
                                  }}
                                >
                                  {String(ord.OrderStatus || "Pending").replace(/\b\w/g, (letter) => letter.toUpperCase())}
                                </span>
                              </td>
                              <td>
                                <button className="admin-btn secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => handleViewOrderDetails(ord.OrderID)}>
                                  {orderDetails[ord.OrderID] ? "Hide products" : "View products"}
                                </button>
                                {!isDone && !["cancelled"].includes(String(ord.OrderStatus || "").toLowerCase()) ? (
                                  <>
                                  {!["cancel requested"].includes(String(ord.OrderStatus || "").toLowerCase()) && <button className="admin-btn primary" style={{ padding: "6px 12px", fontSize: "12px", backgroundColor: "#16a34a" }} onClick={() => handleMarkDone(ord.OrderID)}>Mark as Done</button>}
                                  <button className="admin-btn danger" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => handleCancelOrder(ord.OrderID)}>
                                    {String(ord.OrderStatus || "").toLowerCase() === "cancel requested" ? "Approve Cancel" : "Cancel"}
                                  </button>
                                  </>
                                ) : (
                                  <span style={{ color: String(ord.OrderStatus || "").toLowerCase() === "cancelled" ? "#f87171" : "#16a34a", fontSize: "13px", fontWeight: "600" }}>{String(ord.OrderStatus || "").toLowerCase() === "cancelled" ? "Cancelled" : "Completed"}</span>
                                )}
                              </td>
                            </tr>
                            {orderDetails[ord.OrderID] && (
                              <tr><td colSpan="7"><OrderDetails details={orderDetails[ord.OrderID]} /></td></tr>
                            )}
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. INVENTORY TAB */}
            {activeTab === "inventory" && (
              <div>
                <h2>Stock & Inventory Overview</h2>
                <p style={{ color: "#666", marginBottom: "16px" }}>Track inventory levels across all catalog items.</p>
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Product</th>
                        <th>Car Model</th>
                        <th>Price</th>
                        <th>Current Stock</th>
                        <th>Stock Level</th>
                        <th>Quick Restock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => {
                        const qty = Number(item.Quantity);
                        let levelColor = "#16a34a";
                        let levelText = "Adequate";
                        if (qty === 0) {
                          levelColor = "#dc2626";
                          levelText = "Out of Stock";
                        } else if (qty <= 5) {
                          levelColor = "#ea580c";
                          levelText = "Low Stock";
                        }

                        return (
                          <tr key={item.ItemID || item.itemid}>
                            <td>{item.ItemID || item.itemid}</td>
                            <td><strong>{item.Name}</strong></td>
                            <td>{item.CarModel}</td>
                            <td>${Number(item.Price).toFixed(2)}</td>
                            <td><strong>{qty}</strong> units</td>
                            <td>
                              <span style={{ color: levelColor, fontWeight: "600" }}>
                                {levelText}
                              </span>
                            </td>
                            <td>
                              <button className="action-btn edit" onClick={() => openEditItem(item)}>
                                Update Stock
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 6. CUSTOMERS TAB (Read-Only for Manager) */}
            {activeTab === "customers" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div>
                    <h2>Customer Accounts</h2>
                    <p style={{ color: "#666", fontSize: "13px" }}>
                      🔒 Manager Permission: View-only. Deleting customer accounts is restricted to Admins.
                    </p>
                  </div>
                  <span style={{ backgroundColor: "#f3f4f6", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "600", color: "#4b5563" }}>
                    Total Customers: {customers.length}
                  </span>
                </div>

                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Address</th>
                        <th>Role Permission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((c) => (
                        <tr key={c.CustomerID}>
                          <td>#{c.CustomerID}</td>
                          <td><strong>{c.Name}</strong></td>
                          <td>{c.Email}</td>
                          <td>{c.Phone}</td>
                          <td>{c.Address}</td>
                          <td>
                            <span style={{ color: "#6b7280", fontSize: "13px" }}>
                              {c.RoleeName || "Customer"} (Protected)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit Product Modal */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Edit Product</h2>
            <form onSubmit={handleUpdateItem}>
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  value={editingItem.Name}
                  onChange={(e) => setEditingItem({ ...editingItem, Name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingItem.Price}
                  onChange={(e) => setEditingItem({ ...editingItem, Price: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Quantity in Stock</label>
                <input
                  type="number"
                  value={editingItem.Quantity}
                  onChange={(e) => setEditingItem({ ...editingItem, Quantity: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Car Model Compatibility</label>
                <input
                  type="text"
                  value={editingItem.CarModel}
                  onChange={(e) => setEditingItem({ ...editingItem, CarModel: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  value={editingItem.categoryid || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, categoryid: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.categoryid} value={c.categoryid}>
                      {c.categoryname}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Product Picture</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => handleEditItemImageChange(e.target.files?.[0])}
                />
                {editingItemPreview && (
                  <div style={{ marginTop: "8px" }}>
                    <img
                      src={editingItemPreview}
                      alt="Product Preview"
                      style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "6px", border: "1px solid #ccc" }}
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="admin-btn secondary" onClick={() => setEditingItem(null)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
