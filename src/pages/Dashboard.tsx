import React, { useEffect, useState, useRef } from "react";
import { collection, getDocs, query, where, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, auth } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import emailjs from "@emailjs/browser";

// React Icons Imports
import { FiUsers, FiScissors, FiCalendar, FiClock, FiBell } from "react-icons/fi";
import { FaStar, FaUserCircle } from "react-icons/fa";

// Types
interface Activity {
  id: string;
  stylist: string;
  customer: string;
  time: string;
  date: string;
  service: string;
}

interface TopStylist {
  name: string;
  bookings: number;
  rating: string;
}

interface PendingStylist {
  id: string;
  fullName?: string;
  displayName?: string;
  name?: string;
  email?: string;
  cvUrl?: string;
  status?: string;
  role?: string;
}

interface AlertState {
  visible: boolean;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

// Custom Alert Component
const CustomAlert = ({ visible, type, title, message, onClose }: { 
  visible: boolean; 
  type: string; 
  title: string; 
  message: string; 
  onClose: () => void;
}) => {
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

const Dashboard: React.FC = () => {
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [totalStylists, setTotalStylists] = useState<number>(0);
  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [todayBookings, setTodayBookings] = useState<number>(0);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [topStylists, setTopStylists] = useState<TopStylist[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [pendingStylists, setPendingStylists] = useState<PendingStylist[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [alert, setAlert] = useState<AlertState>({ visible: false, type: 'info', title: '', message: '' });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fixed showAlert with proper state update
  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlert({ visible: true, type, title, message });
    setTimeout(() => {
      setAlert(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if user is logged in
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate("/");
    } else {
      setCheckingAuth(false);
    }
  }, [navigate]);

  // Update current time and date
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }));
      setCurrentDate(now.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }));
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real-time pending stylists
  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "stylist"),
      where("status", "==", "pending")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: PendingStylist[] = [];
      snapshot.forEach((doc) => {
        list.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setPendingStylists(list);
    });

    return () => unsubscribe();
  }, []);

  // Updated APPROVE FUNCTION with emailjs
  const approveStylist = async (id: string, name: string, email: string) => {
    try {
      await updateDoc(doc(db, "users", id), {
        status: "approved",
      });

      // Send approval email
      await emailjs.send(
        "service_uncv0el",
        "template_pg0oiii",
        {
          name: name,
          user_email: email,
          from_name: "BeauTech Official",
          reply_to: "beautechofficialinfo@gmail.com",
        },
        "l_nRTI4bTXU3BagD7"
      );

      showAlert("success", "Stylist Approved", `${name} approved & email sent successfully!`);
    } catch (error) {
      console.error("Error approving stylist:", error);
      showAlert("error", "Error", "Failed to approve stylist. Please try again.");
    }
  };

  // Updated REJECT FUNCTION with emailjs
  const rejectStylist = async (id: string, name: string, email: string) => {
    try {
      await updateDoc(doc(db, "users", id), {
        status: "rejected",
      });

      // Send rejection email
      await emailjs.send(
        "service_uncv0el",
        "template_ajbwvty",
        {
          name: name,
          user_email: email,
          from_name: "BeauTech Official",
          reply_to: "beautechofficialinfo@gmail.com",
        },
        "l_nRTI4bTXU3BagD7"
      );

      showAlert("warning", "Stylist Rejected", `${name} rejected & email sent.`);
    } catch (error) {
      console.error("Error rejecting stylist:", error);
      showAlert("error", "Error", "Failed to reject stylist. Please try again.");
    }
  };

  // Optimized fetchCounts with Promise.all for better performance
  const fetchCounts = async () => {
    try {
      setLoading(true);

      // Parallel queries for counts
      const [customersSnapshot, stylistsSnapshot] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "customer"))),
        getDocs(query(collection(db, "users"), where("role", "==", "stylist"), where("status", "==", "approved")))
      ]);

      setTotalCustomers(customersSnapshot.size);
      setTotalStylists(stylistsSnapshot.size);

      // Parallel fetch for all stylist bookings
      const today = new Date().toDateString();
      const stylistPromises = stylistsSnapshot.docs.map(async (stylistDoc) => {
        const stylistId = stylistDoc.id;
        const stylistData = stylistDoc.data();
        const stylistName = stylistData?.fullName || stylistData?.displayName || stylistData?.name || stylistData?.email?.split('@')[0] || `Stylist ${stylistId.slice(0, 4)}`;
        
        const bookedSlotsQuery = query(collection(db, "stylists", stylistId, "slots"), where("isBooked", "==", true));
        const bookedSlotsSnapshot = await getDocs(bookedSlotsQuery);
        
        const slotsData = await Promise.all(bookedSlotsSnapshot.docs.map(async (slotDoc) => {
          const slotData = slotDoc.data();
          let customerName = "Customer";
          
          if (slotData.customerId) {
            const userDoc = await getDoc(doc(db, "users", slotData.customerId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              customerName = userData?.fullName || userData?.displayName || userData?.name || userData?.email?.split('@')[0] || "Customer";
            }
          }
          
          return {
            slotDoc,
            slotData,
            customerName,
            isToday: slotData.date && new Date(slotData.date).toDateString() === today
          };
        }));
        
        return {
          stylistName,
          bookingsCount: bookedSlotsSnapshot.size,
          slotsData,
          rating: (4 + Math.random()).toFixed(1)
        };
      });
      
      const stylistResults = await Promise.all(stylistPromises);
      
      // Aggregate results
      let totalBookingsCount = 0;
      let todayBookingsCount = 0;
      const recentActs: Activity[] = [];
      const topStylistData: TopStylist[] = [];
      
      for (const result of stylistResults) {
        totalBookingsCount += result.bookingsCount;
        todayBookingsCount += result.slotsData.filter(s => s.isToday).length;
        
        for (const { slotDoc, slotData, customerName, isToday } of result.slotsData) {
          if (recentActs.length < 5 && slotData.date) {
            recentActs.push({
              id: slotDoc.id,
              stylist: result.stylistName,
              customer: customerName,
              time: slotData.time || slotData.startTime,
              date: slotData.date,
              service: slotData.serviceName || slotData.service || "Beauty Service"
            });
          }
        }
        
        topStylistData.push({
          name: result.stylistName,
          bookings: result.bookingsCount,
          rating: result.rating
        });
      }
      
      setTotalBookings(totalBookingsCount);
      setTodayBookings(todayBookingsCount);
      setTopStylists(topStylistData.sort((a, b) => b.bookings - a.bookings).slice(0, 3));
      setRecentActivities(recentActs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5));

    } catch (error) {
      console.error("Dashboard fetch error:", error);
      showAlert("error", "Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
      showAlert("success", "Logged Out", "You have been logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      showAlert("error", "Error", "Failed to logout. Please try again.");
    }
  };

  useEffect(() => {
    if (!checkingAuth) {
      fetchCounts();
    }
  }, [checkingAuth]);

  // Loading Screen
  if (checkingAuth) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <img src="/logo.png" alt="BeauTech" style={{ width: "150px", marginBottom: "20px" }} />
          <div style={styles.loadingSpinner}></div>
          <div style={styles.loadingText}>Checking authentication...</div>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: "Total Customers",
      value: totalCustomers,
      icon: <FiUsers size={28} color="#F5EFE6" />,
      change: "+12%",
    },
    {
      title: "Total Stylists",
      value: totalStylists,
      icon: <FiScissors size={28} color="#F5EFE6" />,
      change: "+2",
    },
    {
      title: "Total Bookings",
      value: totalBookings,
      icon: <FiCalendar size={28} color="#F5EFE6" />,
      change: "+23%",
    },
    {
      title: "Today's Bookings",
      value: todayBookings,
      icon: <FiClock size={28} color="#F5EFE6" />,
      change: todayBookings > 0 ? "Active" : "No bookings",
    },
  ];

  return (
    <div style={styles.container}>
      <Sidebar />
      
      <div style={styles.mainContent}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.greeting}>Welcome back, Admin!</h1>
            <p style={styles.subGreeting}>{currentDate}</p>
          </div>
          
          <div style={styles.headerRight}>
            <div style={styles.timeBox}>
              <FiClock size={18} color="#6A3C17" />
              <span style={styles.timeText}>{currentTime}</span>
            </div>
            
            <div style={styles.bellBox} ref={dropdownRef}>
              <div 
                style={styles.bellIconWrapper}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <FiBell size={18} color="#F5EFE6" />
                {pendingStylists.length > 0 && (
                  <span style={styles.notificationBadge}>
                    {pendingStylists.length}
                  </span>
                )}
              </div>
              
              {showDropdown && (
                <div style={styles.pendingDropdown}>
                  <div style={styles.dropdownHeader}>
                    <h4 style={styles.dropdownTitle}>Pending Stylist Requests</h4>
                    <span style={styles.dropdownCount}>{pendingStylists.length} new</span>
                  </div>
                  <div style={styles.pendingList}>
                    {pendingStylists.length === 0 ? (
                      <div style={styles.noPending}>No pending requests</div>
                    ) : (
                      pendingStylists.map((stylist) => {
                        const stylistName = stylist.fullName || stylist.displayName || stylist.name || stylist.email?.split('@')[0] || "Stylist";
                        const stylistEmail = stylist.email || "";
                        
                        return (
                          <div key={stylist.id} style={styles.pendingItem}>
                            <div style={styles.pendingInfo}>
                              <p style={styles.pendingName}>{stylistName}</p>
                              <p style={styles.pendingEmail}>{stylistEmail}</p>
                              
                              {stylist.cvUrl && (
                                <a 
                                  href={stylist.cvUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={styles.viewCvLink}
                                >
                                  View CV
                                </a>
                              )}
                            </div>
                            
                            <div style={styles.pendingActions}>
                              <button
                                onClick={() => approveStylist(stylist.id, stylistName, stylistEmail)}
                                style={styles.approveButton}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectStylist(stylist.id, stylistName, stylistEmail)}
                                style={styles.rejectButton}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={styles.loadingDashboard}>
            <div style={styles.loadingSpinner}></div>
            <div style={styles.loadingText}>Loading dashboard data...</div>
          </div>
        ) : (
          <div style={styles.contentArea}>
            <div style={styles.statsGrid}>
              {statsCards.map((stat, index) => (
                <div key={index} style={styles.statCard}>
                  <div style={styles.statIcon}>
                    {stat.icon}
                  </div>
                  <div style={styles.statInfo}>
                    <div style={styles.statTitle}>{stat.title}</div>
                    <div style={styles.statValue}>{stat.value}</div>
                    <div style={styles.statChange}>
                      {stat.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.twoColumnGrid}>
              <div style={styles.recentActivitiesCard}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>📋 Recent Activities</h3>
                  <span style={styles.cardBadge}>Latest 5</span>
                </div>
                
                <div style={styles.activitiesList}>
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity, index) => (
                      <div key={index} style={styles.activityItem}>
                        <div style={styles.activityIcon}>
                          <FaUserCircle size={18} color="#6A3C17" />
                        </div>
                        <div style={styles.activityDetails}>
                          <div style={styles.activityText}>
                            <strong>{activity.customer}</strong> booked with{" "}
                            <strong>{activity.stylist}</strong>
                          </div>
                          <div style={styles.activityTime}>
                            {new Date(activity.date).toLocaleDateString()} at {activity.time} • {activity.service}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={styles.emptyState}>No recent activities</div>
                  )}
                </div>
              </div>

              <div style={styles.topStylistsCard}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.cardTitle}>⭐ Top Stylists</h3>
                  <span style={styles.cardBadge}>This Month</span>
                </div>
                
                <div style={styles.stylistsList}>
                  {topStylists.length > 0 ? (
                    topStylists.map((stylist, index) => (
                      <div key={index} style={styles.stylistItem}>
                        <div style={styles.stylistIcon}>
                          <FaStar size={18} color="#FFB800" />
                        </div>
                        <div style={styles.stylistDetails}>
                          <div style={styles.stylistName}>{stylist.name}</div>
                          <div style={styles.stylistStats}>
                            <span>{stylist.bookings} bookings</span>
                            <span style={styles.stylistRating}>
                              <FaStar size={10} color="#FFB800" style={{ marginRight: '2px' }} />
                              {stylist.rating}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={styles.emptyState}>No stylist data available</div>
                  )}
                </div>
              </div>
            </div>

            <div style={styles.systemStatusCard}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>🖥️ System Status</h3>
              </div>
              
              <div style={styles.statusGrid}>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Database</span>
                  <span style={{...styles.statusValue, color: "#10b981"}}>● Connected</span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Authentication</span>
                  <span style={{...styles.statusValue, color: "#10b981"}}>● Active</span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Last Backup</span>
                  <span style={styles.statusValue}>Today 2:00 AM</span>
                </div>
                <div style={styles.statusItem}>
                  <span style={styles.statusLabel}>Server Uptime</span>
                  <span style={styles.statusValue}>99.9%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <CustomAlert 
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert(prev => ({ ...prev, visible: false }))}
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
    overflow: "auto",
    display: "flex",
    flexDirection: "column" as const,
    background: "#F5EFE6",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexShrink: 0,
  },

  greeting: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#6A3C17",
    margin: "0 0 4px 0",
  },

  subGreeting: {
    fontSize: "14px",
    color: "#8B6B4D",
    margin: 0,
  },

  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  timeBox: {
    background: "white",
    padding: "10px 20px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    border: "1px solid #e0d6c8",
    boxShadow: "0 2px 4px rgba(106, 60, 23, 0.05)",
  },

  timeText: {
    fontSize: "16px",
    fontWeight: "500",
    color: "#6A3C17",
  },

  bellBox: {
    position: "relative" as const,
  },

  bellIconWrapper: {
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17, #4b2608)",
    padding: "10px",
    borderRadius: "10px",
    border: "2px solid #F5EFE6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    position: "relative" as const,
  },

  notificationBadge: {
    position: "absolute" as const,
    top: "-5px",
    right: "-5px",
    background: "#ff4444",
    color: "white",
    fontSize: "10px",
    fontWeight: "600",
    minWidth: "18px",
    height: "18px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 4px",
    border: "2px solid #F5EFE6",
  },

  pendingDropdown: {
    position: "absolute" as const,
    top: "50px",
    right: "0",
    width: "320px",
    background: "white",
    borderRadius: "10px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.2)",
    zIndex: 1000,
    overflow: "hidden",
    border: "1px solid #e0d6c8",
  },

  dropdownHeader: {
    padding: "15px",
    borderBottom: "1px solid #e0d6c8",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#F5EFE6",
  },

  dropdownTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#6A3C17",
    margin: 0,
  },

  dropdownCount: {
    fontSize: "11px",
    padding: "2px 6px",
    background: "#6A3C17",
    color: "#F5EFE6",
    borderRadius: "10px",
  },

  pendingList: {
    maxHeight: "350px",
    overflowY: "auto" as const,
  },

  pendingItem: {
    padding: "15px",
    borderBottom: "1px solid #f0e2d2",
  },

  pendingInfo: {
    marginBottom: "10px",
  },

  pendingName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#4a3a2a",
    margin: "0 0 4px 0",
  },

  pendingEmail: {
    fontSize: "12px",
    color: "#8B6B4D",
    margin: "0 0 8px 0",
  },

  viewCvLink: {
    fontSize: "12px",
    color: "#6A3C17",
    textDecoration: "none",
    fontWeight: "500",
    display: "inline-block",
    padding: "4px 8px",
    background: "#F5EFE6",
    borderRadius: "4px",
  },

  pendingActions: {
    display: "flex",
    gap: "8px",
  },

  approveButton: {
    flex: 1,
    padding: "8px",
    background: "#10b981",
    color: "white",
    border: "none",
    borderRadius: "5px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  rejectButton: {
    flex: 1,
    padding: "8px",
    background: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "5px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  noPending: {
    padding: "20px",
    textAlign: "center" as const,
    color: "#8B6B4D",
    fontSize: "13px",
  },

  contentArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    flexShrink: 0,
  },

  statCard: {
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17, #4b2608)",
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    gap: "16px",
    border: "1px solid #8a5424",
    boxShadow: "0 4px 6px rgba(106, 60, 23, 0.2)",
  },

  statIcon: {
    width: "56px",
    height: "56px",
    background: "rgba(255,255,255,0.15)",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  statInfo: {
    flex: 1,
  },

  statTitle: {
    fontSize: "13px",
    color: "#F5EFE6",
    marginBottom: "4px",
  },

  statValue: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#F5EFE6",
    marginBottom: "4px",
  },

  statChange: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#F5EFE6",
    opacity: 0.9,
  },

  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    gap: "20px",
    flexShrink: 0,
  },

  recentActivitiesCard: {
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #e0d6c8",
    boxShadow: "0 4px 6px rgba(106, 60, 23, 0.05)",
    height: "380px",
    display: "flex",
    flexDirection: "column" as const,
  },

  topStylistsCard: {
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #e0d6c8",
    boxShadow: "0 4px 6px rgba(106, 60, 23, 0.05)",
    height: "380px",
    display: "flex",
    flexDirection: "column" as const,
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    flexShrink: 0,
  },

  cardTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#6A3C17",
    margin: 0,
  },

  cardBadge: {
    fontSize: "11px",
    padding: "4px 8px",
    background: "#F5EFE6",
    borderRadius: "12px",
    color: "#6A3C17",
  },

  activitiesList: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    overflowY: "auto" as const,
  },

  activityItem: {
    display: "flex",
    gap: "12px",
    padding: "8px",
    borderBottom: "1px solid #f0e2d2",
  },

  activityIcon: {
    width: "32px",
    height: "32px",
    background: "#F5EFE6",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  activityDetails: {
    flex: 1,
  },

  activityText: {
    fontSize: "13px",
    color: "#4a3a2a",
    marginBottom: "2px",
  },

  activityTime: {
    fontSize: "11px",
    color: "#8B6B4D",
  },

  stylistsList: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    overflowY: "auto" as const,
  },

  stylistItem: {
    display: "flex",
    gap: "12px",
    padding: "8px",
    borderBottom: "1px solid #f0e2d2",
    alignItems: "center",
  },

  stylistIcon: {
    width: "32px",
    height: "32px",
    background: "#F5EFE6",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  stylistDetails: {
    flex: 1,
  },

  stylistName: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#4a3a2a",
    marginBottom: "2px",
  },

  stylistStats: {
    display: "flex",
    gap: "12px",
    fontSize: "11px",
    color: "#8B6B4D",
    alignItems: "center",
  },

  stylistRating: {
    color: "#FFB800",
    display: "flex",
    alignItems: "center",
  },

  emptyState: {
    textAlign: "center" as const,
    padding: "20px",
    color: "#8B6B4D",
    fontSize: "13px",
  },

  systemStatusCard: {
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    border: "1px solid #e0d6c8",
    boxShadow: "0 4px 6px rgba(106, 60, 23, 0.05)",
    flexShrink: 0,
  },

  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
  },

  statusItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },

  statusLabel: {
    fontSize: "12px",
    color: "#8B6B4D",
  },

  statusValue: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#4a3a2a",
  },

  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    width: "100vw",
    background: "#F5EFE6",
  },

  loadingContent: {
    textAlign: "center" as const,
    background: "white",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(106, 60, 23, 0.1)",
  },

  loadingDashboard: {
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    background: "white",
    borderRadius: "16px",
    gap: "20px",
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
  },
};

// Add global styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes alertPop {
    0% { transform: scale(0.8); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }

  * {
    font-family: 'Poppins', sans-serif;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    overflow: hidden;
  }

  .bell-icon-wrapper:hover {
    transform: scale(1.05);
  }

  .approve-button:hover {
    background: #0ca678 !important;
  }

  .reject-button:hover {
    background: #dc2626 !important;
  }
`;
document.head.appendChild(styleSheet);

export default Dashboard;