import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useState, useEffect } from 'react';
import Navbar from "./components/Navbar";

// Pages
import Dashboard from "./pages/Dashboard";
import Services from "./pages/Services";
import ScannerPage from "./pages/ScannerPage";
import Transactions from "./pages/Transactions";
import Reports from "./pages/Reports";
import Receipts from "./pages/Receipts";
import Receipt from './pages/Receipt'; // 👈 Added import
import Login from "./pages/Login";

// Styles
import "./styles/layout.css";
import "./App.css";

// Images
import logo from "./images/logo.jpg";

// ProtectedRoute component
function ProtectedRoute({ children }) {
  const role = localStorage.getItem("userRole");
  return role ? children : <Navigate to="/login" />;
}

// Header Component
function Header() {
  const location = useLocation();
  const [pageTitle, setPageTitle] = useState('Dashboard');

  useEffect(() => {
    const path = location.pathname;
    const titles = {
      '/': 'Dashboard',
      '/dashboard': 'Dashboard',
      '/services': 'Services',
      '/scanner': 'Scanner',
      '/transactions': 'Transactions',
      '/reports': 'Reports',
      '/receipts': 'Receipts'
    };

    setPageTitle(titles[path] || 'Dashboard');
  }, [location]);

  return (
    <header className="app-header">
      <div className="header-content" style={{padding: "20px"}}>
        <h1>POS & INVENTORY SYSTEM</h1>
      </div>
    </header>
  );
}

function MainLayout({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <div className="app-container">
      <Navbar isMenuOpen={isMenuOpen} onMenuToggle={toggleMenu} />
      <Header />
      <main className="main-content">
        <div className="page-container">{children}</div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected */}
        <Route path="/" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/services" element={<ProtectedRoute><MainLayout><Services /></MainLayout></ProtectedRoute>} />
        <Route path="/scanner" element={<ProtectedRoute><MainLayout><ScannerPage /></MainLayout></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><MainLayout><Transactions /></MainLayout></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><MainLayout><Reports /></MainLayout></ProtectedRoute>} />
        <Route path="/receipts" element={<ProtectedRoute><MainLayout><Receipts /></MainLayout></ProtectedRoute>} />

        {/* 👇 New Receipt Route */}
        <Route path="/receipt/:id" element={<ProtectedRoute><Receipt /></ProtectedRoute>} />

        {/* Redirect unknown */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}
