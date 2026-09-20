
import "./Navbar.css";

export default function Navbar() {
  let role = "";
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    role = String(user.RoleeName || user.RoleName || user.role || user.RoleeID || "").toLowerCase();
  } catch (error) {
    role = "";
  }
  const token = localStorage.getItem("token");
  const isAdmin = ["admin", "administrator", "1"].includes(role);
  const isManager = ["manager", "staff", "3"].includes(role);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <>
      <div className="navbar-topbar">
        <span>Free shipping on orders over $99</span>
        <span>30-day returns</span>
        <span>2-year warranty</span>
        <span>Expert support</span>
        <strong>+961 81141587</strong>
      </div>
    <header className="navbar-container">
      <div className="navbar-logo">
        <a href="/">
          <span className="navbar-wordmark">CAR<span>KIT</span></span>
        </a>
      </div>
      <nav className="navbar">
        <ul className="navbar-links">
          <li><a href="/">Home</a></li>
          <li><a href="/about">Brands</a></li>
          <li><a href="/deals">Deals</a></li>
          <li><a href="/installation">Installation</a></li>
          <li><a href="/cart">Cart</a></li>
          {token && <li><a href="/orders">My Orders</a></li>}
          {isAdmin && (
            <li><a href="/admin" style={{ color: "#d97706", fontWeight: "600" }}>Admin Panel</a></li>
          )}
          {isManager && (
            <li><a href="/manager" style={{ color: "#2563eb", fontWeight: "600" }}>Manager Panel</a></li>
          )}
          {token ? (
            <li>
              <button
                onClick={handleLogout}
                style={{
                  background: "none",
                  border: "none",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "15px",
                  padding: "0 8px",
                }}
              >
                Log Out
              </button>
            </li>
          ) : (
            <>
              <li><a href="/signup">Sign Up</a></li>
              <li><a href="/login">Log In</a></li>
            </>
          )}
        </ul>
      </nav>
    </header>
    </>
  );
}
