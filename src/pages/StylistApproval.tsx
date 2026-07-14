import { useEffect, useState } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

interface Stylist {
  id: string;
  name: string;
  email: string;
  experience: string;
  specializations: string[];
  workDescription: string;
  portfolioImages: string[];
  status: string;
}

const StylistApproval = () => {
  const [stylists, setStylists] = useState<Stylist[]>([]);

  const fetchStylists = async () => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "stylist")
    );
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Stylist[];
    setStylists(data);
  };

  useEffect(() => {
    fetchStylists();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, "users", id), { status });
    fetchStylists();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Stylist Approval Panel</h1>

      {stylists.map((stylist) => (
        <div
          key={stylist.id}
          style={{
            border: "1px solid gray",
            padding: 15,
            marginBottom: 20,
          }}
        >
          <h3>{stylist.name}</h3>
          <p>Email: {stylist.email}</p>
          <p>Experience: {stylist.experience}</p>
          <p>Specializations: {stylist.specializations?.join(", ")}</p>
          <p>Description: {stylist.workDescription}</p>

          <div style={{ display: "flex", gap: 10 }}>
            {stylist.portfolioImages?.map((img, i) => (
              <img key={i} src={img} width="120" alt="portfolio" />
            ))}
          </div>

          <p>Status: {stylist.status}</p>

          {stylist.status === "pending" && (
            <div>
              <button
                onClick={() => updateStatus(stylist.id, "approved")}
                style={{ background: "green", color: "white", marginRight: 10 }}
              >
                Approve
              </button>

              <button
                onClick={() => updateStatus(stylist.id, "rejected")}
                style={{ background: "red", color: "white" }}
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StylistApproval;