import { Fragment, useCallback, useEffect, useState } from "react";
import "./Adminpanel.css";
import { authenticatedFetch } from "../utils/api";
import OrderDetails from "./OrderDetails";

const getAuthHeaders = (includeJson = false) => {
  const token = localStorage.getItem("token");
  return {
    ...(includeJson ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getRole = (user = {}) =>
  String(user.RoleeName || user.RoleName || user.role || user.RoleeID || "").toLowerCase();

const isAdminRole = (user = {}) => ["admin", "administrator", "1"].includes(getRole(user));

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  return imageUrl.startsWith("http") ? imageUrl : `http://localhost:1500${imageUrl}`;
};

const isDoneOrder = (order = {}) =>
  ["done", "completed", "picked up", "pickedup"].includes(String(order.OrderStatus || "").toLowerCase());

const isPendingOrder = (order = {}) =>
  String(order.OrderStatus || "Pending").toLowerCase() === "pending";

export default function Adminpanel() {
  const [activeTab, setActiveTab] = useState("overview"); // overview, products, categories, customers, orders
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

  // Forms
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
  const isAdmin = isAdminRole(currentUser);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Items
      const itemsRes = await authenticatedFetch("http://localhost:1500/items/items/get", {
        headers: getAuthHeaders(),
      });
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(Array.isArray(itemsData) ? itemsData : []);
      }

      // 2. Fetch Categories
      const catRes = await authenticatedFetch("http://localhost:1500/categories/cat/get", {
        headers: getAuthHeaders(),
      });
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
      }

      // 3. Fetch Customers
      const custRes = await authenticatedFetch("http://localhost:1500/customers/cust/get", {
        headers: getAuthHeaders(),
      });
      if (custRes.ok) {
        const custData = await custRes.json();
        setCustomers(Array.isArray(custData) ? custData : []);
      }

      // 4. Fetch Orders
      const ordRes = await authenticatedFetch("http://localhost:1500/orders/order/get", {
        headers: getAuthHeaders(),
      });
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(Array.isArray(ordData) ? ordData : []);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = "Admin Panel - CarKit";
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (!storedUser || !storedToken) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const role = getRole(user);

        if (!["admin", "administrator", "manager", "1", "2"].includes(role)) {
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
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showNotification("Product image must be JPG, PNG, or WEBP.", false);
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      showNotification("Product image must be 2 MB or smaller.", false);
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

  // Item Handlers
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.Name || !newItem.Price || !newItem.Quantity || !newItem.CarModel) {
      showNotification("Please fill in all product fields.", false);
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

  const handleDeleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
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

  // Category Handlers
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.categoryname.trim()) {
      showNotification("Please enter a category name.", false);
      return;
    }

    try {
      const res = await authenticatedFetch("http://localhost:1500/categories/cat/add", {
        method: "POST",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          categoryname: newCategory.categoryname.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showNotification("Category added successfully!");
        setNewCategory({ categoryname: "" });
        fetchAllData();
      } else {
        showNotification(data.message || "Failed to add category.", false);
      }
    } catch (err) {
      showNotification("Error adding category.", false);
    }
  };

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

  // Customer Handlers
  const handleDeleteCustomer = async (id) => {
    if (!isAdmin) {
      showNotification("Only admins can delete customer accounts.", false);
      return;
    }
    if (!window.confirm("Are you sure you want to delete this customer?")) return;
    try {
      const res = await authenticatedFetch(`http://localhost:1500/customers/cust/delete/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showNotification("Customer deleted successfully!");
        fetchAllData();
      } else {
        showNotification(data.message || "Failed to delete customer.", false);
      }
    } catch (err) {
      showNotification("Error deleting customer.", false);
    }
  };

  const handleMarkDone = async (id) => {
    try {
      const res = await authenticatedFetch(`http://localhost:1500/orders/order/${id}/done`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showNotification("Order marked as done.");
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

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const filteredItems = items.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      (item.Name && item.Name.toLowerCase().includes(term)) ||
      (item.CarModel && item.CarModel.toLowerCase().includes(term))
    );
  });
  const pendingOrders = orders.filter(isPendingOrder);
  const doneOrders = orders.filter(isDoneOrder);
  const revenue = orders.reduce((sum, order) => sum + Number(order.Total ?? order.TotalAmount ?? 0), 0);

  if (accessDenied) {
    return (
      <div className="admin-container">
        <div className="error-message">Access denied. Admin or manager permissions are required.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Dashboard</h1>
            <p className="admin-subtitle">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Top Header */}
      <div className="admin-header">
        <div>
          <h1>{isAdmin ? "Admin Dashboard" : "Manager Dashboard"}</h1>
          <p className="admin-subtitle">Manage authorized products, categories, customers, and orders</p>
        </div>
        <div className="admin-user-info">
          <span>Logged in as: <strong>{currentUser?.Username || "Admin"}</strong></span>
          <button className="admin-logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </div>

      {/* Notifications */}
      {success && <div className="success-message">🎉 {success}</div>}
      {error && <div className="error-message">⚠️ {error}</div>}

      {/* Tabs Navigation */}
      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          📊 Overview
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
          className={`admin-tab-btn ${activeTab === "customers" ? "active" : ""}`}
          onClick={() => setActiveTab("customers")}
        >
          👥 Customers ({customers.length})
        </button>
        <button
          className={`admin-tab-btn ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          📑 Orders ({orders.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="admin-tab-content">
          <div className="stats-grid">
            <div className="stat-card" onClick={() => setActiveTab("products")}>
              <div className="stat-icon">📦</div>
              <div className="stat-details">
                <h3>Total Products</h3>
                <p className="stat-number">{items.length}</p>
              </div>
            </div>

            <div className="stat-card" onClick={() => setActiveTab("categories")}>
              <div className="stat-icon">🏷️</div>
              <div className="stat-details">
                <h3>Categories</h3>
                <p className="stat-number">{categories.length}</p>
              </div>
            </div>

            <div className="stat-card" onClick={() => setActiveTab("customers")}>
              <div className="stat-icon">👥</div>
              <div className="stat-details">
                <h3>Customers</h3>
                <p className="stat-number">{customers.length}</p>
              </div>
            </div>

            <div className="stat-card" onClick={() => setActiveTab("orders")}>
              <div className="stat-icon">📑</div>
              <div className="stat-details">
                <h3>Total Orders</h3>
                <p className="stat-number">{orders.length}</p>
              </div>
            </div>

            <div className="stat-card" onClick={() => setActiveTab("orders")}>
              <div className="stat-icon">⏳</div>
              <div className="stat-details">
                <h3>Pending Orders</h3>
                <p className="stat-number">{pendingOrders.length}</p>
              </div>
            </div>

            <div className="stat-card" onClick={() => setActiveTab("orders")}>
              <div className="stat-icon">✅</div>
              <div className="stat-details">
                <h3>Picked Up</h3>
                <p className="stat-number">{doneOrders.length}</p>
              </div>
            </div>

            <div className="stat-card" onClick={() => setActiveTab("orders")}>
              <div className="stat-icon">💵</div>
              <div className="stat-details">
                <h3>Revenue</h3>
                <p className="stat-number">${revenue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-card">
            <h3>⚡ Quick Actions</h3>
            <div className="quick-actions-buttons">
              <button className="admin-btn primary" onClick={() => setActiveTab("products")}>
                ➕ Add New Product
              </button>
              <button className="admin-btn secondary" onClick={() => setActiveTab("categories")}>
                🏷️ Add New Category
              </button>
              <button className="admin-btn secondary" onClick={fetchAllData}>
                🔄 Refresh All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS */}
      {activeTab === "products" && (
        <div className="admin-tab-content">
          {/* Add Product Form */}
          <div className="admin-form-card">
            <h3>➕ Add New Product</h3>
            <form className="admin-inline-form" onSubmit={handleAddItem}>
              <input
                type="text"
                placeholder="Product Name (e.g. LED Headlight Bulb)"
                value={newItem.Name}
                onChange={(e) => setNewItem({ ...newItem, Name: e.target.value })}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Price ($)"
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
                placeholder="Car Compatibility (e.g. Universal, BMW, Honda)"
                value={newItem.CarModel}
                onChange={(e) => setNewItem({ ...newItem, CarModel: e.target.value })}
                required
              />
              <select
                value={newItem.categoryid}
                onChange={(e) => setNewItem({ ...newItem, categoryid: e.target.value })}
              >
                <option value="">Select Category (Optional)</option>
                {categories.map((cat) => (
                  <option key={cat.CategoryID || cat.categoryid} value={cat.CategoryID || cat.categoryid}>
                    {cat.CategoryName || cat.categoryname}
                  </option>
                ))}
              </select>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleNewItemImageChange(e.target.files?.[0])}
              />
              {newItemPreview && (
                <img src={newItemPreview} alt="Product preview" className="product-image-preview" />
              )}
              <button type="submit" className="admin-btn primary">Add Product</button>
            </form>
          </div>

          {/* Search bar */}
          <div className="admin-search-bar">
            <input
              type="text"
              placeholder="🔍 Search products by name or car model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Products Table */}
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
                    <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const id = item.ItemID || item.itemid;
                    return (
                      <tr key={id}>
                        <td>#{id}</td>
                        <td>
                          {getImageUrl(item.ImageUrl) ? (
                            <img src={getImageUrl(item.ImageUrl)} alt={item.Name} className="table-product-image" />
                          ) : (
                            <span className="muted-text">No image</span>
                          )}
                        </td>
                        <td><strong>{item.Name}</strong></td>
                        <td>${parseFloat(item.Price || 0).toFixed(2)}</td>
                        <td>
                          <span className={`stock-badge ${item.Quantity > 0 ? "in-stock" : "out-of-stock"}`}>
                            {item.Quantity} in stock
                          </span>
                        </td>
                        <td>{item.CarModel}</td>
                        <td>
                          <button
                            className="action-btn edit"
                            onClick={() => openEditItem(item)}
                          >
                            ✏️ Edit
                          </button>
                          <button className="action-btn delete" onClick={() => handleDeleteItem(id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Edit Product Modal */}
          {editingItem && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h3>✏️ Edit Product #{editingItem.ItemID || editingItem.itemid}</h3>
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
                    <label>Stock Quantity</label>
                    <input
                      type="number"
                      value={editingItem.Quantity}
                      onChange={(e) => setEditingItem({ ...editingItem, Quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Car Compatibility</label>
                    <input
                      type="text"
                      value={editingItem.CarModel}
                      onChange={(e) => setEditingItem({ ...editingItem, CarModel: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Product Image</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleEditItemImageChange(e.target.files?.[0])}
                    />
                    {editingItemPreview && (
                      <img src={editingItemPreview} alt="Product preview" className="product-image-preview" />
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
      )}

      {/* TAB 3: CATEGORIES */}
      {activeTab === "categories" && (
        <div className="admin-tab-content">
          <div className="admin-form-card">
            <h3>➕ Add New Category</h3>
            <form className="admin-inline-form" onSubmit={handleAddCategory}>
              <input
                type="text"
                placeholder="Category Name (e.g. Interior Accessories)"
                value={newCategory.categoryname}
                onChange={(e) => setNewCategory({ categoryname: e.target.value })}
                required
              />
              <button type="submit" className="admin-btn primary">Add Category</button>
            </form>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Category ID</th>
                  <th>Category Name</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", padding: "20px" }}>
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => {
                    const id = cat.CategoryID || cat.categoryid;
                    return (
                      <tr key={id}>
                        <td>#{id}</td>
                        <td><strong>{cat.CategoryName || cat.categoryname}</strong></td>
                        <td>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDeleteCategory(id)}
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMERS */}
      {activeTab === "customers" && (
        <div className="admin-tab-content">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? "6" : "5"} style={{ textAlign: "center", padding: "20px" }}>
                      No customers found.
                    </td>
                  </tr>
                ) : (
                  customers.map((cust) => {
                    return (
                      <tr key={cust.CustomerID}>
                        <td>#{cust.CustomerID}</td>
                        <td><strong>{cust.Name}</strong></td>
                        <td>{cust.Email}</td>
                        <td>{cust.Phone}</td>
                        <td>{cust.Address}</td>
                        {isAdmin && (
                          <td>
                            <button
                              className="action-btn delete"
                              disabled={Number(currentUser?.CustomerID) === Number(cust.CustomerID)}
                              onClick={() => handleDeleteCustomer(cust.CustomerID)}
                              title={Number(currentUser?.CustomerID) === Number(cust.CustomerID) ? "You cannot delete your own account" : "Delete customer"}
                            >
                              {Number(currentUser?.CustomerID) === Number(cust.CustomerID) ? "Protected" : "Delete"}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ORDERS */}
      {activeTab === "orders" && (
        <div className="admin-tab-content">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer ID</th>
                  <th>Order Date</th>
                  <th>Status</th>
                  <th>Total Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                      No orders placed yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <Fragment key={ord.OrderID}>
                      <tr>
                        <td>#{ord.OrderID}</td>
                        <td>Customer #{ord.CustomerID}</td>
                        <td>{ord.OrderDate ? new Date(ord.OrderDate).toLocaleDateString() : "N/A"}</td>
                        <td>
                          <span className="stock-badge in-stock">{ord.OrderStatus || "Pending"}</span>
                        </td>
                        <td><strong>${parseFloat(ord.Total ?? ord.TotalAmount ?? 0).toFixed(2)}</strong></td>
                        <td>
                          <button className="action-btn edit" onClick={() => handleViewOrderDetails(ord.OrderID)}>
                            {orderDetails[ord.OrderID] ? "Hide details" : "View products"}
                          </button>
                          {["pending", "cancel requested"].includes(String(ord.OrderStatus || "pending").toLowerCase()) ? (
                            <>
                              {isPendingOrder(ord) && <button className="action-btn edit" onClick={() => handleMarkDone(ord.OrderID)}>Mark Done</button>}
                              <button className="action-btn delete" onClick={() => handleCancelOrder(ord.OrderID)}>
                                {String(ord.OrderStatus || "").toLowerCase() === "cancel requested" ? "Approve Cancel" : "Cancel"}
                              </button>
                            </>
                          ) : (
                            <span className="muted-text">{String(ord.OrderStatus || "").toLowerCase() === "cancelled" ? "Cancelled" : "Completed"}</span>
                          )}
                        </td>
                      </tr>
                      {orderDetails[ord.OrderID] && (
                        <tr><td colSpan="6"><OrderDetails details={orderDetails[ord.OrderID]} /></td></tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
