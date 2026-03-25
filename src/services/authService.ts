import { auth, db, googleProvider } from "../firebase"; // Sesuaikan path
import { signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Cek apakah user sudah ada di koleksi 'users'
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Jika user baru, buatkan dokumen profil sesuai blueprint
      // Aturan firestore mengizinkan pembuatan jika role adalah 'USER'
      await setDoc(userRef, {
        uid: user.uid,
        name: user.displayName || "Anonymous",
        email: user.email,
        role: "USER", // Role default untuk pendaftar baru
        img: user.photoURL || "",
        createdAt: serverTimestamp() // Wajib untuk validasi rules
      });
      console.log("Akun baru berhasil didaftarkan sebagai USER.");
    }

    return user;
  } catch (error) {
    console.error("Gagal Login:", error);
    throw error;
  }
};