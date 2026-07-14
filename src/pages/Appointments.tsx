import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import Sidebar from "../components/Sidebar";
import { 
  FiCalendar, 
  FiClock, 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiDollarSign,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiTrash2,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiEye,
  FiBell
} from "react-icons/fi";

// Types
interface Appointment {
  id: string;
  stylistId: string;
  stylistName: string;
  stylistEmail?: string;
  stylistPhone?: string;
  date: string;
  startTime: string;
  endTime: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceName: string;
  servicePrice?: number;
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no-show' | 'available';
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  paymentMethod?: string;
  amount?: number;
  bookingDate: Timestamp;
  notes?: string;
  reminders: {
    email: boolean;
    sms: boolean;
    whatsapp: boolean;
    notification?: boolean;
  };
  history?: {
    action: string;
    timestamp: Timestamp;
    performedBy: string;
  }[];
}

interface FilterOptions {
  status: string;
  stylist: string;
  dateRange: 'today' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  search: string;
}

interface Stats {
  total: number;
  confirmed: number;
  pending: number;
  completed: number;
  cancelled: number;
  revenue: number;
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
          <button onClick={onCancel} style={styles.confirmCancelButton}>
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

const Appointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [stylists, setStylists] = useState<{ id: string; name: string }[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [alert, setAlert] = useState({ visible: false, type: 'info', title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', action: null as any, itemId: '' });
  const itemsPerPage: number = 10;
  
  const [stats, setStats] = useState<Stats>({
    total: 0,
    confirmed: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    revenue: 0,
  });
  
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    stylist: 'all',
    dateRange: 'month',
    search: '',
  });

  const showAlert = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => {
    setAlert({ visible: true, type, title, message });
    setTimeout(() => setAlert({ ...alert, visible: false }), 3000);
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchAllAppointments();
    fetchStylists();
  }, []);

  // Apply filters whenever appointments change
  useEffect(() => {
    applyFilters();
  }, [appointments, filters]);

  // Calculate stats whenever appointments change
  useEffect(() => {
    calculateStats();
  }, [appointments]);

  // Fetch all stylists
  const fetchStylists = async (): Promise<void> => {
    try {
      const usersRef = collection(db, "users");
      const stylistsQuery = query(usersRef, where("role", "==", "stylist"));
      const snapshot = await getDocs(stylistsQuery);
      const stylistList = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name || doc.data().fullName || 'Stylist',
      }));
      setStylists(stylistList);
      console.log("Stylists found:", stylistList.length);
    } catch (error) {
      console.error("Error fetching stylists:", error);
    }
  };

  // FIXED: Fetch ALL appointments (booked, completed, cancelled, pending - sab)
  const fetchAllAppointments = async (): Promise<void> => {
    try {
      setLoading(true);
      const allAppointments: Appointment[] = [];

      // Get all stylists from users collection with role "stylist"
      const usersRef = collection(db, "users");
      const stylistsQuery = query(usersRef, where("role", "==", "stylist"));
      const stylistsSnapshot = await getDocs(stylistsQuery);
      
      console.log("Total stylists found:", stylistsSnapshot.size);

      for (const stylistDoc of stylistsSnapshot.docs) {
        const stylistId = stylistDoc.id;
        const stylistData = stylistDoc.data();
        
        console.log(`Fetching slots for stylist: ${stylistData.name || stylistId}`);

        // FIXED: Get ALL slots - NO isBooked filter
        const slotsRef = collection(db, "stylists", stylistId, "slots");
        const slotsSnapshot = await getDocs(slotsRef);
        
        console.log(`Total slots for ${stylistData.name || stylistId}: ${slotsSnapshot.size}`);

        for (const slotDoc of slotsSnapshot.docs) {
          const slotData = slotDoc.data();
          
          // FIXED: Process ALL slots, not just booked ones
          // Har slot ko appointment mein include karein chahe wo booked ho ya nahi
          
          // Fetch customer details if customerId exists
          let customerData: any = {};
          let customerName = "No Customer";
          let customerEmail = "Not assigned";
          let customerPhone = "";
          
          if (slotData.customerId) {
            try {
              const userRef = doc(db, "users", slotData.customerId);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                customerData = userSnap.data();
                customerName = customerData?.name || customerData?.fullName || "Unknown Customer";
                customerEmail = customerData?.email || "Not provided";
                customerPhone = customerData?.phone || "";
              }
            } catch (err) {
              console.error("Error fetching customer:", err);
            }
          } else {
            // Agar customerId nahi hai to slot available hai
            customerName = "Available Slot";
          }

          // Determine status based on slot data
          let status = 'pending';
          if (slotData.status === 'completed' || slotData.isCompleted) status = 'completed';
          else if (slotData.status === 'cancelled' || slotData.isCancelled) status = 'cancelled';
          else if (slotData.status === 'confirmed') status = 'confirmed';
          else if (slotData.isBooked && !slotData.status) status = 'confirmed';
          else if (!slotData.isBooked && !slotData.customerId) status = 'available';

          // FIXED: Saari slots ko add karein (available bhi)
          allAppointments.push({
            id: slotDoc.id,
            stylistId,
            stylistName: stylistData?.name || stylistData?.fullName || "Stylist",
            stylistEmail: stylistData?.email,
            stylistPhone: stylistData?.phone,
            date: slotData.date,
            startTime: slotData.startTime,
            endTime: slotData.endTime,
            customerId: slotData.customerId || '',
            customerName: customerName,
            customerEmail: customerEmail,
            customerPhone: customerPhone,
            serviceName: slotData.serviceName || slotData.service || stylistData?.specialty || "General Service",
            servicePrice: slotData.servicePrice || slotData.price,
            status: status as any,
            paymentStatus: slotData.paymentStatus || 'unpaid',
            paymentMethod: slotData.paymentMethod,
            amount: slotData.servicePrice || slotData.price || 0,
            bookingDate: slotData.bookingDate || slotData.createdAt || Timestamp.now(),
            notes: slotData.notes || '',
            reminders: slotData.reminders || { email: false, sms: false, whatsapp: false },
            history: slotData.history || [],
          });
        }
      }

      // Sort by date (latest first)
      allAppointments.sort((a, b) => b.date.localeCompare(a.date));
      setAppointments(allAppointments);
      console.log("Total appointments loaded:", allAppointments.length);
      
      if (allAppointments.length === 0) {
        showAlert('info', 'No Appointments', 'No appointments found in the system');
      }
      
    } catch (error) {
      console.error("Error fetching appointments:", error);
      showAlert('error', 'Error', 'Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics from all appointments
  const calculateStats = (): void => {
    const total = appointments.length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const revenue = appointments.reduce((sum, a) => sum + (a.amount || 0), 0);
    
    console.log("Stats calculated:", { total, confirmed, pending, completed, cancelled, revenue });
    
    setStats({ total, confirmed, pending, completed, cancelled, revenue });
  };

  // Apply filters
  const applyFilters = (): void => {
    let filtered = [...appointments];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(a => a.status === filters.status);
    }

    // Stylist filter
    if (filters.stylist !== 'all') {
      filtered = filtered.filter(a => a.stylistId === filters.stylist);
    }

    // Date range filter
    const today = new Date();
    if (filters.dateRange === 'today') {
      const todayStr = today.toISOString().split('T')[0];
      filtered = filtered.filter(a => a.date === todayStr);
    } else if (filters.dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(a => new Date(a.date) >= weekAgo);
    } else if (filters.dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(a => new Date(a.date) >= monthAgo);
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(a => 
        a.customerName.toLowerCase().includes(searchLower) ||
        a.customerEmail.toLowerCase().includes(searchLower) ||
        a.stylistName.toLowerCase().includes(searchLower)
      );
    }

    setFilteredAppointments(filtered);
    setCurrentPage(1);
  };

  // Update appointment status
  const handleStatusUpdate = async (appointmentId: string, newStatus: Appointment['status']): Promise<void> => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;

      const slotRef = doc(db, "stylists", appointment.stylistId, "slots", appointmentId);
      await updateDoc(slotRef, {
        status: newStatus,
      });

      const updatedAppointments = appointments.map(a => 
        a.id === appointmentId ? { ...a, status: newStatus } : a
      );
      setAppointments(updatedAppointments);
      
      showAlert('success', 'Success', `Appointment marked as ${newStatus}`);
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Error updating status:", error);
      showAlert('error', 'Error', 'Failed to update status');
    }
  };

  // Update payment status
  const handlePaymentUpdate = async (appointmentId: string, paymentStatus: Appointment['paymentStatus']): Promise<void> => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;

      const slotRef = doc(db, "stylists", appointment.stylistId, "slots", appointmentId);
      await updateDoc(slotRef, {
        paymentStatus: paymentStatus,
      });

      const updatedAppointments = appointments.map(a => 
        a.id === appointmentId ? { ...a, paymentStatus } : a
      );
      setAppointments(updatedAppointments);
      
      showAlert('success', 'Success', `Payment status updated to ${paymentStatus}`);
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Error updating payment:", error);
      showAlert('error', 'Error', 'Failed to update payment');
    }
  };

  // Delete appointment
  const handleDeleteAppointment = async (appointmentId: string): Promise<void> => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;

      const slotRef = doc(db, "stylists", appointment.stylistId, "slots", appointmentId);
      await deleteDoc(slotRef);

      const updatedAppointments = appointments.filter(a => a.id !== appointmentId);
      setAppointments(updatedAppointments);
      
      showAlert('success', 'Deleted', 'Appointment deleted successfully');
      setShowDetailsModal(false);
    } catch (error) {
      console.error("Error deleting appointment:", error);
      showAlert('error', 'Error', 'Failed to delete appointment');
    }
  };

  // Send reminder
  const handleSendReminder = async (appointment: Appointment): Promise<void> => {
    try {
      const userRef = doc(db, "users", appointment.customerId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        showAlert("error", "Error", "Customer record not found");
        return;
      }

      const userData = userSnap.data();
      const expoToken = userData.expoPushToken;

      if (!expoToken) {
        showAlert("error", "Error", "Customer notification token not found");
        return;
      }

      const message = `Hello ${appointment.customerName}! 
Your appointment is on ${appointment.date} at ${appointment.startTime} with ${appointment.stylistName} for ${appointment.serviceName}.`;

      const notificationBody = {
        to: expoToken,
        sound: "default",
        title: "BeauTech Appointment Reminder",
        body: message,
        data: { appointmentId: appointment.id }
      };

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationBody),
      });

      const slotRef = doc(db, "stylists", appointment.stylistId, "slots", appointment.id);
      await updateDoc(slotRef, {
        "reminders.notification": true,
      });

      const updatedAppointments = appointments.map(a =>
        a.id === appointment.id
          ? {
              ...a,
              reminders: { ...a.reminders, notification: true },
            }
          : a
      );

      setAppointments(updatedAppointments);
      showAlert("success", "Success", `Notification sent to ${appointment.customerName}`);
    } catch (error) {
      console.error("Notification error:", error);
      showAlert("error", "Error", "Failed to send notification");
    }
  };

  // Export to CSV
  const exportToCSV = (): void => {
    try {
      const headers = ['Date', 'Time', 'Stylist', 'Customer', 'Phone', 'Email', 'Service', 'Status', 'Payment', 'Amount'];
      const csvData = filteredAppointments.map(a => [
        a.date,
        `${a.startTime} - ${a.endTime}`,
        a.stylistName,
        a.customerName,
        a.customerPhone || 'N/A',
        a.customerEmail,
        a.serviceName,
        a.status,
        a.paymentStatus,
        `₹${a.amount || 0}`,
      ]);

      const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appointments_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      showAlert('success', 'Success', 'Data exported successfully');
    } catch (error) {
      console.error("Error exporting:", error);
      showAlert('error', 'Error', 'Failed to export data');
    }
  };

  // Reset filters
  const resetFilters = (): void => {
    setFilters({
      status: 'all',
      stylist: 'all',
      dateRange: 'month',
      search: '',
    });
    showAlert('info', 'Info', 'Filters cleared');
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAppointments.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);

  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Get status badge style - FIXED: Return React elements properly
  const getStatusStyle = (status: string) => {
    const icons = {
      confirmed: React.createElement(FiCheckCircle, { size: 14, color: "#2e7d32" }),
      pending: React.createElement(FiAlertCircle, { size: 14, color: "#ed6c02" }),
      completed: React.createElement(FiCheckCircle, { size: 14, color: "#0d47a1" }),
      cancelled: React.createElement(FiXCircle, { size: 14, color: "#c62828" }),
      available: React.createElement(FiCalendar, { size: 14, color: "#3949ab" }),
      'no-show': React.createElement(FiXCircle, { size: 14, color: "#424242" }),
    };
    
    const stylesMap: Record<string, { bg: string; text: string; icon: React.ReactElement }> = {
      confirmed: { 
        bg: '#e6f7e6', 
        text: '#2e7d32',
        icon: icons.confirmed
      },
      pending: { 
        bg: '#fff3e0', 
        text: '#ed6c02',
        icon: icons.pending
      },
      completed: { 
        bg: '#e3f2fd', 
        text: '#0d47a1',
        icon: icons.completed
      },
      cancelled: { 
        bg: '#ffebee', 
        text: '#c62828',
        icon: icons.cancelled
      },
      available: { 
        bg: '#e8eaf6', 
        text: '#3949ab',
        icon: icons.available
      },
      'no-show': { 
        bg: '#f5f5f5', 
        text: '#424242',
        icon: icons['no-show']
      },
    };
    return stylesMap[status] || stylesMap.pending;
  };

  // Get payment badge style - FIXED: Return React elements properly
  const getPaymentStyle = (status: string) => {
    const icons = {
      paid: React.createElement(FiDollarSign, { size: 14, color: "#2e7d32" }),
      unpaid: React.createElement(FiDollarSign, { size: 14, color: "#c62828" }),
      partial: React.createElement(FiDollarSign, { size: 14, color: "#ed6c02" }),
    };
    
    const stylesMap: Record<string, { bg: string; text: string; icon: React.ReactElement }> = {
      paid: { 
        bg: '#e6f7e6', 
        text: '#2e7d32',
        icon: icons.paid
      },
      unpaid: { 
        bg: '#ffebee', 
        text: '#c62828',
        icon: icons.unpaid
      },
      partial: { 
        bg: '#fff3e0', 
        text: '#ed6c02',
        icon: icons.partial
      },
    };
    return stylesMap[status] || stylesMap.unpaid;
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      
      <div style={styles.mainContent}>
        
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Appointment Oversight</h1>
            <p style={styles.subtitle}>Manage and monitor all appointments</p>
          </div>
          
          <div style={styles.headerActions}>
            <button
              onClick={() => fetchAllAppointments()}
              style={styles.actionButton}
              className="action-button"
              title="Refresh Data"
            >
              <FiRefreshCw size={18} color="#F5EFE6" />
              <span>Refresh</span>
            </button>
            
            <button
              onClick={exportToCSV}
              style={styles.actionButton}
              className="action-button"
              title="Export to CSV"
            >
              <FiDownload size={18} color="#F5EFE6" />
              <span>Export</span>
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                ...styles.actionButton,
                background: showFilters ? "#8a5424" : "#6A3C17",
              }}
              className="action-button"
              title="Filter Appointments"
            >
              <FiFilter size={18} color="#F5EFE6" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Stats Cards with Gradient */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard} title="Total Appointments">
            <div style={styles.statIcon}>
              <FiCalendar size={24} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Total</div>
              <div style={styles.statValue}>{stats.total}</div>
            </div>
          </div>
          
          <div style={styles.statCard} title="Confirmed Appointments">
            <div style={styles.statIcon}>
              <FiCheckCircle size={24} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Confirmed</div>
              <div style={styles.statValue}>{stats.confirmed}</div>
            </div>
          </div>
          
          <div style={styles.statCard} title="Pending Appointments">
            <div style={styles.statIcon}>
              <FiAlertCircle size={24} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Pending</div>
              <div style={styles.statValue}>{stats.pending}</div>
            </div>
          </div>
          
          <div style={styles.statCard} title="Completed Appointments">
            <div style={styles.statIcon}>
              <FiCheckCircle size={24} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Completed</div>
              <div style={styles.statValue}>{stats.completed}</div>
            </div>
          </div>
          
          <div style={styles.statCard} title="Cancelled Appointments">
            <div style={styles.statIcon}>
              <FiXCircle size={24} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Cancelled</div>
              <div style={styles.statValue}>{stats.cancelled}</div>
            </div>
          </div>
          
          <div style={styles.statCard} title="Total Revenue">
            <div style={styles.statIcon}>
              <FiDollarSign size={24} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Revenue</div>
              <div style={styles.statValue}>₹{stats.revenue}</div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div style={styles.filtersPanel}>
            <div style={styles.filtersGrid}>
              
              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  <FiFilter size={14} color="#6A3C17" style={{ marginRight: '4px' }} />
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  style={styles.filterSelect}
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="available">Available</option>
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  <FiUser size={14} color="#6A3C17" style={{ marginRight: '4px' }} />
                  Stylist
                </label>
                <select
                  value={filters.stylist}
                  onChange={(e) => setFilters({ ...filters, stylist: e.target.value })}
                  style={styles.filterSelect}
                >
                  <option value="all">All Stylists</option>
                  {stylists.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  <FiCalendar size={14} color="#6A3C17" style={{ marginRight: '4px' }} />
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
                  style={styles.filterSelect}
                >
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  <FiEye size={14} color="#6A3C17" style={{ marginRight: '4px' }} />
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  style={styles.filterInput}
                />
              </div>

              <div style={styles.filterActions}>
                <button
                  onClick={resetFilters}
                  style={styles.resetButton}
                  className="action-button"
                  title="Clear all filters"
                >
                  <FiX size={16} color="#8B6B4D" />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Appointments Table */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner}></div>
            <div style={styles.loadingText}>Loading appointments...</div>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div style={styles.emptyState}>
            <FiCalendar size={48} color="#8B6B4D" />
            <p style={styles.emptyStateText}>No appointments found</p>
            <button
              onClick={resetFilters}
              style={styles.emptyStateButton}
              className="action-button"
            >
              <FiX size={16} color="#F5EFE6" style={{ marginRight: '6px' }} />
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead style={styles.tableHead}>
                  <tr>
                    <th style={styles.th}>Date & Time</th>
                    <th style={styles.th}>Stylist</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>Service</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Payment</th>
                    <th style={styles.th}>Amount</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((app) => {
                    const statusStyle = getStatusStyle(app.status);
                    const paymentStyle = getPaymentStyle(app.paymentStatus);
                    
                    return (
                      <tr
                        key={app.id}
                        style={styles.tableRow}
                        onClick={() => {
                          setSelectedAppointment(app);
                          setShowDetailsModal(true);
                        }}
                        className="table-row"
                      >
                        <td style={styles.td}>
                          <div style={styles.dateTimeCell}>
                            <div style={styles.dateCell}>
                              <FiCalendar size={14} color="#6A3C17" />
                              <span>{app.date}</span>
                            </div>
                            <div style={styles.timeCell}>
                              <FiClock size={14} color="#8B6B4D" />
                              <span>{app.startTime} - {app.endTime}</span>
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.stylistCell}>
                            <div style={styles.stylistAvatar}>
                              {app.stylistName.charAt(0)}
                            </div>
                            <span>{app.stylistName}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.customerCell}>
                            <div><strong>{app.customerName}</strong></div>
                            <div style={styles.customerEmail}>{app.customerEmail}</div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          {app.customerPhone ? (
                            <div style={styles.phoneCell}>
                              <FiPhone size={14} color="#6A3C17" />
                              <span>{app.customerPhone}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#999' }}>—</span>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.serviceCell}>{app.serviceName}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.text,
                          }}>
                            <span style={styles.statusIcon}>{statusStyle.icon}</span>
                            {app.status}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.paymentBadge,
                            backgroundColor: paymentStyle.bg,
                            color: paymentStyle.text,
                          }}>
                            <span style={styles.paymentIcon}>{paymentStyle.icon}</span>
                            {app.paymentStatus}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.amount}>₹{app.amount || 0}</span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionCell}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendReminder(app);
                              }}
                              style={{
                                ...styles.actionIconButton,
                                background: "linear-gradient(135deg, #8b5a2b, #6A3C17)",
                                cursor: 'pointer',
                              }}
                              title="Send Reminder"
                            >
                              <FiBell size={16} color="#F5EFE6" />
                              <span style={styles.buttonText}>Remind</span>
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmModal({
                                  visible: true,
                                  title: "Delete Appointment",
                                  message: `Are you sure you want to delete this appointment?`,
                                  action: () => handleDeleteAppointment(app.id),
                                  itemId: app.id
                                });
                              }}
                              style={styles.deleteIconButton}
                              title="Delete appointment"
                            >
                              <FiTrash2 size={16} color="#F5EFE6" />
                              <span style={styles.buttonText}>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={styles.pagination}>
              <div style={styles.paginationInfo}>
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAppointments.length)} of {filteredAppointments.length} appointments
              </div>
              <div style={styles.paginationControls}>
                <button
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                  style={{
                    ...styles.paginationButton,
                    opacity: currentPage === 1 ? 0.5 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                  className="pagination-button"
                  title="Previous page"
                >
                  <FiChevronLeft size={18} color={currentPage === 1 ? "#ccc" : "#6A3C17"} />
                </button>
                
                <span style={styles.paginationCurrent}>{currentPage}</span>
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  style={{
                    ...styles.paginationButton,
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                  className="pagination-button"
                  title="Next page"
                >
                  <FiChevronRight size={18} color={currentPage === totalPages ? "#ccc" : "#6A3C17"} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedAppointment && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>Appointment Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  style={styles.modalCloseButton}
                  className="action-button"
                  title="Close"
                >
                  <FiX size={20} color="#6A3C17" />
                </button>
              </div>
              
              <div style={styles.modalBody}>
                <div style={styles.modalRow}>
                  <div style={styles.modalLabel}>Status:</div>
                  <div style={styles.modalValue}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusStyle(selectedAppointment.status).bg,
                      color: getStatusStyle(selectedAppointment.status).text,
                    }}>
                      {selectedAppointment.status}
                    </span>
                  </div>
                </div>
                
                <div style={styles.modalRow}>
                  <div style={styles.modalLabel}>Date:</div>
                  <div style={styles.modalValue}>
                    <FiCalendar size={14} color="#6A3C17" style={{ marginRight: '6px' }} />
                    {selectedAppointment.date}
                  </div>
                </div>
                
                <div style={styles.modalRow}>
                  <div style={styles.modalLabel}>Time:</div>
                  <div style={styles.modalValue}>
                    <FiClock size={14} color="#6A3C17" style={{ marginRight: '6px' }} />
                    {selectedAppointment.startTime} - {selectedAppointment.endTime}
                  </div>
                </div>
                
                <div style={styles.modalRow}>
                  <div style={styles.modalLabel}>Stylist:</div>
                  <div style={styles.modalValue}>
                    <FiUser size={14} color="#6A3C17" style={{ marginRight: '6px' }} />
                    {selectedAppointment.stylistName}
                  </div>
                </div>
                
                <div style={styles.modalRow}>
                  <div style={styles.modalLabel}>Customer:</div>
                  <div style={styles.modalValue}>
                    <div><strong>{selectedAppointment.customerName}</strong></div>
                    <div style={styles.modalSubValue}>
                      <FiMail size={12} color="#8B6B4D" style={{ marginRight: '4px' }} />
                      {selectedAppointment.customerEmail}
                    </div>
                    {selectedAppointment.customerPhone && (
                      <div style={styles.modalSubValue}>
                        <FiPhone size={12} color="#8B6B4D" style={{ marginRight: '4px' }} />
                        {selectedAppointment.customerPhone}
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={styles.modalRow}>
                  <div style={styles.modalLabel}>Service:</div>
                  <div style={styles.modalValue}>{selectedAppointment.serviceName}</div>
                </div>
                
                <div style={styles.modalRow}>
                  <div style={styles.modalLabel}>Payment:</div>
                  <div style={styles.modalValue}>
                    <span style={{
                      ...styles.paymentBadge,
                      backgroundColor: getPaymentStyle(selectedAppointment.paymentStatus).bg,
                      color: getPaymentStyle(selectedAppointment.paymentStatus).text,
                    }}>
                      {selectedAppointment.paymentStatus}
                    </span>
                  </div>
                </div>
                
                <div style={styles.modalRow}>
                  <div style={styles.modalLabel}>Amount:</div>
                  <div style={styles.modalValue}>
                    <FiDollarSign size={14} color="#6A3C17" style={{ marginRight: '4px' }} />
                    ₹{selectedAppointment.amount || 0}
                  </div>
                </div>
                
                {selectedAppointment.notes && (
                  <div style={styles.modalRow}>
                    <div style={styles.modalLabel}>Notes:</div>
                    <div style={styles.modalValue}>{selectedAppointment.notes}</div>
                  </div>
                )}
              </div>

              <div style={styles.modalFooter}>
                <select
                  onChange={(e) => handleStatusUpdate(selectedAppointment.id, e.target.value as any)}
                  style={styles.modalSelect}
                  title="Change appointment status"
                >
                  <option value="">⚡ Change Status</option>
                  <option value="confirmed">✓ Confirm</option>
                  <option value="completed">✓ Complete</option>
                  <option value="cancelled">✗ Cancel</option>
                </select>
                
                <select
                  onChange={(e) => handlePaymentUpdate(selectedAppointment.id, e.target.value as any)}
                  style={styles.modalSelect}
                  title="Update payment status"
                >
                  <option value="">💰 Update Payment</option>
                  <option value="paid">✓ Mark Paid</option>
                  <option value="unpaid">✗ Mark Unpaid</option>
                </select>
                
                {selectedAppointment.customerPhone && (
                  <button
                    onClick={() => handleSendReminder(selectedAppointment)}
                    style={styles.modalReminderButton}
                    className="action-button"
                    title="Send reminder"
                  >
                    <FiBell size={16} color="#F5EFE6" />
                    <span>Send Reminder</span>
                  </button>
                )}
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

// Rest of the styles remain the same...
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

  headerActions: {
    display: "flex",
    gap: "12px",
  },

  actionButton: {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17, #4b2608)",
    border: "none",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: "14px",
    fontWeight: "500",
    color: "#F5EFE6",
    boxShadow: "0 2px 4px rgba(106, 60, 23, 0.2)",
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: "16px",
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
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
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
    fontSize: "20px",
    fontWeight: "700",
    color: "#F5EFE6",
  },

  filtersPanel: {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
    border: "1px solid #e0d6c8",
    boxShadow: "0 2px 8px rgba(106, 60, 23, 0.05)",
  },

  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },

  filterGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },

  filterLabel: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#6A3C17",
    display: "flex",
    alignItems: "center",
  },

  filterSelect: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #e0d6c8",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    background: "#F5EFE6",
    color: "#4a3a2a",
    cursor: "pointer",
  },

  filterInput: {
    width: "100%",
    padding: "8px 12px",
    border: "1px solid #e0d6c8",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none",
    background: "#F5EFE6",
    color: "#4a3a2a",
  },

  filterActions: {
    display: "flex",
    alignItems: "flex-end",
  },

  resetButton: {
    padding: "8px 16px",
    background: "white",
    border: "1px solid #e0d6c8",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#8B6B4D",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
    gap: "6px",
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
    minWidth: "1300px",
  },

  tableHead: {
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17, #4b2608)",
    position: "sticky" as const,
    top: 0,
    zIndex: 10,
  },

  th: {
    padding: "14px 16px",
    textAlign: "left" as const,
    fontSize: "13px",
    fontWeight: "600",
    color: "#F5EFE6",
    whiteSpace: "nowrap" as const,
  },

  tableRow: {
    borderBottom: "1px solid #f0e2d2",
    transition: "background 0.2s ease",
    cursor: "pointer",
  },

  td: {
    padding: "14px 16px",
    fontSize: "13px",
    color: "#4a3a2a",
  },

  dateTimeCell: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "4px",
  },

  dateCell: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    fontWeight: "500",
  },

  timeCell: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    color: "#8B6B4D",
  },

  stylistCell: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },

  stylistAvatar: {
    width: "28px",
    height: "28px",
    background: "#F5EFE6",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: "600",
    color: "#6A3C17",
  },

  customerCell: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
  },

  customerEmail: {
    fontSize: "11px",
    color: "#8B6B4D",
  },

  phoneCell: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  serviceCell: {
    fontSize: "13px",
    color: "#4a3a2a",
  },

  statusBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "500",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },

  statusIcon: {
    display: "inline-flex",
  },

  paymentBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "500",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },

  paymentIcon: {
    display: "inline-flex",
  },

  amount: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#6A3C17",
  },

  actionCell: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
  },

  actionIconButton: {
    padding: "8px 12px",
    border: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: "13px",
    fontWeight: "500",
    color: "#F5EFE6",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },

  deleteIconButton: {
    padding: "8px 12px",
    background: "linear-gradient(135deg, #dc2626, #b91c1c)",
    border: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: "13px",
    fontWeight: "500",
    color: "#F5EFE6",
    boxShadow: "0 2px 4px rgba(220, 38, 38, 0.2)",
  },

  buttonText: {
    color: "#F5EFE6",
  },

  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
    padding: "12px 16px",
    background: "white",
    borderRadius: "8px",
    border: "1px solid #e0d6c8",
    flexShrink: 0,
  },

  paginationInfo: {
    fontSize: "13px",
    color: "#8B6B4D",
  },

  paginationControls: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },

  paginationButton: {
    width: "36px",
    height: "36px",
    background: "white",
    border: "1px solid #e0d6c8",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  paginationCurrent: {
    minWidth: "40px",
    height: "36px",
    padding: "0 12px",
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17)",
    border: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "14px",
    fontWeight: "600",
    color: "#F5EFE6",
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

  emptyState: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "center",
    background: "white",
    borderRadius: "12px",
    gap: "16px",
    padding: "40px",
  },

  emptyStateText: {
    fontSize: "16px",
    color: "#8B6B4D",
    margin: 0,
  },

  emptyStateButton: {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17)",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#F5EFE6",
    cursor: "pointer",
    transition: "all 0.2s ease",
    display: "flex",
    alignItems: "center",
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
    borderRadius: "16px",
    width: "500px",
    maxWidth: "90%",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
  },

  modalHeader: {
    padding: "20px",
    borderBottom: "1px solid #e0d6c8",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#6A3C17",
    margin: 0,
  },

  modalCloseButton: {
    width: "36px",
    height: "36px",
    background: "#F5EFE6",
    border: "none",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  modalBody: {
    padding: "20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
  },

  modalRow: {
    display: "flex",
    borderBottom: "1px solid #f0e2d2",
    paddingBottom: "8px",
  },

  modalLabel: {
    width: "100px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#6A3C17",
  },

  modalValue: {
    flex: 1,
    fontSize: "13px",
    color: "#4a3a2a",
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "4px",
  },

  modalSubValue: {
    fontSize: "12px",
    color: "#8B6B4D",
    display: "flex",
    alignItems: "center",
    marginTop: "2px",
  },

  modalFooter: {
    padding: "20px",
    borderTop: "1px solid #e0d6c8",
    display: "flex",
    gap: "12px",
    flexWrap: "wrap" as const,
  },

  modalSelect: {
    flex: 1,
    minWidth: "140px",
    padding: "8px 12px",
    border: "1px solid #e0d6c8",
    borderRadius: "6px",
    fontSize: "13px",
    outline: "none",
    background: "#F5EFE6",
    color: "#4a3a2a",
    cursor: "pointer",
  },

  modalReminderButton: {
    flex: 1,
    padding: "8px 16px",
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17)",
    border: "none",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontSize: "13px",
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
  confirmCancelButton: {
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
};

// Add global styles
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .table-row:hover {
    background: #F5EFE6 !important;
  }

  .action-button:hover {
    background: #8a5424 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(106, 60, 23, 0.3) !important;
  }

  .action-icon-button:hover {
    background: #8a5424 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
  }

  .delete-icon-button:hover {
    background: #b91c1c !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3) !important;
  }

  .pagination-button:hover:not(:disabled) {
    background: #F5EFE6 !important;
    border-color: #6A3C17 !important;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(106, 60, 23, 0.2) !important;
  }

  .modal-close-button:hover {
    background: #6A3C17 !important;
  }

  .modal-close-button:hover svg {
    color: #F5EFE6 !important;
  }

  .modal-reminder-button:hover {
    background: #8a5424 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(106, 60, 23, 0.3);
  }

  .reset-button:hover {
    background: #F5EFE6 !important;
    border-color: #6A3C17 !important;
    color: #6A3C17 !important;
  }

  .empty-state-button:hover {
    background: #8a5424 !important;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(106, 60, 23, 0.3);
  }
`;
document.head.appendChild(styleSheet);

export default Appointments;