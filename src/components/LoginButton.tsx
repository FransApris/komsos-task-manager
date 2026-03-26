import { loginWithGoogle } from "../services/authService";
import { toast } from "sonner";

export default function LoginButton() {
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      toast.success("Berhasil Login!");
    } catch (err: any) {
      toast.error("Login Gagal: " + err.message);
    }
  };

  return (
    <button 
      onClick={handleLogin}
      className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
    >
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
      <span className="font-medium text-slate-700">Masuk dengan Google</span>
    </button>
  );
}