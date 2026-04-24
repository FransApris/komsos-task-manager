import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Report, Task, UserAccount } from '../types';

const BRAND_BLUE = [29, 78, 216] as [number, number, number];
const BRAND_DARK = [15, 23, 42] as [number, number, number];
const GRAY_LIGHT = [248, 250, 252] as [number, number, number];
const GRAY_MID = [100, 116, 139] as [number, number, number];
const EMERALD = [16, 185, 129] as [number, number, number];
const AMBER = [245, 158, 11] as [number, number, number];
const RED = [239, 68, 68] as [number, number, number];

const statusLabel: Record<string, string> = {
  OPEN: 'Terbuka',
  IN_PROGRESS: 'Berjalan',
  WAITING_VERIFICATION: 'Verifikasi',
  COMPLETED: 'Selesai',
};

const statusColor = (status: string): [number, number, number] => {
  if (status === 'COMPLETED') return EMERALD;
  if (status === 'WAITING_VERIFICATION') return AMBER;
  if (status === 'OPEN') return GRAY_MID;
  return BRAND_BLUE;
};

function drawPageHeader(doc: jsPDF, pageWidth: number) {
  // Blue top bar
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageWidth, 16, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('KOMSOS ST. PAULUS JUANDA', 14, 10.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('Sistem Manajemen Tugas', pageWidth - 14, 10.5, { align: 'right' });
}

function drawPageFooter(doc: jsPDF, pageWidth: number, pageHeight: number, pageNum: number, totalPages: number) {
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY_MID);
  doc.text(`Dicetak pada ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })} • Dokumen Otomatis`, 14, pageHeight - 7);
  doc.text(`Halaman ${pageNum} / ${totalPages}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
}

export async function exportReportToPDF(
  report: Report,
  tasksDb: Task[],
  usersDb: UserAccount[]
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Filter tasks by report period (YYYY-MM)
  const periodTasks = tasksDb.filter(t => (t.date || '').startsWith(report.period));
  const completedCount = periodTasks.filter(t => t.status === 'COMPLETED').length;
  const activeCount = periodTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'OPEN').length;
  const efficiency = periodTasks.length > 0 ? Math.round((completedCount / periodTasks.length) * 100) : 0;

  // ── Page 1 ──────────────────────────────────────────────────────────
  drawPageHeader(doc, pageWidth);

  // Title block
  let y = 26;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...BRAND_DARK);
  doc.text(report.title, margin, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_MID);
  doc.text(report.summary, margin, y);

  // Period badge
  y += 8;
  doc.setFillColor(...BRAND_BLUE);
  doc.roundedRect(margin, y - 4, 36, 7, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`Periode: ${report.period}`, margin + 3, y + 0.5);

  // ── Stats Cards ──────────────────────────────────────────────────────
  y += 14;
  const stats = [
    { label: 'Total Tugas', value: String(report.stats.totalTasks), color: BRAND_BLUE },
    { label: 'Selesai', value: String(report.stats.completedTasks), color: EMERALD },
    { label: 'Personil Aktif', value: String(report.stats.activeUsers), color: [139, 92, 246] as [number, number, number] },
    { label: 'Efisiensi', value: `${efficiency}%`, color: efficiency >= 70 ? EMERALD : efficiency >= 40 ? AMBER : RED },
  ];
  const cardW = (pageWidth - margin * 2 - 9) / 4;
  stats.forEach((s, i) => {
    const x = margin + i * (cardW + 3);
    doc.setFillColor(...GRAY_LIGHT);
    doc.roundedRect(x, y, cardW, 20, 2, 2, 'F');
    doc.setDrawColor(...(s.color));
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, cardW, 20, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...s.color);
    doc.text(s.value, x + cardW / 2, y + 12, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY_MID);
    doc.text(s.label.toUpperCase(), x + cardW / 2, y + 18, { align: 'center' });
  });

  // ── Section: Daftar Tugas ─────────────────────────────────────────────
  y += 28;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_DARK);
  doc.text('Daftar Tugas Periode Ini', margin, y);

  // Divider
  y += 3;
  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin + 60, y);
  y += 4;

  if (periodTasks.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_MID);
    doc.text('Tidak ada tugas untuk periode ini.', margin, y + 6);
  } else {
    const tableRows = periodTasks.map((task, idx) => {
      const assignees = (task.assignedUsers || [])
        .map(uid => {
          const u = usersDb.find(u => u.uid === uid || u.id === uid);
          return u ? (u.displayName || u.email || uid) : uid;
        })
        .join(', ') || '-';

      return [
        String(idx + 1),
        task.title || '-',
        task.type || '-',
        statusLabel[task.status] || task.status,
        task.date || '-',
        assignees,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [['#', 'Judul Tugas', 'Jenis', 'Status', 'Tanggal', 'Petugas']],
      body: tableRows,
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        textColor: BRAND_DARK,
      },
      headStyles: {
        fillColor: BRAND_BLUE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: {
        fillColor: GRAY_LIGHT,
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 55 },
        2: { cellWidth: 24 },
        3: {
          cellWidth: 26,
          halign: 'center',
        },
        4: { cellWidth: 22, halign: 'center' },
        5: { cellWidth: 'auto' },
      },
      didDrawCell: (data) => {
        // Color-code status column
        if (data.section === 'body' && data.column.index === 3) {
          const rawStatus = periodTasks[data.row.index]?.status || '';
          const color = statusColor(rawStatus);
          doc.setTextColor(...color);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          const text = statusLabel[rawStatus] || rawStatus;
          doc.text(text, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2 + 1, { align: 'center' });
          // Reset
          doc.setTextColor(...BRAND_DARK);
          doc.setFont('helvetica', 'normal');
        }
      },
    });
  }

  // ── Add headers/footers to all pages ──────────────────────────────────
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    if (p > 1) drawPageHeader(doc, pageWidth);
    drawPageFooter(doc, pageWidth, pageHeight, p, totalPages);
  }

  // Download
  const fileName = `laporan-komsos-${report.period}.pdf`;
  doc.save(fileName);
}
