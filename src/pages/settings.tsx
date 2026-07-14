import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import { db, auth } from "../firebase/firebaseConfig";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import Sidebar from "../components/Sidebar";
import { 
  FiSettings,
  FiUser,
  FiMail,
  FiPhone,
  FiLock,
  FiSave,
  FiX,
  FiEdit2,
  FiCheck,
  FiGlobe,
  FiMapPin,
  FiPercent,
  FiImage
} from "react-icons/fi";
import { MdBusiness } from "react-icons/md";

// Types
interface SalonSettings {
  id: string;
  salonName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber?: string;
  website?: string;
  logo?: string;
}

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  profileImage?: string;
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'profile'>('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Settings state
  const [settings, setSettings] = useState<SalonSettings>({
    id: '',
    salonName: 'BeauTech Salon',
    email: 'contact@beautech.com',
    phone: '+91 9876543210',
    address: '123, Fashion Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    gstNumber: '27ABCDE1234F1Z5',
    website: 'www.beautech.com',
    logo: '',
  });

  // Admin profile state
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    id: '',
    name: 'Admin User',
    email: 'admin@beautech.com',
    phone: '+91 9876543210',
    role: 'Super Admin',
    profileImage: '',
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Try to fetch existing settings
      const settingsQuery = query(collection(db, "settings"), where("type", "==", "salon"));
      const snapshot = await getDocs(settingsQuery);
      
      if (!snapshot.empty) {
        const settingsData = snapshot.docs[0].data() as SalonSettings;
        setSettings({ ...settingsData, id: snapshot.docs[0].id });
      }

      // Fetch admin profile
      if (auth.currentUser) {
        const userQuery = query(collection(db, "users"), where("email", "==", auth.currentUser.email));
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          setAdminProfile({
            id: userSnapshot.docs[0].id,
            name: userData.name || 'Admin User',
            email: userData.email || auth.currentUser.email || '',
            phone: userData.phone || '',
            role: userData.role || 'Admin',
            profileImage: userData.profileImage || '',
          });
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      setErrorMessage("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      setSuccessMessage('');
      setErrorMessage('');

      // Update or create settings document
      if (settings.id) {
        const settingsRef = doc(db, "settings", settings.id);
        await updateDoc(settingsRef, { ...settings, type: "salon" });
      } else {
        // Create new settings document
        const settingsRef = collection(db, "settings");
        await addDoc(settingsRef, { ...settings, type: "salon", createdAt: new Date() });
      }

      setSuccessMessage("Settings saved successfully!");
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setErrorMessage("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage("Please fill all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    try {
      setSaving(true);
      const user = auth.currentUser;
      if (!user || !user.email) return;

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      setSuccessMessage("Password updated successfully!");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error("Error changing password:", error);
      if (error.code === 'auth/wrong-password') {
        setErrorMessage("Current password is incorrect");
      } else {
        setErrorMessage("Failed to change password");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <Sidebar />
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <div style={styles.loadingText}>Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <Sidebar />
      
      <div style={styles.mainContent}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Settings</h1>
            <p style={styles.subtitle}>Manage your salon settings and preferences</p>
          </div>
          
          <button
            onClick={saveSettings}
            disabled={saving}
            style={{
              ...styles.saveButton,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
            className="action-button"
          >
            <FiSave size={18} color="#F5EFE6" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div style={styles.successMessage}>
            <FiCheck size={18} color="#F5EFE6" />
            <span>{successMessage}</span>
          </div>
        )}
        
        {errorMessage && (
          <div style={styles.errorMessage}>
            <FiX size={18} color="#F5EFE6" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Settings Tabs */}
        <div style={styles.tabsContainer}>
          <button
            onClick={() => setActiveTab('general')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'general' ? "#6A3C17" : "transparent",
              color: activeTab === 'general' ? "#F5EFE6" : "#6A3C17",
              borderColor: activeTab === 'general' ? "#6A3C17" : "#e0d6c8",
            }}
          >
            <FiSettings size={16} />
            <span>General</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              ...styles.tabButton,
              background: activeTab === 'profile' ? "#6A3C17" : "transparent",
              color: activeTab === 'profile' ? "#F5EFE6" : "#6A3C17",
              borderColor: activeTab === 'profile' ? "#6A3C17" : "#e0d6c8",
            }}
          >
            <FiUser size={16} />
            <span>Profile</span>
          </button>
        </div>

        {/* Tab Content */}
        <div style={styles.contentContainer}>
          {/* General Settings */}
          {activeTab === 'general' && (
            <div style={styles.tabContent}>
              <h2 style={styles.sectionTitle}>General Information</h2>
              
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <MdBusiness size={16} color="#6A3C17" style={{ marginRight: '6px' }} />
                    Salon Name
                  </label>
                  <input
                    type="text"
                    value={settings.salonName}
                    onChange={(e) => setSettings({ ...settings, salonName: e.target.value })}
                    style={styles.input}
                    placeholder="Enter salon name"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiMail size={16} color="#6A3C17" style={{ marginRight: '6px' }} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    style={styles.input}
                    placeholder="Enter email"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiPhone size={16} color="#6A3C17" style={{ marginRight: '6px' }} />
                    Phone
                  </label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    style={styles.input}
                    placeholder="Enter phone number"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiGlobe size={16} color="#6A3C17" style={{ marginRight: '6px' }} />
                    Website
                  </label>
                  <input
                    type="text"
                    value={settings.website}
                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                    style={styles.input}
                    placeholder="Enter website URL"
                  />
                </div>

                <div style={styles.formGroupFull}>
                  <label style={styles.label}>
                    <FiMapPin size={16} color="#6A3C17" style={{ marginRight: '6px' }} />
                    Address
                  </label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    style={styles.input}
                    placeholder="Enter address"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>City</label>
                  <input
                    type="text"
                    value={settings.city}
                    onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                    style={styles.input}
                    placeholder="City"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>State</label>
                  <input
                    type="text"
                    value={settings.state}
                    onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                    style={styles.input}
                    placeholder="State"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Pincode</label>
                  <input
                    type="text"
                    value={settings.pincode}
                    onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                    style={styles.input}
                    placeholder="Pincode"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiPercent size={16} color="#6A3C17" style={{ marginRight: '6px' }} />
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={settings.gstNumber}
                    onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
                    style={styles.input}
                    placeholder="Enter GST number"
                  />
                </div>

                <div style={styles.formGroupFull}>
                  <label style={styles.label}>
                    <FiImage size={16} color="#6A3C17" style={{ marginRight: '6px' }} />
                    Logo URL
                  </label>
                  <input
                    type="text"
                    value={settings.logo}
                    onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                    style={styles.input}
                    placeholder="Enter logo URL"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Profile Settings */}
          {activeTab === 'profile' && (
            <div style={styles.tabContent}>
              <h2 style={styles.sectionTitle}>Admin Profile</h2>
              
              <div style={styles.profileCard}>
                <div style={styles.profileHeader}>
                  <div style={styles.profileAvatar}>
                    {adminProfile.profileImage ? (
                      <img src={adminProfile.profileImage} alt="Profile" style={styles.avatarImage} />
                    ) : (
                      <div style={styles.avatarPlaceholder}>
                        {adminProfile.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div style={styles.profileInfo}>
                    <h3 style={styles.profileName}>{adminProfile.name}</h3>
                    <p style={styles.profileRole}>{adminProfile.role}</p>
                  </div>
                </div>

                <div style={styles.profileForm}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Full Name</label>
                    <input
                      type="text"
                      value={adminProfile.name}
                      onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input
                      type="email"
                      value={adminProfile.email}
                      disabled
                      style={{ ...styles.input, background: '#f5f5f5', cursor: 'not-allowed' }}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone</label>
                    <input
                      type="text"
                      value={adminProfile.phone}
                      onChange={(e) => setAdminProfile({ ...adminProfile, phone: e.target.value })}
                      style={styles.input}
                    />
                  </div>

                  {/* Password Change Section */}
                  <div style={styles.passwordSection}>
                    <button
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      style={styles.passwordToggle}
                    >
                      <FiLock size={16} color="#6A3C17" />
                      <span>Change Password</span>
                      <FiEdit2 size={14} color="#8B6B4D" />
                    </button>

                    {showPasswordForm && (
                      <div style={styles.passwordForm}>
                        <div style={styles.formGroup}>
                          <label style={styles.label}>Current Password</label>
                          <input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            style={styles.input}
                            placeholder="Enter current password"
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>New Password</label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            style={styles.input}
                            placeholder="Enter new password"
                          />
                        </div>

                        <div style={styles.formGroup}>
                          <label style={styles.label}>Confirm Password</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={styles.input}
                            placeholder="Confirm new password"
                          />
                        </div>

                        <button
                          onClick={handlePasswordChange}
                          disabled={saving}
                          style={styles.updatePasswordButton}
                        >
                          <FiLock size={16} color="#F5EFE6" />
                          <span>Update Password</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
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
    marginBottom: "20px",
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

  saveButton: {
    padding: "10px 20px",
    background: "#6A3C17",
    border: "none",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: "14px",
    fontWeight: "500",
    color: "#F5EFE6",
    boxShadow: "0 4px 6px rgba(106, 60, 23, 0.2)",
  },

  successMessage: {
    padding: "12px 16px",
    background: "#10b981",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#F5EFE6",
    fontSize: "14px",
    marginBottom: "16px",
  },

  errorMessage: {
    padding: "12px 16px",
    background: "#dc2626",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: "#F5EFE6",
    fontSize: "14px",
    marginBottom: "16px",
  },

  tabsContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    flexShrink: 0,
    overflowX: "auto" as const,
    paddingBottom: "4px",
  },

  tabButton: {
    padding: "10px 16px",
    border: "1px solid #e0d6c8",
    borderRadius: "8px",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: "14px",
    fontWeight: "500",
    whiteSpace: "nowrap" as const,
  },

  contentContainer: {
    flex: 1,
    overflow: "auto",
    padding: "4px",
  },

  tabContent: {
    background: "white",
    borderRadius: "16px",
    padding: "24px",
    border: "1px solid #e0d6c8",
    boxShadow: "0 4px 12px rgba(106, 60, 23, 0.08)",
  },

  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#6A3C17",
    margin: "0 0 20px 0",
    paddingBottom: "12px",
    borderBottom: "2px solid #e0d6c8",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },

  formGroupFull: {
    gridColumn: "span 2",
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },

  label: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#6A3C17",
    display: "flex",
    alignItems: "center",
  },

  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #e0d6c8",
    fontSize: "14px",
    outline: "none",
    background: "#F5EFE6",
    color: "#4a3a2a",
    transition: "border 0.2s ease",
  },

  profileCard: {
    background: "#F5EFE6",
    borderRadius: "12px",
    padding: "24px",
  },

  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "24px",
  },

  profileAvatar: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    overflow: "hidden",
    background: "#6A3C17",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  },

  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    fontWeight: "600",
    color: "#F5EFE6",
    background: "#8a5424",
  },

  profileInfo: {
    flex: 1,
  },

  profileName: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#6A3C17",
    margin: "0 0 4px 0",
  },

  profileRole: {
    fontSize: "14px",
    color: "#8B6B4D",
    margin: 0,
  },

  profileForm: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },

  passwordSection: {
    marginTop: "16px",
    borderTop: "1px solid #e0d6c8",
    paddingTop: "20px",
  },

  passwordToggle: {
    background: "transparent",
    border: "1px solid #e0d6c8",
    borderRadius: "8px",
    padding: "10px 16px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "#6A3C17",
    width: "fit-content",
  },

  passwordForm: {
    marginTop: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },

  updatePasswordButton: {
    padding: "10px 20px",
    background: "#6A3C17",
    border: "none",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    color: "#F5EFE6",
    marginTop: "8px",
  },

  loadingContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "center",
    background: "white",
    borderRadius: "16px",
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
};

// Add global styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .action-button:hover {
    background: #8a5424 !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(106, 60, 23, 0.25) !important;
  }

  .tab-button:hover {
    background: #F5EFE6 !important;
    border-color: #6A3C17 !important;
    color: #6A3C17 !important;
  }

  input:focus, select:focus, textarea:focus {
    border-color: #6A3C17 !important;
    box-shadow: 0 0 0 3px rgba(106, 60, 23, 0.1) !important;
  }

  .password-toggle:hover {
    background: #F5EFE6 !important;
    border-color: #6A3C17 !important;
  }

  .update-password-button:hover {
    background: #8a5424 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(106, 60, 23, 0.3) !important;
  }
`;
document.head.appendChild(styleSheet);

export default Settings;