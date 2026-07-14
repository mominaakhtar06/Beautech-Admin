// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import Sidebar from "../components/Sidebar";

const Dashboard = () => {
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalStylists, setTotalStylists] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);

  const fetchCounts = async () => {
    try {
      /* USERS */
      const usersSnap = await getDocs(collection(db, "users"));
      let customers = 0;
      let stylists = 0;

      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.role === "customer") customers++;
        if (data.role === "staff") stylists++;
      });

      setTotalCustomers(customers);
      setTotalStylists(stylists);

      /* BOOKINGS (IMAGE STRUCTURE BASED) */
      const stylistsSnap = await getDocs(collection(db, "stylists"));
      let bookings = 0;

      for (const stylist of stylistsSnap.docs) {
        const slotsSnap = await getDocs(
          collection(db, "stylists", stylist.id, "slots")
        );

        slotsSnap.forEach(slot => {
          const slotData = slot.data();
          if (slotData.isBooked === true) {
            bookings++;
          }
        });
      }

      setTotalBookings(bookings);

    } catch (err) {
      console.error("Dashboard error:", err);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ padding: 20 }}>
        <h2>Admin Dashboard</h2>
        <p>Total Customers: {totalCustomers}</p>
        <p>Total Stylists: {totalStylists}</p>
        <p>Total Bookings: {totalBookings}</p>
      </div>
    </div>
  );
};

export default Dashboard;