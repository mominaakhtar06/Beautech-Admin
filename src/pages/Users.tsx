import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where, 
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import Sidebar from "../components/Sidebar";
import { FiSearch, FiEdit2, FiTrash2, FiUserX, FiUserCheck, FiPhone } from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "customer" | "staff" | "admin";
  isBlocked?: boolean;
  profileImage?: string;
  photoURL?: string;
}

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

// Confirm Modal Component
const ConfirmModal = ({ visible, title, message, onConfirm, onCancel }: any) => {
  if (!visible) return null;

  return (
    <div style={styles.alertOverlay}>
      <div style={styles.alertContainer}>
        <div style={{ ...styles.alertIconContainer, backgroundColor: '#ff980020' }}>
          <span style={{ ...styles.alertIconEmoji, color: '#ff9800' }}>⚠</span>
        </div>
        <h3 style={styles.alertTitle}>{title}</h3>
        <p style={styles.alertMessage}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button onClick={onCancel} style={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={onConfirm} style={styles.confirmButton}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const Users = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState("customer");
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ visible: false, type: 'info', title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', action: null as any, user: null as any });

  const showAlert = (type: string, title: string, message: string) => {
    setAlert({ visible: true, type, title, message });
    setTimeout(() => setAlert({ ...alert, visible: false }), 3000);
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, "users"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[];
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
      showAlert("error", "Error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Block / Unblock - FIXED
  const toggleBlockUser = async (user: User) => {
    const newBlockStatus = !user.isBlocked;
    const actionText = newBlockStatus ? "blocked" : "unblocked";
    
    try {
      console.log(`Toggling block status for ${user.email}: ${actionText}`);
      
      // Update Firestore
      await updateDoc(doc(db, "users", user.id), {
        isBlocked: newBlockStatus
      });
      
      // Verify the update by fetching the user again
      const updatedUserSnap = await getDocs(query(collection(db, "users"), where("email", "==", user.email)));
      
      // Refresh the users list
      await fetchUsers();
      
      showAlert("success", "Success", `${user.name || user.email} has been ${actionText} successfully!`);
    } catch (error) {
      console.error("Error toggling block status:", error);
      showAlert("error", "Error", `Failed to ${actionText} user. Please try again.`);
    }
  };

  // Delete user
  const deleteUser = async (id: string, name: string) => {
    try {
      await deleteDoc(doc(db, "users", id));
      fetchUsers();
      showAlert("success", "Deleted", `${name} has been deleted successfully!`);
    } catch (error) {
      console.error("Error deleting user:", error);
      showAlert("error", "Error", "Failed to delete user");
    }
  };

  // Open edit modal
  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditPhone(user.phone || "");
    setEditRole(user.role);
  };

  // Save edit
  const saveEdit = async () => {
    if (!editingUser) return;

    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        name: editName,
        phone: editPhone,
        role: editRole,
      });
      setEditingUser(null);
      fetchUsers();
      showAlert("success", "Success", "User updated successfully!");
    } catch (error) {
      console.error("Error updating user:", error);
      showAlert("error", "Error", "Failed to update user");
    }
  };

  // Search filter
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.toLowerCase().includes(search.toLowerCase())
  );

  // Get role badge color
  const getRoleColor = (role: string) => {
    switch(role) {
      case "admin": return "#8a5424";
      case "staff": return "#6A3C17";
      default: return "#8B6B4D";
    }
  };

  // Get profile image URL
  const getProfileImage = (user: User) => {
    return user.profileImage || user.photoURL || null;
  };

  // Format phone number
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "—";
    return phone;
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <Sidebar />
      
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>User Management</h1>
            <p style={styles.subtitle}>Manage all customers, staff and admins</p>
          </div>
          
          {/* Search Bar */}
          <div style={styles.searchContainer}>
            <FiSearch size={18} color="#8B6B4D" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* Stats Cards with Gradient */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <FaUserCircle size={24} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Total Users</div>
              <div style={styles.statValue}>{users.length}</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <FaUserCircle size={24} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Active Users</div>
              <div style={styles.statValue}>{users.filter(u => !u.isBlocked).length}</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <FaUserCircle size={24} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Blocked Users</div>
              <div style={styles.statValue}>{users.filter(u => u.isBlocked === true).length}</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <FaUserCircle size={24} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Admins</div>
              <div style={styles.statValue}>{users.filter(u => u.role === "admin").length}</div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <div style={styles.loadingText}>Loading users...</div>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead style={styles.tableHead}>
                <tr>
                  <th style={styles.th}>User</th>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const profileImage = getProfileImage(user);
                    const isUserBlocked = user.isBlocked === true;
                    
                    return (
                      <tr key={user.id} style={styles.tableRow}>
                        <td style={styles.td}>
                          <div style={styles.userInfo}>
                            <div style={styles.userAvatar}>
                              {profileImage ? (
                                <img 
                                  src={profileImage} 
                                  alt={user.name} 
                                  style={styles.avatarImage}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = user.name?.charAt(0)?.toUpperCase() || "U";
                                  }}
                                />
                              ) : (
                                user.name?.charAt(0)?.toUpperCase() || "U"
                              )}
                            </div>
                            <span style={styles.userName}>{user.name || "No Name"}</span>
                          </div>
                        </td>
                        <td style={styles.td}>{user.email}</td>
                        <td style={styles.td}>
                          <div style={styles.phoneInfo}>
                            <FiPhone size={14} color="#8B6B4D" style={styles.phoneIcon} />
                            {formatPhoneNumber(user.phone || "")}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.roleBadge,
                            background: `linear-gradient(135deg, ${getRoleColor(user.role)}, ${getRoleColor(user.role)}dd)`,
                            color: "#F5EFE6",
                          }}>
                            {user.role === "staff" ? "Staff" : 
                             user.role === "admin" ? "Admin" : "Customer"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: isUserBlocked ? "#fee2e2" : "#dcfce7",
                            color: isUserBlocked ? "#dc2626" : "#16a34a",
                          }}>
                            {isUserBlocked ? "Blocked" : "Active"}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            <button
                              onClick={() => openEdit(user)}
                              style={styles.editButton}
                              title="Edit User"
                            >
                              <FiEdit2 size={16} color="#F5EFE6" />
                              <span style={styles.buttonText}>Edit</span>
                            </button>
                            
                            <button
                              onClick={() => toggleBlockUser(user)}
                              style={{
                                ...styles.actionButton,
                                background: isUserBlocked 
                                  ? "linear-gradient(135deg, #16a34a, #15803d)" 
                                  : "linear-gradient(135deg, #dc2626, #b91c1c)",
                              }}
                              title={isUserBlocked ? "Unblock User" : "Block User"}
                            >
                              {isUserBlocked ? 
                                <FiUserCheck size={16} color="#F5EFE6" /> : 
                                <FiUserX size={16} color="#F5EFE6" />
                              }
                              <span style={styles.buttonText}>
                                {isUserBlocked ? "Unblock" : "Block"}
                              </span>
                            </button>
                            
                            <button
                              onClick={() => {
                                setConfirmModal({
                                  visible: true,
                                  title: "Delete User",
                                  message: `Are you sure you want to delete ${user.name}? This action cannot be undone.`,
                                  action: () => deleteUser(user.id, user.name),
                                  user: user
                                });
                              }}
                              style={styles.deleteButton}
                              title="Delete User"
                            >
                              <FiTrash2 size={16} color="#F5EFE6" />
                              <span style={styles.buttonText}>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={styles.noData}>
                      <div style={styles.noDataContent}>
                        <FiSearch size={32} color="#8B6B4D" />
                        <p>No users found matching your search</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Modal */}
        {editingUser && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <h3 style={styles.modalTitle}>Edit User</h3>
              
              <div style={styles.modalBody}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Name</label>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter name"
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Enter phone number"
                    style={styles.input}
                  />
                </div>
                
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    style={styles.select}
                  >
                    <option value="customer">Customer</option>
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              
              <div style={styles.modalFooter}>
                <button
                  onClick={() => setEditingUser(null)}
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  style={styles.saveButton}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Alert */}
      <CustomAlert 
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />

      {/* Confirm Modal for Delete */}
      <ConfirmModal 
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.action) confirmModal.action();
          setConfirmModal({ ...confirmModal, visible: false });
        }}
        onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
      />
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    background: "#F5EFE6",
    overflow: "hidden",
  },

  mainContent: {
    flex: 1,
    padding: "24px",
    height: "100vh",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexShrink: 0,
  },

  title: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#6A3C17",
    margin: "0 0 4px 0",
  },

  subtitle: {
    fontSize: "14px",
    color: "#8B6B4D",
    margin: 0,
  },

  searchContainer: {
    position: "relative" as const,
    width: "320px",
  },

  searchIcon: {
    position: "absolute" as const,
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
  },

  searchInput: {
    width: "100%",
    padding: "10px 16px 10px 40px",
    borderRadius: "8px",
    border: "1px solid #e0d6c8",
    fontSize: "14px",
    outline: "none",
    background: "white",
    boxShadow: "0 2px 4px rgba(106, 60, 23, 0.05)",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    marginBottom: "24px",
    flexShrink: 0,
  },

  statCard: {
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17, #4b2608)",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: "1px solid #8a5424",
    boxShadow: "0 4px 6px rgba(106, 60, 23, 0.1)",
  },

  statIcon: {
    width: "48px",
    height: "48px",
    background: "rgba(255,255,255,0.15)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  statInfo: {
    flex: 1,
  },

  statLabel: {
    fontSize: "12px",
    color: "#F5EFE6",
    marginBottom: "4px",
  },

  statValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#F5EFE6",
  },

  tableContainer: {
    flex: 1,
    background: "white",
    borderRadius: "12px",
    border: "1px solid #e0d6c8",
    boxShadow: "0 4px 6px rgba(106, 60, 23, 0.05)",
    overflow: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    minWidth: "1100px",
  },

  tableHead: {
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17, #4b2608)",
  },

  th: {
    padding: "16px",
    textAlign: "left" as const,
    fontSize: "14px",
    fontWeight: "600",
    color: "#F5EFE6",
    whiteSpace: "nowrap" as const,
  },

  tableRow: {
    borderBottom: "1px solid #f0e2d2",
    transition: "background 0.2s ease",
  },

  td: {
    padding: "14px 16px",
    fontSize: "14px",
    color: "#4a3a2a",
  },

  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  userAvatar: {
    width: "40px",
    height: "40px",
    background: "#F5EFE6",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "600",
    color: "#6A3C17",
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  },

  userName: {
    fontWeight: "500",
  },

  phoneInfo: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  phoneIcon: {
    flexShrink: 0,
  },

  roleBadge: {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    display: "inline-block",
  },

  statusBadge: {
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    display: "inline-block",
  },

  actionButtons: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap" as const,
  },

  actionButton: {
    padding: "8px 12px",
    border: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    color: "#F5EFE6",
    fontSize: "13px",
    fontWeight: "500",
  },

  editButton: {
    padding: "8px 12px",
    background: "linear-gradient(135deg, #8a5424, #6A3C17)",
    border: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(106, 60, 23, 0.2)",
    color: "#F5EFE6",
    fontSize: "13px",
    fontWeight: "500",
  },

  deleteButton: {
    padding: "8px 12px",
    background: "linear-gradient(135deg, #6b7280, #4b5563)",
    border: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    color: "#F5EFE6",
    fontSize: "13px",
    fontWeight: "500",
  },

  buttonText: {
    color: "#F5EFE6",
  },

  noData: {
    padding: "60px",
    textAlign: "center" as const,
  },

  noDataContent: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "16px",
    color: "#8B6B4D",
  },

  loadingContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "center",
    background: "white",
    borderRadius: "12px",
    gap: "16px",
  },

  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #F5EFE6",
    borderTop: "3px solid #6A3C17",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  loadingText: {
    fontSize: "14px",
    color: "#8B6B4D",
  },

  modalOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },

  modalContent: {
    background: "white",
    borderRadius: "12px",
    width: "400px",
    maxWidth: "90%",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
  },

  modalTitle: {
    padding: "20px",
    margin: 0,
    fontSize: "18px",
    fontWeight: "600",
    color: "#6A3C17",
    borderBottom: "1px solid #e0d6c8",
  },

  modalBody: {
    padding: "20px",
  },

  inputGroup: {
    marginBottom: "16px",
  },

  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "500",
    color: "#6A3C17",
    marginBottom: "6px",
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e0d6c8",
    fontSize: "14px",
    outline: "none",
    background: "#F5EFE6",
  },

  select: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e0d6c8",
    fontSize: "14px",
    outline: "none",
    background: "#F5EFE6",
    cursor: "pointer",
  },

  modalFooter: {
    padding: "20px",
    borderTop: "1px solid #e0d6c8",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  },

  cancelButton: {
    padding: "10px 20px",
    background: "white",
    border: "1px solid #e0d6c8",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#8B6B4D",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  saveButton: {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17)",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#F5EFE6",
    cursor: "pointer",
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
  confirmButton: {
    flex: 1,
    padding: "12px",
    background: "linear-gradient(135deg, #dc2626, #b91c1c)",
    color: "#fff",
    border: "none",
    borderRadius: "25px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

// Add global styles for animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .table-row:hover {
    background: #F5EFE6 !important;
  }

  .action-button:hover, .edit-button:hover, .delete-button:hover {
    opacity: 0.9;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
  }

  .cancel-button:hover {
    background: #F5EFE6 !important;
    border-color: #6A3C17 !important;
  }

  .save-button:hover {
    background: #8a5424 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(106, 60, 23, 0.3) !important;
  }
`;
document.head.appendChild(styleSheet);

export default Users;