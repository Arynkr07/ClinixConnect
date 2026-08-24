/*
 * pdfUtils.js
 * PDF generation for consultation summaries (mirrors prescription PDF styling).
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, formatDuration } from './formatDate';

const PRIMARY = [0, 70, 57];
const SECONDARY = [124, 88, 0];
const ON_SURFACE = [30, 28, 16];
const ON_SURFACE_VARIANT = [63, 73, 69];
const OUTLINE = [191, 201, 196];

const norm = (value) => (typeof value === 'string' ? value.trim() : value ?? '');

const getMedicines = (summary = {}) => {
  if (Array.isArray(summary.medicines)) return summary.medicines;
  if (Array.isArray(summary.medications)) return summary.medications;
  return [];
};

const SCHEDULE_LABELS = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  night: 'Night',
};

const getScheduleLabel = (schedule = {}) =>
  Object.entries(schedule)
    .filter(([, value]) => value)
    .map(([key]) => SCHEDULE_LABELS[key] ?? key)
    .join(', ');

const getScribeSections = (summary = {}) =>
  Array.isArray(summary.scribeSections) ? summary.scribeSections : [];

const sanitizeFileName = (value) =>
  String(value || 'Consultation')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'Consultation';

export const downloadConsultationSummaryPDF = (summary = {}) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 44;
  const contentWidth = pageWidth - marginX * 2;
  let y = 0;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - 70) {
      doc.addPage();
      y = 60;
    }
  };

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(...SECONDARY);
  doc.rect(0, 5, pageWidth, 3, 'F');

  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('ClinixConnect', marginX, 52);
  doc.setTextColor(...SECONDARY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Rural Community Care', marginX, 68);

  doc.setTextColor(...ON_SURFACE_VARIANT);
  doc.setFontSize(10);
  doc.text(`Session: ${norm(summary.consultationId)}`, pageWidth - marginX, 52, { align: 'right' });
  doc.text(
    formatDate(summary.date ? new Date(summary.date) : new Date(), 'MMM d, yyyy • h:mm a'),
    pageWidth - marginX,
    68,
    { align: 'right' }
  );

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(1.2);
  doc.line(marginX, 84, pageWidth - marginX, 84);

  y = 108;

  const sectionTitle = (text) => {
    ensureSpace(44);
    doc.setTextColor(...PRIMARY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(String(text).toUpperCase(), marginX, y);
    doc.setDrawColor(...OUTLINE);
    doc.setLineWidth(0.6);
    doc.line(marginX, y + 5, pageWidth - marginX, y + 5);
    y += 24;
  };

  const bodyText = (text, fallback = '—') => {
    doc.setTextColor(...ON_SURFACE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(norm(text) || fallback, contentWidth);
    for (const line of lines) {
      ensureSpace(14);
      doc.text(line, marginX, y);
      y += 14;
    }
    y += 4;
  };

  const labelValue = (label, value) => {
    ensureSpace(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ON_SURFACE_VARIANT);
    doc.text(label, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ON_SURFACE);
    doc.text(norm(value) || '—', marginX + 110, y);
    y += 16;
  };

  sectionTitle('Patient Information');
  labelValue('Patient', `${norm(summary.patientId)} — ${norm(summary.patientName)}`);
  labelValue('Age / Gender', [summary.patientAge, summary.patientGender].filter(Boolean).join(' / '));
  labelValue('Village', summary.patientVillage);
  labelValue('Doctor', summary.doctorName);
  labelValue('Duration', formatDuration(summary.duration || 0));

  const vitals = summary.vitals || {};
  const vitalsText = [
    vitals.bp && `BP ${vitals.bp}`,
    vitals.pulse && `Pulse ${vitals.pulse} bpm`,
    vitals.temp && `Temp ${vitals.temp}°F`,
    vitals.spo2 && `SpO2 ${vitals.spo2}%`,
  ]
    .filter(Boolean)
    .join('  ·  ');
  if (vitalsText) {
    labelValue('Vitals', vitalsText);
  }

  sectionTitle('Complaint');
  bodyText(summary.complaint);

  if (norm(summary.diagnosis)) {
    sectionTitle('Diagnosis');
    bodyText(summary.diagnosis);
  }

  const medicines = getMedicines(summary);
  if (medicines.length > 0) {
    sectionTitle('Medicines Recommended');
    ensureSpace(90);
    autoTable(doc, {
      startY: y,
      head: [['Medicine', 'Dosage', 'Frequency', 'Duration', 'Schedule']],
      body: medicines.map((med) => [
        norm(med.medicineName ?? med.name) || '—',
        norm(med.dosage) || '—',
        norm(med.frequency) || '—',
        norm(med.duration) ? `${norm(med.duration)} days` : '—',
        getScheduleLabel(med.schedule) || '—',
      ]),
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 10, cellPadding: 7, textColor: ON_SURFACE, lineColor: OUTLINE, lineWidth: 0.5 },
      headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [246, 249, 243] },
    });
    y = (doc.lastAutoTable?.finalY || y) + 20;
  }

  const scribeSections = getScribeSections(summary);
  for (const section of scribeSections) {
    if (norm(section.content)) {
      sectionTitle(section.title);
      bodyText(section.content);
    }
  }

  if (norm(summary.advice)) {
    sectionTitle('Advice');
    bodyText(summary.advice);
  }

  if (norm(summary.notes)) {
    sectionTitle('Doctor Notes');
    bodyText(summary.notes);
  }

  ensureSpace(140);
  const signatureY = Math.max(y + 70, pageHeight - 150);
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
  doc.text('Generated electronically by ClinixConnect', marginX, pageHeight - 48);
  doc.text('Rural Community Care Platform', pageWidth - marginX, pageHeight - 48, { align: 'right' });

  doc.save(`ConsultationSummary_${sanitizeFileName(summary.patientId)}.pdf`);
};

/**
 * Generates a PDF for a lab/imaging report, mirroring the prescription PDF styling.
 * Expected report shape:
 *  - id, title, type, date, facility, doctor
 *  - fields: [{ name, value, unit, reference, flag }]
 *  - findings: string[]
 *  - impression: string
 */
export const downloadReportPDF = (report = {}) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 44;
  const contentWidth = pageWidth - marginX * 2;
  let y = 0;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - 70) {
      doc.addPage();
      y = 60;
    }
  };

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 5, 'F');
  doc.setFillColor(...SECONDARY);
  doc.rect(0, 5, pageWidth, 3, 'F');

  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('ClinixConnect', marginX, 52);
  doc.setTextColor(...SECONDARY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Rural Community Care', marginX, 68);

  doc.setTextColor(...ON_SURFACE_VARIANT);
  doc.setFontSize(10);
  doc.text(`Date: ${formatDate(report.date ? new Date(report.date) : new Date(), 'MMM d, yyyy')}`, pageWidth - marginX, 52, { align: 'right' });

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(1.2);
  doc.line(marginX, 84, pageWidth - marginX, 84);

  y = 108;

  const sectionTitle = (text) => {
    ensureSpace(44);
    doc.setTextColor(...PRIMARY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(String(text).toUpperCase(), marginX, y);
    doc.setDrawColor(...OUTLINE);
    doc.setLineWidth(0.6);
    doc.line(marginX, y + 5, pageWidth - marginX, y + 5);
    y += 24;
  };

  const bodyText = (text, fallback = '—') => {
    doc.setTextColor(...ON_SURFACE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    const lines = doc.splitTextToSize(norm(text) || fallback, contentWidth);
    for (const line of lines) {
      ensureSpace(14);
      doc.text(line, marginX, y);
      y += 14;
    }
    y += 4;
  };

  const labelValue = (label, value) => {
    ensureSpace(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ON_SURFACE_VARIANT);
    doc.text(label, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ON_SURFACE);
    doc.text(norm(value) || '—', marginX + 110, y);
    y += 16;
  };

  sectionTitle(report.title || 'Medical Report');
  labelValue('Report ID', report.id);
  labelValue('Patient', `${norm(report.patientId)} — ${norm(report.patientName)}`);
  labelValue('Type', report.type);
  labelValue('Facility', report.facility);

  const fields = Array.isArray(report.fields) ? report.fields : [];
  if (fields.length > 0) {
    sectionTitle('Test Results');
    ensureSpace(80);
    autoTable(doc, {
      startY: y,
      head: [['Test', 'Result', 'Unit', 'Reference Range', 'Flag']],
      body: fields.map((field) => [
        norm(field.name) || '—',
        norm(field.value) || '—',
        norm(field.unit) || '—',
        norm(field.reference) || '—',
        norm(field.flag) || 'Normal',
      ]),
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 9.5, cellPadding: 6, textColor: ON_SURFACE, lineColor: OUTLINE, lineWidth: 0.5 },
      headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [246, 249, 243] },
    });
    y = (doc.lastAutoTable?.finalY || y) + 20;
  }

  const findings = Array.isArray(report.findings) ? report.findings : [];
  if (findings.length > 0) {
    sectionTitle('Findings');
    findings.forEach((finding) => bodyText(`• ${finding}`));
  }

  if (norm(report.impression)) {
    sectionTitle('Impression');
    bodyText(report.impression);
  }

  if (norm(report.doctor)) {
    sectionTitle('Authorized By');
    bodyText(report.doctor);
  }

  ensureSpace(140);
  const signatureY = Math.max(y + 70, pageHeight - 150);
  doc.setDrawColor(...ON_SURFACE);
  doc.setLineWidth(0.75);
  doc.line(marginX, signatureY, marginX + 220, signatureY);
  doc.setTextColor(...ON_SURFACE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Authorized Signature', marginX, signatureY + 16);

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(1.2);
  doc.line(marginX, pageHeight - 64, pageWidth - marginX, pageHeight - 64);
  doc.setTextColor(...ON_SURFACE_VARIANT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Generated electronically by ClinixConnect', marginX, pageHeight - 48);
  doc.text('Rural Community Care Platform', pageWidth - marginX, pageHeight - 48, { align: 'right' });

  doc.save(`Report_${sanitizeFileName(report.id || report.type)}.pdf`);
};
