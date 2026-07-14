import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import Sidebar from "../components/Sidebar";
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch,
  FiX,
  FiImage,
  FiClock,
  FiList,
  FiDollarSign,
  FiTag,
} from "react-icons/fi";
import { 
  MdBuild, 
  MdBrush, 
  MdContentCut, 
  MdSpa, 
  MdFace, 
  MdPalette,
  MdMoreHoriz 
} from "react-icons/md";

interface SubService {
  id: string;
  name: string;
  description: string;
  duration: string;
  price?: number;
  serviceId: string;
  imageUrl?: string;
  createdAt?: Date;
}

interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// Service Categories
const serviceCategories: ServiceCategory[] = [
  { id: "makeup", name: "Makeup", icon: "brush", color: "#8a5424" },
  { id: "hair", name: "Hair Styling", icon: "cut", color: "#6A3C17" },
  { id: "nail", name: "Nail Art", icon: "palette", color: "#8B6B4D" },
  { id: "facial", name: "Facial", icon: "face", color: "#A66B38" },
  { id: "mehndi", name: "Mehndi", icon: "spa", color: "#5f4b3a" },
  { id: "waxing", name: "Waxing", icon: "wax", color: "#5f4b3a" },
  { id: "other", name: "Other", icon: "more", color: "#8a5424" },
];

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

// Helper function to get icon component
const getCategoryIcon = (iconName: string, size: number = 20, color: string = "#F5EFE6") => {
  switch(iconName) {
    case "brush": return <MdBrush size={size} color={color} />;
    case "cut": return <MdContentCut size={size} color={color} />;
    case "palette": return <MdPalette size={size} color={color} />;
    case "face": return <MdFace size={size} color={color} />;
    case "spa": return <MdSpa size={size} color={color} />;
    case "more": return <MdMoreHoriz size={size} color={color} />;
    default: return <MdBuild size={size} color={color} />;
  }
};

export default function ServiceManagement() {
  const [subServices, setSubServices] = useState<SubService[]>([]);
  const [filteredServices, setFilteredServices] = useState<SubService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [alert, setAlert] = useState({ visible: false, type: 'info', title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ visible: false, title: '', message: '', action: null as any, itemName: '' });
  
  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const showAlert = (type: string, title: string, message: string) => {
    setAlert({ visible: true, type, title, message });
    setTimeout(() => setAlert({ ...alert, visible: false }), 3000);
  };

  // Fetch sub services
  const fetchSubServices = async () => {
    try {
      setLoading(true);
      const data = await getDocs(collection(db, "subServices"));
      const services = data.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SubService[];
      
      services.sort((a, b) => a.name.localeCompare(b.name));
      setSubServices(services);
      setFilteredServices(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      showAlert("error", "Error", "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubServices();
  }, []);

  // Filter services
  useEffect(() => {
    let filtered = [...subServices];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        s => s.name.toLowerCase().includes(searchLower) ||
             s.description.toLowerCase().includes(searchLower)
      );
    }
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(s => s.serviceId === selectedCategory);
    }
    
    setFilteredServices(filtered);
  }, [search, selectedCategory, subServices]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "service_upload");

    const res = await fetch(
      "https://api.cloudinary.com/v1_1/dpljhbbf6/image/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    return data.secure_url;
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setDuration("");
    setPrice("");
    setServiceId("");
    setImageFile(null);
    setImagePreview(null);
    setEditingId(null);
  };

  const handleEdit = (service: SubService) => {
    setEditingId(service.id);
    setName(service.name);
    setDescription(service.description);
    setDuration(service.duration);
    setPrice(service.price?.toString() || "");
    setServiceId(service.serviceId);
    setImagePreview(service.imageUrl || null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name || !description || !duration || !serviceId) {
      showAlert("warning", "Missing Fields", "Please fill all required fields");
      return;
    }

    try {
      setUploading(true);
      let imageUrl = imagePreview || "";

      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const serviceData = {
        name,
        description,
        duration,
        price: price ? parseFloat(price) : 0,
        serviceId,
        imageUrl,
        updatedAt: new Date(),
      };

      if (editingId) {
        const serviceRef = doc(db, "subServices", editingId);
        await updateDoc(serviceRef, serviceData);
        showAlert("success", "Success", "Service updated successfully!");
      } else {
        await addDoc(collection(db, "subServices"), {
          ...serviceData,
          createdAt: new Date(),
        });
        showAlert("success", "Success", "Service added successfully!");
      }

      resetForm();
      setShowModal(false);
      fetchSubServices();
    } catch (error) {
      console.error("Error saving service:", error);
      showAlert("error", "Error", "Failed to save service");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setConfirmModal({
      visible: true,
      title: "Delete Service",
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      action: async () => {
        try {
          await deleteDoc(doc(db, "subServices", id));
          fetchSubServices();
          showAlert("success", "Deleted", "Service deleted successfully!");
        } catch (error) {
          console.error("Error deleting service:", error);
          showAlert("error", "Error", "Failed to delete service");
        }
      },
      itemName: name
    });
  };

  const getCategoryDetails = (categoryId: string) => {
    return serviceCategories.find(c => c.id === categoryId) || serviceCategories[5];
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      
      <div style={styles.mainContent}>
        {/* Fixed Header Section */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Service Management</h1>
            <p style={styles.subtitle}>Manage all salon services and sub-services</p>
          </div>
          
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            style={styles.addButton}
            className="action-button"
          >
            <FiPlus size={18} color="#F5EFE6" />
            <span>Add New Service</span>
          </button>
        </div>

        {/* Fixed Stats Section with Gradient */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <MdBuild size={22} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Total Services</div>
              <div style={styles.statValue}>{subServices.length}</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <FiList size={22} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Categories</div>
              <div style={styles.statValue}>{serviceCategories.length}</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <FiClock size={22} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Avg Duration</div>
              <div style={styles.statValue}>45 min</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <FiDollarSign size={22} color="#F5EFE6" />
            </div>
            <div style={styles.statInfo}>
              <div style={styles.statLabel}>Price Range</div>
              <div style={styles.statValue}>₹500-5k</div>
            </div>
          </div>
        </div>

        {/* Fixed Search and Filter Bar */}
        <div style={styles.searchBar}>
          <div style={styles.searchContainer}>
            <FiSearch size={18} color="#8B6B4D" style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search services..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={styles.categorySelect}
          >
            <option value="all">All Categories</option>
            {serviceCategories.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Scrollable Services Grid Container - FIXED */}
        <div style={styles.gridContainer}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.loadingSpinner}></div>
              <div style={styles.loadingText}>Loading services...</div>
            </div>
          ) : filteredServices.length === 0 ? (
            <div style={styles.emptyState}>
              <MdBuild size={48} color="#8B6B4D" />
              <p style={styles.emptyStateText}>No services found</p>
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                }}
                style={styles.emptyStateButton}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div style={styles.servicesGrid}>
              {filteredServices.map((service) => {
                const category = getCategoryDetails(service.serviceId);
                
                return (
                  <div key={service.id} style={styles.serviceCard} className="service-card">
                    <div style={styles.imageWrapper}>
                      {service.imageUrl ? (
                        <img 
                          src={service.imageUrl} 
                          alt={service.name}
                          style={styles.serviceImage}
                        />
                      ) : (
                        <div style={styles.imagePlaceholder}>
                          <FiImage size={32} color="#8B6B4D" />
                          <span style={styles.placeholderText}>No Image</span>
                        </div>
                      )}
                      
                      <span style={{
                        ...styles.categoryBadge,
                        background: `linear-gradient(135deg, ${category.color}, ${category.color}dd)`,
                      }}>
                        <span style={styles.categoryBadgeIcon}>
                          {getCategoryIcon(category.icon, 14, "#F5EFE6")}
                        </span>
                        <span>{category.name}</span>
                      </span>
                    </div>
                    
                    <div style={styles.contentSection}>
                      <h3 style={styles.serviceName}>{service.name}</h3>
                      <p style={styles.serviceDescription}>{service.description}</p>
                      
                      <div style={styles.detailsRow}>
                        <span style={styles.duration}>
                          <FiClock size={14} color="#8B6B4D" />
                          {service.duration}
                        </span>
                        {service.price ? (
                          <span style={styles.price}>
                            ₹{service.price}
                          </span>
                        ) : (
                          <span style={styles.priceNA}>Price N/A</span>
                        )}
                      </div>
                    </div>
                    
                    <div style={styles.actionsFooter}>
                      <button
                        onClick={() => handleEdit(service)}
                        style={styles.editButton}
                        className="edit-btn"
                      >
                        <FiEdit2 size={16} color="#F5EFE6" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(service.id, service.name)}
                        style={styles.deleteButton}
                        className="delete-btn"
                      >
                        <FiTrash2 size={16} color="#F5EFE6" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
              <div style={styles.modalHeader}>
                <h2 style={styles.modalTitle}>
                  {editingId ? "Edit Service" : "Add New Service"}
                </h2>
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  style={styles.modalCloseButton}
                  className="modal-close"
                >
                  <FiX size={20} color="#6A3C17" />
                </button>
              </div>
              
              <div style={styles.modalBody}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiTag size={14} color="#6A3C17" style={{ marginRight: '6px' }} />
                    Service Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Bridal Makeup"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Description *</label>
                  <textarea
                    placeholder="Describe the service..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    style={styles.textarea}
                    rows={3}
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <FiClock size={14} color="#6A3C17" style={{ marginRight: '6px' }} />
                      Duration *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 60 min"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      <FiDollarSign size={14} color="#6A3C17" style={{ marginRight: '6px' }} />
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g., 2500"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    <FiList size={14} color="#6A3C17" style={{ marginRight: '6px' }} />
                    Category *
                  </label>
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">Select Category</option>
                    {serviceCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Service Image</label>
                  <div style={styles.imageUploadContainer}>
                    {imagePreview ? (
                      <div style={styles.imagePreviewContainer}>
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          style={styles.imagePreview}
                        />
                        <button
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          style={styles.removeImageButton}
                          className="remove-img"
                        >
                          <FiX size={16} color="#F5EFE6" />
                        </button>
                      </div>
                    ) : (
                      <label style={styles.uploadLabel}>
                        <FiImage size={28} color="#8B6B4D" />
                        <span style={styles.uploadText}>Click to upload image</span>
                        <span style={styles.uploadSubtext}>PNG, JPG up to 5MB</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          style={styles.hiddenInput}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  style={styles.cancelButton}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={uploading}
                  style={{
                    ...styles.saveButton,
                    opacity: uploading ? 0.7 : 1,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                  }}
                  className="save-btn"
                >
                  {uploading ? "Saving..." : (editingId ? "Update Service" : "Add Service")}
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
}

// Fixed styles with proper overflow handling
const styles = {
  container: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    background: "#F5EFE6",
    overflow: "hidden",
  } as const,

  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    height: "100vh",
    overflow: "hidden",
    padding: "24px",
  } as const,

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    flexShrink: 0,
  } as const,

  title: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#6A3C17",
    margin: "0 0 4px 0",
  } as const,

  subtitle: {
    fontSize: "14px",
    color: "#8B6B4D",
    margin: 0,
  } as const,

  addButton: {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17, #4b2608)",
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
  } as const,

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "16px",
    marginBottom: "20px",
    flexShrink: 0,
  } as const,

  statCard: {
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17, #4b2608)",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: "1px solid #8a5424",
    boxShadow: "0 4px 8px rgba(106, 60, 23, 0.15)",
    transition: "all 0.2s ease",
  } as const,

  statIcon: {
    width: "44px",
    height: "44px",
    background: "rgba(255,255,255,0.15)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const,

  statInfo: {
    flex: 1,
  } as const,

  statLabel: {
    fontSize: "12px",
    color: "#F5EFE6",
    marginBottom: "4px",
    opacity: 0.9,
  } as const,

  statValue: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#F5EFE6",
  } as const,

  searchBar: {
    display: "flex",
    gap: "12px",
    marginBottom: "20px",
    flexShrink: 0,
  } as const,

  searchContainer: {
    position: "relative" as const,
    flex: 1,
  } as const,

  searchIcon: {
    position: "absolute" as const,
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
  } as const,

  searchInput: {
    width: "100%",
    padding: "10px 16px 10px 40px",
    borderRadius: "10px",
    border: "1px solid #e0d6c8",
    fontSize: "14px",
    outline: "none",
    background: "white",
    boxShadow: "0 2px 4px rgba(106, 60, 23, 0.05)",
  } as const,

  categorySelect: {
    width: "200px",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid #e0d6c8",
    fontSize: "14px",
    outline: "none",
    background: "white",
    color: "#4a3a2a",
    cursor: "pointer",
  } as const,

  gridContainer: {
    flex: 1,
    overflow: "auto",
    marginBottom: "0",
    borderRadius: "16px",
    background: "transparent",
    minHeight: 0, // Important for flex children to respect overflow
  } as const,

  servicesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "20px",
    padding: "4px 4px 8px 4px",
    alignContent: "start",
  } as const,

  serviceCard: {
    background: "white",
    borderRadius: "16px",
    overflow: "hidden",
    border: "1px solid #e0d6c8",
    boxShadow: "0 4px 12px rgba(106, 60, 23, 0.08)",
    transition: "all 0.3s ease",
    display: "flex",
    flexDirection: "column" as const,
    height: "fit-content",
  } as const,

  imageWrapper: {
    position: "relative" as const,
    width: "100%",
    height: "180px",
    background: "#F5EFE6",
    overflow: "hidden",
  } as const,

  serviceImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    transition: "transform 0.3s ease",
  } as const,

  imagePlaceholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    background: "#F5EFE6",
    gap: "8px",
  } as const,

  placeholderText: {
    fontSize: "13px",
    color: "#8B6B4D",
  } as const,

  categoryBadge: {
    position: "absolute" as const,
    top: "12px",
    right: "12px",
    padding: "6px 12px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: "500",
    color: "#F5EFE6",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  } as const,

  categoryBadgeIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const,

  contentSection: {
    padding: "16px",
    flex: 1,
  } as const,

  serviceName: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#6A3C17",
    margin: "0 0 8px 0",
  } as const,

  serviceDescription: {
    fontSize: "13px",
    color: "#4a3a2a",
    margin: "0 0 12px 0",
    lineHeight: "1.5",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  } as const,

  detailsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "8px",
    borderTop: "1px solid #f0e2d2",
  } as const,

  duration: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "#8B6B4D",
  } as const,

  price: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#6A3C17",
  } as const,

  priceNA: {
    fontSize: "13px",
    color: "#999",
    fontStyle: "italic",
  } as const,

  actionsFooter: {
    display: "flex",
    gap: "10px",
    padding: "12px 16px",
    borderTop: "1px solid #e0d6c8",
    background: "#F5EFE6",
  } as const,

  editButton: {
    flex: 1,
    padding: "8px 12px",
    background: "linear-gradient(135deg, #8a5424, #6A3C17)",
    border: "none",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: "13px",
    fontWeight: "500",
    color: "#F5EFE6",
  } as const,

  deleteButton: {
    flex: 1,
    padding: "8px 12px",
    background: "linear-gradient(135deg, #dc2626, #b91c1c)",
    border: "none",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontSize: "13px",
    fontWeight: "500",
    color: "#F5EFE6",
  } as const,

  loadingContainer: {
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "center",
    background: "white",
    borderRadius: "16px",
    gap: "16px",
    padding: "40px",
  } as const,

  loadingSpinner: {
    width: "40px",
    height: "40px",
    border: "3px solid #F5EFE6",
    borderTop: "3px solid #6A3C17",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  } as const,

  loadingText: {
    fontSize: "14px",
    color: "#8B6B4D",
  } as const,

  emptyState: {
    display: "flex",
    flexDirection: "column" as const,
    justifyContent: "center",
    alignItems: "center",
    background: "white",
    borderRadius: "16px",
    gap: "16px",
    padding: "40px",
  } as const,

  emptyStateText: {
    fontSize: "16px",
    color: "#8B6B4D",
    margin: 0,
  } as const,

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
  } as const,

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
    backdropFilter: "blur(4px)",
  } as const,

  modalContent: {
    background: "white",
    borderRadius: "20px",
    width: "500px",
    maxWidth: "90%",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.2)",
  } as const,

  modalHeader: {
    padding: "20px 24px",
    borderBottom: "1px solid #e0d6c8",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  } as const,

  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#6A3C17",
    margin: 0,
  } as const,

  modalCloseButton: {
    width: "36px",
    height: "36px",
    background: "#F5EFE6",
    border: "none",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as const,

  modalBody: {
    padding: "24px",
  } as const,

  formGroup: {
    marginBottom: "20px",
  } as const,

  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  } as const,

  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "500",
    color: "#6A3C17",
    marginBottom: "6px",
  } as const,

  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #e0d6c8",
    fontSize: "14px",
    outline: "none",
    background: "#F5EFE6",
    color: "#4a3a2a",
    transition: "border 0.2s ease",
  } as const,

  textarea: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #e0d6c8",
    fontSize: "14px",
    outline: "none",
    background: "#F5EFE6",
    color: "#4a3a2a",
    resize: "vertical" as const,
    fontFamily: "inherit",
    transition: "border 0.2s ease",
  } as const,

  select: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid #e0d6c8",
    fontSize: "14px",
    outline: "none",
    background: "#F5EFE6",
    color: "#4a3a2a",
    cursor: "pointer",
  } as const,

  imageUploadContainer: {
    border: "2px dashed #e0d6c8",
    borderRadius: "12px",
    padding: "20px",
    textAlign: "center" as const,
    background: "#F5EFE6",
  } as const,

  imagePreviewContainer: {
    position: "relative" as const,
    width: "100%",
    height: "180px",
    borderRadius: "10px",
    overflow: "hidden",
  } as const,

  imagePreview: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
  } as const,

  removeImageButton: {
    position: "absolute" as const,
    top: "8px",
    right: "8px",
    width: "32px",
    height: "32px",
    background: "#dc2626",
    border: "none",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
  } as const,

  uploadLabel: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    color: "#8B6B4D",
  } as const,

  uploadText: {
    fontSize: "14px",
    fontWeight: "500",
  } as const,

  uploadSubtext: {
    fontSize: "12px",
    color: "#999",
  } as const,

  hiddenInput: {
    display: "none",
  } as const,

  modalFooter: {
    padding: "20px 24px",
    borderTop: "1px solid #e0d6c8",
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
  } as const,

  cancelButton: {
    padding: "10px 20px",
    background: "white",
    border: "1px solid #e0d6c8",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#8B6B4D",
    cursor: "pointer",
    transition: "all 0.2s ease",
  } as const,

  saveButton: {
    padding: "10px 24px",
    background: "linear-gradient(135deg, #8b5a2b, #6A3C17)",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#F5EFE6",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 8px rgba(106, 60, 23, 0.2)",
  } as const,

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
  } as const,
  alertContainer: {
    backgroundColor: "#fff",
    borderRadius: "20px",
    padding: "24px",
    width: "320px",
    textAlign: "center" as const,
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
  } as const,
  alertIconContainer: {
    width: "80px",
    height: "80px",
    borderRadius: "40px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    margin: "0 auto 16px",
  } as const,
  alertIconEmoji: {
    fontSize: "45px",
    fontWeight: "bold",
  } as const,
  alertTitle: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "8px",
  } as const,
  alertMessage: {
    fontSize: "14px",
    color: "#666",
    marginBottom: "24px",
    lineHeight: "1.5",
  } as const,
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
  } as const,
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
  } as const,
};

// Global styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .service-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(106, 60, 23, 0.15) !important;
    }

    .service-card:hover img {
      transform: scale(1.05);
    }

    .action-button:hover {
      background: #8a5424 !important;
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(106, 60, 23, 0.25) !important;
    }

    .edit-btn:hover {
      background: #6A3C17 !important;
      transform: translateY(-2px);
    }

    .delete-btn:hover {
      background: #b91c1c !important;
      transform: translateY(-2px);
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(106, 60, 23, 0.2) !important;
    }

    .modal-close:hover {
      background: #6A3C17 !important;
    }

    .modal-close:hover svg {
      color: #F5EFE6 !important;
    }

    .cancel-btn:hover {
      background: #F5EFE6 !important;
      border-color: #6A3C17 !important;
      color: #6A3C17 !important;
    }

    .save-btn:hover {
      background: #8a5424 !important;
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(106, 60, 23, 0.3) !important;
    }

    .remove-img:hover {
      background: #b91c1c !important;
      transform: scale(1.1);
    }

    .empty-state-button:hover {
      background: #8a5424 !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(106, 60, 23, 0.3);
    }

    input:focus, textarea:focus, select:focus {
      border-color: #6A3C17 !important;
      box-shadow: 0 0 0 3px rgba(106, 60, 23, 0.1) !important;
    }

    /* Custom scrollbar styling */
    .grid-container::-webkit-scrollbar {
      width: 8px;
    }

    .grid-container::-webkit-scrollbar-track {
      background: #F5EFE6;
      border-radius: 10px;
    }

    .grid-container::-webkit-scrollbar-thumb {
      background: #8a5424;
      border-radius: 10px;
    }

    .grid-container::-webkit-scrollbar-thumb:hover {
      background: #6A3C17;
    }
  `;
  document.head.appendChild(styleSheet);
}