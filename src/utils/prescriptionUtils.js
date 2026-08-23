import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './formatDate';

const STORAGE_KEY = 'savedPrescriptions';

const SCHEDULE_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
};

const PRIMARY = [0, 70, 57];
const SECONDARY = [124, 88, 0];
const ON_SURFACE = [30, 28, 16];
const ON_SURFACE_VARIANT = [63, 73, 69];
const OUTLINE = [191, 201, 196];

const normalize = (value) => (typeof value === 'string' ? value.trim() : value);

const getMedicineName = (med = {}) => normalize(med.medicineName ?? med.name);

const getMedicines = (data = {}) => {
  if (Array.isArray(data.medicines)) return data.medicines;
  if (Array.isArray(data.medications)) return data.medications;
  return [];
};

const getScheduleLabel = (schedule = {}) =>
  Object.entries(schedule)
    .filter(([, value]) => value)
    .map(([key]) => SCHEDULE_LABELS[key] ?? key)
    .join(', ');

const escapeHtml = (value = '') =>
  String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[ch]);

const sanitizeFileName = (value) =>
  String(value || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'Patient';

export const validatePrescription = (data = {}) => {
  const missing = [];
  if (!normalize(data.patientId)) missing.push('Patient ID');
  if (!normalize(data.patientName)) missing.push('Patient Name');

  const meds = getMedicines(data);
  const hasNotes = Boolean(normalize(data.diagnosis) || normalize(data.advice) || normalize(data.postVisitSummary));

  if (meds.length === 0 && !hasNotes) {
    missing.push('At least one medicine or clinical diagnosis');
  } else {
    meds.forEach((med, index) => {
      const label = getMedicineName(med) || `Medicine ${index + 1}`;
      if (!getMedicineName(med)) missing.push(`Medicine name (item ${index + 1})`);
    });
  }

  return missing;
};

export const savePrescription = (data = {}) => {
  const missingFields = validatePrescription(data);
  if (missingFields.length > 0) {
    return { success: false, missingFields };
  }

  const medicines = getMedicines(data).map((med) => ({
    id: med.id || `med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    medicineName: getMedicineName(med),
    dosage: normalize(med.dosage),
    frequency: normalize(med.frequency),
    duration: normalize(med.duration),
    schedule: med.schedule || {},
  }));

  const prescription = {
    id: `rx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    patientId: normalize(data.patientId),
    patientName: normalize(data.patientName),
    doctorName: normalize(data.doctorName) || 'Dr. Rajesh Sharma',
    medicines,
    diagnosis: normalize(data.diagnosis),
    advice: normalize(data.advice),
    createdAt: new Date().toISOString(),
  };

  try {
    let saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(saved)) saved = [];
    saved.push(prescription);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    return { success: true, prescription };
  } catch {
    return { success: false, error: 'Could not save prescription. Browser storage is unavailable.' };
  }
};

export const downloadPrescriptionPDF = (data = {}) => {
  const patientId = normalize(data.patientId) || 'N/A';
  const patientName = normalize(data.patientName) || 'N/A';
  const meds = getMedicines(data);
  const today = formatDate(new Date(), 'MMM d, yyyy');

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 44;

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(...SECONDARY);
  doc.rect(0, 5, pageWidth, 3, 'F');

  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('JeevanDoot', marginX, 52);
  doc.setTextColor(...SECONDARY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Rural Community Care', marginX, 68);

  doc.setTextColor(...ON_SURFACE_VARIANT);
  doc.setFontSize(10);
  doc.text(`Date: ${today}`, pageWidth - marginX, 52, { align: 'right' });

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(1.2);
  doc.line(marginX, 84, pageWidth - marginX, 84);

  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Prescription', marginX, 108);

  doc.setTextColor(...ON_SURFACE);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient Information', marginX, 134);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...ON_SURFACE);
  doc.text(`Patient ID:`, marginX, 154);
  doc.text(`${patientId}`, marginX + 78, 154);
  doc.text(`Patient Name:`, marginX, 172);
  doc.text(`${patientName}`, marginX + 78, 172);
  doc.text(`Date:`, marginX, 190);
  doc.text(`${today}`, marginX + 78, 190);

  const tableStartY = 210;
  autoTable(doc, {
    startY: tableStartY,
    head: [['Medicine', 'Dosage', 'Frequency', 'Duration', 'Schedule']],
    body: meds.map((med) => [
      getMedicineName(med) || '—',
      normalize(med.dosage) || '—',
      normalize(med.frequency) || '—',
      normalize(med.duration) ? `${normalize(med.duration)} days` : '—',
      getScheduleLabel(med.schedule) || '—',
    ]),
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 10, cellPadding: 7, textColor: ON_SURFACE, lineColor: OUTLINE, lineWidth: 0.5 },
    headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 249, 243] },
    columnStyles: {
      0: { cellWidth: 150 },
      1: { cellWidth: 80 },
      2: { cellWidth: 110 },
      3: { cellWidth: 70 },
      4: { cellWidth: 97 },
    },
  });

  const tableEndY = doc.lastAutoTable?.finalY || tableStartY + 80;

  const signatureY = Math.max(tableEndY + 90, pageHeight - 150);

  doc.setDrawColor(...ON_SURFACE);
  doc.setLineWidth(0.75);
  doc.line(marginX, signatureY, marginX + 220, signatureY);
  doc.setTextColor(...ON_SURFACE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Doctor Signature', marginX, signatureY + 16);

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(1.2);
  doc.line(marginX, pageHeight - 64, pageWidth - marginX, pageHeight - 64);
  doc.setTextColor(...ON_SURFACE_VARIANT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Generated electronically by JeevanDoot', marginX, pageHeight - 48);
  doc.text('Rural Community Care Platform', pageWidth - marginX, pageHeight - 48, { align: 'right' });

  doc.save(`Prescription_${sanitizeFileName(patientId)}.pdf`);
};

export const printPrescription = (data = {}) => {
  const patientId = normalize(data.patientId) || 'N/A';
  const patientName = normalize(data.patientName) || 'N/A';
  const meds = getMedicines(data);
  const today = formatDate(new Date(), 'MMM d, yyyy');

  const rows = meds
    .map(
      (med) => `
        <tr>
          <td>${escapeHtml(getMedicineName(med)) || '—'}</td>
          <td>${escapeHtml(normalize(med.dosage)) || '—'}</td>
          <td>${escapeHtml(normalize(med.frequency)) || '—'}</td>
          <td class="center">${escapeHtml(normalize(med.duration)) ? `${escapeHtml(normalize(med.duration))} days` : '—'}</td>
          <td>${escapeHtml(getScheduleLabel(med.schedule)) || '—'}</td>
        </tr>`
    )
    .join('');

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Prescription ${escapeHtml(patientId)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, 'Times New Roman', serif; color: #1e1c10; background: #f0efea; }
    .toolbar {
      position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between;
      background: #004639; color: #ffffff; padding: 12px 24px; font-family: Arial, Helvetica, sans-serif;
    }
    .toolbar button {
      background: #ffffff; color: #004639; border: none; border-radius: 6px; padding: 10px 20px;
      font-size: 14px; font-weight: bold; cursor: pointer;
    }
    .toolbar button:hover { background: #fdbf40; }
    .paper {
      max-width: 820px; margin: 24px auto; background: #ffffff; padding: 48px 56px;
      box-shadow: 0 4px 24px rgba(0, 70, 57, 0.12); border-radius: 6px;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #004639; padding-bottom: 14px; margin-bottom: 22px; }
    .brand h1 { font-size: 28px; color: #004639; letter-spacing: 0.5px; }
    .brand p { font-size: 13px; color: #7c5800; margin-top: 2px; letter-spacing: 1.5px; }
    .header .date { font-size: 13px; color: #3f4945; }
    h2 { font-size: 20px; color: #004639; margin-bottom: 16px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 12px; font-weight: bold; letter-spacing: 1.5px; color: #004639; text-transform: uppercase; border-bottom: 1px solid #bfc9c4; padding-bottom: 6px; margin-bottom: 12px; }
    .patient-info { display: flex; flex-wrap: wrap; gap: 18px 40px; }
    .patient-info div { min-width: 200px; }
    .patient-info .label { font-size: 12px; color: #3f4945; text-transform: uppercase; letter-spacing: 1px; }
    .patient-info .value { font-size: 15px; font-weight: bold; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #004639; color: #ffffff; text-align: left; font-size: 12px; letter-spacing: 0.5px; padding: 10px 12px; }
    td { border: 1px solid #bfc9c4; padding: 10px 12px; font-size: 13px; }
    tbody tr:nth-child(even) { background: #f6f9f3; }
    td.center, th.center { text-align: center; }
    .signature { margin-top: 48px; }
    .signature .line { border-top: 1px solid #1e1c10; width: 240px; padding-top: 8px; font-size: 13px; font-weight: bold; }
    .footer { margin-top: 28px; border-top: 2px solid #004639; padding-top: 10px; display: flex; justify-content: space-between; font-size: 11px; color: #3f4945; }
    @media print {
      body { background: #ffffff; }
      .toolbar { display: none; }
      .paper { margin: 0; box-shadow: none; border-radius: 0; padding: 0; max-width: 100%; }
      @page { margin: 16mm; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <strong>JeevanDoot — Prescription Preview</strong>
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
  </div>
  <div class="paper">
    <div class="header">
      <div class="brand">
        <h1>JeevanDoot</h1>
        <p>RURAL COMMUNITY CARE</p>
      </div>
      <div class="date">Date: ${escapeHtml(today)}</div>
    </div>

    <div class="section">
      <div class="section-title">Prescription</div>
      <div class="patient-info">
        <div><div class="label">Patient ID</div><div class="value">${escapeHtml(patientId)}</div></div>
        <div><div class="label">Patient Name</div><div class="value">${escapeHtml(patientName)}</div></div>
        <div><div class="label">Date</div><div class="value">${escapeHtml(today)}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Medication Details</div>
      <table>
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Dosage</th>
            <th>Frequency</th>
            <th class="center">Duration</th>
            <th>Schedule</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="5" style="text-align:center;">No medicines added</td></tr>'}</tbody>
      </table>
    </div>

    <div class="section signature">
      <div class="section-title">Doctor Signature</div>
      <div class="line">Dr. ___________________</div>
    </div>

    <div class="footer">
      <span>Generated electronically by JeevanDoot</span>
      <span>Rural Community Care Platform</span>
    </div>
  </div>
  <script>
    window.onload = function () {
      setTimeout(function () { window.focus(); window.print(); }, 400);
    };
  </script>
</body>
</html>`);
  printWindow.document.close();
};
