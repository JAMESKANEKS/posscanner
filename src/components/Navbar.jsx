import { NavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../styles/navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Get role and email from localStorage
    const role = localStorage.getItem("userRole");
    const email = localStorage.getItem("userEmail");
    setUserRole(role);
    setUserEmail(email);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    navigate("/login");
  };

  return (
    <>
      {isMobile && (
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>
      )}
      <div className={`sidebar ${isMenuOpen ? 'mobile-open' : ''}`}>
        {/* User Info */}
        <div className="user-info">
          <div className="user-avatar">{userRole?.[0]?.toUpperCase()}</div>
          <div className="user-details">
            <div className="user-email">{userEmail}</div>
            <div className="user-role">{userRole}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

      {/* Navigation */}
      <ul className="nav-menu">
        <li className="nav-item">
          <NavLink to="/" className="nav-link">
            <span className="nav-icon">📊</span>
            Dashboard
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink to="/services" className="nav-link">
            <span className="nav-icon">📦</span>
            Products
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink to="/scanner" className="nav-link">
            <span className="nav-icon">📷</span>
            Scanner
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink to="/transactions" className="nav-link">
            <span className="nav-icon">🎰</span>
            POS
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink to="/receipts" className="nav-link">
            <span className="nav-icon">🧾</span>
            Receipts
          </NavLink>
        </li>

        <li className="nav-item">
          <NavLink to="/reports" className="nav-link">
            <span className="nav-icon">📉</span>
            Expense
          </NavLink>
        </li>
        </ul>
      </div>
      {isMenuOpen && (
        <div 
          className="overlay" 
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
}
