import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";

import logo from "../assets/logo.png";

import {
  MdDashboard,
  MdPeople,
  MdCalendarToday,
  MdSettings,
  MdBuild,
} from "react-icons/md";

import { IoLogOutOutline } from "react-icons/io5";
import { FaUserCircle } from "react-icons/fa";

// Custom Alert Component
const CustomAlert = ({ visible, type, title, message, onClose }: any) => {
  if (!visible) return null;

  const getIcon = () => {
    switch(type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  };

  const getColor = () => {
    switch(type) {
      case 'success': return '#4CAF50';
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      default: return '#6A3C17';
    }
  };

  return (
    <div style={styles.alertOverlay}>
      <div style={styles.alertContainer}>
        <div style={{ ...styles.alertIconContainer, backgroundColor: `${getColor()}20` }}>
          <span style={{ ...styles.alertIconEmoji, color: getColor() }}>{getIcon()}</span>
        </div>
        <h3 style={styles.alertTitle}>{title}</h3>
        <p style={styles.alertMessage}>{message}</p>
        <button onClick={onClose} style={styles.alertButton}>
          OK
        </button>
      </div>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [alert, setAlert] = useState({ visible: false, type: 'info', title: '', message: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const showAlert = (type: string, title: string, message: string) => {
    setAlert({ visible: true, type, title, message });
    setTimeout(() => setAlert({ ...alert, visible: false }), 3000);
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      navigate("/", { replace: true });
      showAlert("success", "Logged Out", "You have been logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      showAlert("error", "Error", "Failed to logout. Please try again.");
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  const menuItems = [
    {
      path: "/dashboard",
      icon: <MdDashboard size={22} color="#F5EFE6" />,
      label: "Dashboard",
    },
    {
      path: "/users",
      icon: <MdPeople size={22} color="#F5EFE6" />,
      label: "Users",
    },
    {
      path: "/services",
      icon: <MdBuild size={22} color="#F5EFE6" />,
      label: "Services",
    },
    {
      path: "/appointments",
      icon: <MdCalendarToday size={22} color="#F5EFE6" />,
      label: "Appointments",
    },
    {
      path: "/settings",
      icon: <MdSettings size={22} color="#F5EFE6" />,
      label: "Settings",
    },
  ];

  const handleNavigate = (path: string) => {
    if (location.pathname !== path) {
      navigate(path);
    }
  };

  return (
    <>
      <div style={styles.sidebar}>
        {/* HEADER with Gradient */}
        <div style={styles.sidebarHeader}>
          <img src={logo} alt="BeauTech" style={styles.sidebarLogo} />
          <h2 style={styles.sidebarTitle}>BeauTech</h2>
        </div>

        {/* MENU */}
        <div style={styles.sidebarMenu}>
          {menuItems.map((item) => (
            <div
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              style={{
                ...styles.menuItem,
                background:
                  location.pathname === item.path ? "rgba(255,255,255,0.15)" : "transparent",
              }}
              className="menu-item"
            >
              <span style={styles.menuIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* FOOTER */}
        <div style={styles.sidebarFooter}>
          <div style={styles.adminInfo}>
            <div style={styles.adminAvatar}>
              <FaUserCircle size={28} color="#F5EFE6" />
            </div>

            <div>
              <div style={styles.adminName}>Admin</div>
              <div style={styles.adminEmail}>admin@beautech.com</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={styles.sidebarLogout}
            className="sidebar-logout"
          >
            <IoLogOutOutline size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div style={styles.alertOverlay}>
          <div style={styles.alertContainer}>
            <div style={{ ...styles.alertIconContainer, backgroundColor: '#ff980020' }}>
              <span style={{ ...styles.alertIconEmoji, color: '#ff9800' }}>⚠</span>
            </div>
            <h3 style={styles.alertTitle}>Logout</h3>
            <p style={styles.alertMessage}>Are you sure you want to logout?</p>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button 
                onClick={confirmLogout} 
                style={styles.confirmButton}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert */}
      <CustomAlert 
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </>
  );
};

const styles = {
  sidebar: {
    width: "280px",
    background: "linear-gradient(180deg, #8b5a2b 0%, #6A3C17 50%, #4b2608 100%)",
    borderRight: "1px solid #8a5424",
    display: "flex",
    flexDirection: "column" as const,
    height: "100vh",
    position: "sticky" as const,
    top: 0,
  },

  sidebarHeader: {
    padding: "24px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  sidebarLogo: {
    width: "50px",
    height: "50px",
    objectFit: "contain" as const,
  },

  sidebarTitle: {
    fontSize: "22px",
    fontWeight: "600",
    color: "#F5EFE6",
    margin: 0,
  },

  sidebarMenu: {
    flex: 1,
    padding: "20px 0",
  },

  menuItem: {
    padding: "12px 20px",
    margin: "4px 12px",
    borderRadius: "8px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#F5EFE6",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s ease",
  },

  menuIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "24px",
  },

  sidebarFooter: {
    padding: "20px",
    borderTop: "1px solid rgba(255,255,255,0.1)",
  },

  adminInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
  },

  adminAvatar: {
    width: "44px",
    height: "44px",
    background: "rgba(255,255,255,0.15)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  adminName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#F5EFE6",
  },

  adminEmail: {
    fontSize: "12px",
    color: "#E8D5C0",
  },

  sidebarLogout: {
    width: "100%",
    padding: "10px",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "8px",
    color: "#F5EFE6",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    transition: "all 0.2s ease",
  },

  // Alert Styles
  alertOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10000,
  },
  alertContainer: {
    backgroundColor: "#fff",
    borderRadius: "20px",
    padding: "24px",
    width: "320px",
    textAlign: "center" as const,
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
  },
  alertIconContainer: {
    width: "80px",
    height: "80px",
    borderRadius: "40px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 16px",
  },
  alertIconEmoji: {
    fontSize: "45px",
    fontWeight: "bold",
  },
  alertTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "8px",
  },
  alertMessage: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "24px",
    lineHeight: "1.5",
  },
  alertButton: {
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17)",
    color: "#fff",
    border: "none",
    padding: "12px 32px",
    borderRadius: "25px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    padding: "12px",
    background: "#ddd",
    color: "#333",
    border: "none",
    borderRadius: "25px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  confirmButton: {
    flex: 1,
    padding: "12px",
    background: "linear-gradient(135deg, #c0392b, #e74c3c)",
    color: "#fff",
    border: "none",
    borderRadius: "25px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

export default Sidebar;