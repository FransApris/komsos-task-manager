import { db, auth } from "../firebase";
import { 
  collection, 
  addDoc, 
  getDocs, 
  writeBatch, 
  serverTimestamp 
} from "firebase/firestore";

export const seedDatabase = async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("Silakan login sebagai Admin untuk mengisi data.");
    return;
  }

  try {
    // --- 1. DATA TUGAS (6 Data) ---
    const sampleTasks = [
      {
        title: "Liputan Foto Misa Minggu Palma",
        description: "Dokumentasi perarakan daun palma di pelataran gereja.",
        type: "PHOTO",
        date: "2026-03-29",
        time: "07:00",
        status: "IN_PROGRESS",
        assignedUsers: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Edit Video V-CAST Episode 13",
        description: "Wawancara dengan Romo Paroki mengenai persiapan Paskah.",
        type: "VIDEO",
        date: "2026-03-30",
        time: "13:00",
        status: "IN_PROGRESS",
        assignedUsers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Desain Banner Pekan Suci",
        description: "Membuat visual untuk dipasang di gerbang depan gereja.",
        type: "PUBLICATION",
        date: "2026-03-25",
        time: "09:00",
        status: "COMPLETED",
        assignedUsers: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Live Streaming Misa Sabtu Sore",
        description: "Operator OBS dan mixer audio untuk kanal YouTube.",
        type: "VIDEO",
        date: "2026-03-28",
        time: "17:00",
        status: "WAITING_VERIFICATION",
        assignedUsers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Dokumentasi Rapat Pleno",
        description: "Foto suasana rapat koordinasi panitia Paskah di Aula.",
        type: "PHOTO",
        date: "2026-03-24",
        time: "19:30",
        status: "COMPLETED",
        assignedUsers: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Update Konten Instagram",
        description: "Membuat carousel foto kegiatan Legio Mariae.",
        type: "PUBLICATION",
        date: "2026-03-27",
        time: "15:00",
        status: "IN_PROGRESS",
        assignedUsers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      }
    ];

    // --- 2. JADWAL MISA (3 Data) ---
    const sampleMasses = [
      {
        title: "Misa Malam Paskah I",
        date: "2026-04-04",
        time: "17:00",
        location: "Gereja Utama",
        status: "OPEN",
        assignedUsers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Misa Malam Paskah II",
        date: "2026-04-04",
        time: "21:00",
        location: "Gereja Utama",
        status: "OPEN",
        assignedUsers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Misa Hari Raya Paskah",
        date: "2026-04-05",
        time: "08:00",
        location: "Gereja Utama",
        status: "OPEN",
        assignedUsers: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      }
    ];

    // --- 3. INVENTARIS (3 Data) ---
    const sampleInventory = [
      {
        name: "Fujifilm X-H2S",
        category: "Kamera",
        status: "AVAILABLE",
        lastChecked: serverTimestamp()
      },
      {
        name: "Mic Wireless DJI Mic 2",
        category: "Audio",
        status: "IN_USE",
        lastChecked: serverTimestamp()
      },
      {
        name: "Lensa 35mm f/1.4",
        category: "Aksesoris",
        status: "AVAILABLE",
        lastChecked: serverTimestamp()
      }
    ];

    // --- 4. JENIS TUGAS (6 Data) ---
    const sampleTaskTypes = [
      { name: "Peliputan", description: "Tugas meliput acara atau misa", color: "#3b82f6", createdAt: serverTimestamp() },
      { name: "Dokumentasi", description: "Tugas dokumentasi foto/video", color: "#10b981", createdAt: serverTimestamp() },
      { name: "Publikasi", description: "Tugas publikasi konten", color: "#f59e0b", createdAt: serverTimestamp() },
      { name: "Desain", description: "Tugas desain grafis", color: "#a855f7", createdAt: serverTimestamp() },
      { name: "OBS", description: "Tugas operator live streaming", color: "#ef4444", createdAt: serverTimestamp() },
      { name: "Editing", description: "Tugas editing video/foto", color: "#6366f1", createdAt: serverTimestamp() }
    ];

    // Eksekusi Pemindahan ke Firestore
    for (const task of sampleTasks) await addDoc(collection(db, "tasks"), task);
    for (const mass of sampleMasses) await addDoc(collection(db, "massSchedules"), mass);
    for (const item of sampleInventory) await addDoc(collection(db, "inventory"), item);
    for (const type of sampleTaskTypes) await addDoc(collection(db, "taskTypes"), type);

    alert("Berhasil memasukkan 18 data contoh!");
  } catch (error) {
    console.error("Seeder error:", error);
  }
};

/**
 * Fungsi untuk mengosongkan database
 */
export const clearSampleData = async () => {
  try {
    const batch = writeBatch(db);
    const collections = ["tasks", "massSchedules", "inventory", "taskTypes"];

    for (const col of collections) {
      const snap = await getDocs(collection(db, col));
      snap.docs.forEach(doc => batch.delete(doc.ref));
    }

    await batch.commit();
    alert("Database telah dikosongkan.");
  } catch (error) {
    console.error("Clear error:", error);
  }
};

export const seedMassSchedules = async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("Harap login sebagai Admin untuk mengisi jadwal.");
    return;
  }

  try {
    const massSchedules = [
      {
        title: "Misa Minggu Prapaskah V",
        date: "2026-03-22",
        time: "08:00",
        location: "Gereja Utama",
        status: "CLOSED",
        assignedUsers: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Misa Krisma (Pemberkatan Minyak)",
        date: "2026-03-26",
        time: "17:00",
        location: "Gereja Utama",
        status: "OPEN",
        assignedUsers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Misa Minggu Palma I",
        date: "2026-03-28",
        time: "17:00",
        location: "Gereja Utama",
        status: "OPEN",
        assignedUsers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Misa Minggu Palma II (Utama)",
        date: "2026-03-29",
        time: "08:00",
        location: "Gereja Utama",
        status: "OPEN",
        assignedUsers: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Misa Kamis Putih I",
        date: "2026-04-02",
        time: "17:00",
        location: "Gereja Utama",
        status: "OPEN",
        assignedUsers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Misa Kamis Putih II",
        date: "2026-04-02",
        time: "20:00",
        location: "Gereja Utama",
        status: "OPEN",
        assignedUsers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Ibadat Jumat Agung I",
        date: "2026-04-03",
        time: "15:00",
        location: "Gereja Utama",
        status: "OPEN",
        assignedUsers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Ibadat Jumat Agung II",
        date: "2026-04-03",
        time: "19:00",
        location: "Gereja Utama",
        status: "OPEN",
        assignedUsers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Misa Malam Paskah I",
        date: "2026-04-04",
        time: "17:00",
        location: "Gereja Utama",
        status: "OPEN",
        assignedUsers: [],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      },
      {
        title: "Misa Hari Raya Paskah (Pagi)",
        date: "2026-04-05",
        time: "08:00",
        location: "Gereja Utama",
        status: "OPEN",
        assignedUsers: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp()
      }
    ];

    for (const mass of massSchedules) {
      await addDoc(collection(db, "massSchedules"), mass);
    }

    alert("10 Jadwal Misa berhasil ditambahkan!");
  } catch (error: any) {
    console.error("Gagal mengisi jadwal:", error);
    alert("Error: " + error.message);
  }
};