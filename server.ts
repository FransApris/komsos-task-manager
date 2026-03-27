import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    resendClient = new Resend(key);
  }
  return resendClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for sending verification email
  app.post("/api/send-verification-email", async (req, res) => {
    const { email, displayName, role } = req.body;

    if (!email || !displayName) {
      return res.status(400).json({ error: "Email and display name are required" });
    }

    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is not set. Skipping email sending.");
        return res.status(200).json({ message: "Email sending skipped (no API key)" });
      }

      const roleName = role === 'ADMIN_MULTIMEDIA' ? 'Koordinator' : 'Petugas';
      
      const resend = getResendClient();
      const { data, error } = await resend.emails.send({
        from: "Komsos App <onboarding@resend.dev>",
        to: [email],
        subject: "Akun Komsos Anda Telah Terverifikasi!",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">Halo, ${displayName}!</h2>
            <p>Kabar gembira! Pendaftaran Anda di aplikasi <strong>Komsos Management</strong> telah disetujui.</p>
            <p>Anda sekarang terdaftar sebagai <strong>${roleName}</strong>.</p>
            <p>Anda sudah dapat mengakses aplikasi dengan menggunakan <strong>Akun Google</strong> yang Anda daftarkan sebelumnya.</p>
            <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
              <p style="margin: 0; font-size: 14px; color: #64748b;">Silakan klik tombol di bawah untuk masuk ke aplikasi:</p>
              <a href="${process.env.APP_URL || 'http://localhost:3000'}" 
                 style="display: inline-block; margin-top: 15px; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Masuk ke Aplikasi
              </a>
            </div>
            <p style="margin-top: 30px; font-size: 12px; color: #94a3b8;">
              Jika Anda tidak merasa mendaftar, silakan abaikan email ini.
            </p>
          </div>
        `,
      });

      if (error) {
        console.error("Resend error:", error);
        return res.status(500).json({ error: error.message });
      }

      res.status(200).json({ message: "Email sent successfully", data });
    } catch (err: any) {
      console.error("Failed to send email:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
