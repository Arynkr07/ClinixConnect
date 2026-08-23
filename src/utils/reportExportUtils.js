/*
 * reportExportUtils.js
 * Client-side export of the generated Admin health impact report.
 * Produces real .pdf / .csv / .html downloads from the currently displayed
 * report data (no hardcoded content, no backend dependency).
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './formatDate';

const PRIMARY = [0, 70, 57];
const SECONDARY = [124, 88, 0];
const ON_SURFACE = [30, 28, 16];
const ON_SURFACE_VARIANT = [63, 73, 69];
const OUTLINE = [191, 201, 196];

const norm = (value) => (typeof value === 'string' ? value.trim() : value ?? '');

const reportDate = (report) =>
  report?.generatedOn ? new Date(report.generatedOn) : new Date();

/** Derive the actual start/end of the selected reporting window. */
export const getRangeDates = (period = '') => {
  const to = new Date();
  const from = new Date();
  const p = norm(period);
  if (p.toLowerCase().includes('24 hour')) {
    from.setHours(to.getHours() - 24);
  } else if (p.toLowerCase().includes('6 month')) {
    from.setMonth(to.getMonth() - 6);
  } else if (p.toLowerCase().includes('year to date')) {
    from.setMonth(0, 1);
  } else {
    from.setDate(to.getDate() - 30);
  }
  return { from, to };
};

/** Data-driven insights derived from the report (never hardcoded). */
const buildInsights = (report = {}) => {
  const insights = [];
  const trends = Array.isArray(report.conditionTrends) ? report.conditionTrends : [];
  if (trends.length > 0) {
    const top = trends.reduce((a, b) => (b.value > a.value ? b : a), trends[0]);
    insights.push(
      `${top.label} is the most reported health condition in the selected period (trend index ${top.value}).`
    );
  }
  if (Number.isFinite(Number(report.resolutionRate))) {
    insights.push(
      `Case resolution rate stands at ${report.resolutionRate}%, reflecting strong follow-through across the served population.`
    );
  }
  const demographics = report.demographics || {};
  const keys = Object.keys(demographics);
  if (keys.length > 0) {
    const topKey = keys.reduce((a, b) => ((demographics[b] ?? 0) > (demographics[a] ?? 0) ? b : a), keys[0]);
    insights.push(
      `The ${topKey} population accounts for the largest share (${demographics[topKey]}%) of patients served.`
    );
  }
  if (report.sdgAlignment === 'High') {
    insights.push(
      'Programme outcomes continue to align with SDG Goal 3 (Good Health and Well-being).'
    );
  } else if (report.sdgAlignment === 'Medium') {
    insights.push('Programme outcomes show partial alignment with SDG Goal 3 targets.');
  }
  return insights;
};

const downloadBlob = (content, filename, mime) => {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/** YYYY-MM-DD filename stamp from the report generation date. */
const filenameStamp = (report) => formatDate(reportDate(report), 'yyyy-MM-dd');

export const reportBaseName = (report) =>
  `JeevanDoot_Health_Impact_Report_${filenameStamp(report)}`;

/* ------------------------------------------------------------------ */
/* PDF                                                                  */
/* ------------------------------------------------------------------ */

export const downloadReportPDF = (report = {}, context = {}) => {
  const { period = '', region = '' } = context;
  const generatedOn = reportDate(report);
  const { from, to } = getRangeDates(period);

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

  const labelValue = (label, value) => {
    ensureSpace(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...ON_SURFACE_VARIANT);
    doc.text(label, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ON_SURFACE);
    doc.text(norm(value) || '—', marginX + 130, y);
    y += 16;
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

  /* Branding header */
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
  doc.text(
    `Generated ${formatDate(generatedOn, 'MMM d, yyyy • h:mm a')}`,
    pageWidth - marginX,
    52,
    { align: 'right' }
  );

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(1.2);
  doc.line(marginX, 84, pageWidth - marginX, 84);

  y = 108;

  /* Report title */
  doc.setTextColor(...ON_SURFACE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(norm(report.title) || 'Health Impact Report', contentWidth);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 22 + 6;

  sectionTitle('Report Overview');
  labelValue('Time Period', period);
  labelValue('Region', region);
  labelValue('Generated On', formatDate(generatedOn, 'MMM d, yyyy • h:mm a'));
  labelValue('Date Range', `${formatDate(from, 'MMM d, yyyy')} — ${formatDate(to, 'MMM d, yyyy')}`);

  /* KPIs */
  sectionTitle('Key Performance Indicators');
  const kpiRows = [
    ['Resolution Rate', norm(report.resolutionRate) ? `${report.resolutionRate}%` : '—'],
    ['Patients Served', norm(report.patientsServed) || '—'],
    ['SDG Alignment', norm(report.sdgAlignment) || '—'],
  ];
  ensureSpace(70);
  autoTable(doc, {
    startY: y,
    head: [['KPI', 'Value']],
    body: kpiRows,
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 10.5, cellPadding: 7, textColor: ON_SURFACE, lineColor: OUTLINE, lineWidth: 0.5 },
    headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 249, 243] },
  });
  y = (doc.lastAutoTable?.finalY || y) + 20;

  /* Condition trends: drawn bar chart + table */
  const trends = Array.isArray(report.conditionTrends) ? report.conditionTrends : [];
  if (trends.length > 0) {
    sectionTitle('Disease / Health Statistics');
    const maxVal = Math.max(...trends.map((c) => Number(c.value) || 0), 1);
    const chartW = contentWidth - 120;
    const rowH = 20;
    const chartTop = y + 14;
    let cy = chartTop;
    trends.forEach((c) => {
      const w = Math.max(4, (Number(c.value) || 0) / maxVal) * chartW;
      doc.setFillColor(...PRIMARY);
      doc.roundedRect(marginX + 120, cy, w, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(...ON_SURFACE_VARIANT);
      doc.text(String(c.label), marginX, cy + 9);
      doc.setTextColor(...ON_SURFACE);
      doc.setFont('helvetica', 'bold');
      doc.text(String(c.value), marginX + 126 + w, cy + 9);
      cy += rowH;
    });
    y = cy + 18;
    ensureSpace(60);
    autoTable(doc, {
      startY: y,
      head: [['Condition', 'Trend Index']],
      body: trends.map((c) => [norm(c.label) || '—', norm(c.value) || '—']),
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 10, cellPadding: 6, textColor: ON_SURFACE, lineColor: OUTLINE, lineWidth: 0.5 },
      headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [246, 249, 243] },
    });
    y = (doc.lastAutoTable?.finalY || y) + 20;
  }

  /* Demographics */
  const demographics = report.demographics || {};
  const demoEntries = Object.entries(demographics);
  if (demoEntries.length > 0) {
    sectionTitle('Demographics');
    ensureSpace(60);
    autoTable(doc, {
      startY: y,
      head: [['Population Segment', 'Share']],
      body: demoEntries.map(([key, value]) => [String(key), `${value}%`]),
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 10, cellPadding: 6, textColor: ON_SURFACE, lineColor: OUTLINE, lineWidth: 0.5 },
      headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [246, 249, 243] },
    });
    y = (doc.lastAutoTable?.finalY || y) + 20;
  }

  /* Insights */
  const insights = buildInsights(report);
  if (insights.length > 0) {
    sectionTitle('Report Insights');
    insights.forEach((insight) => bodyText(`• ${insight}`));
  }

  /* Footer */
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(1.2);
  doc.line(marginX, pageHeight - 64, pageWidth - marginX, pageHeight - 64);
  doc.setTextColor(...ON_SURFACE_VARIANT);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Generated electronically by JeevanDoot', marginX, pageHeight - 48);
  doc.text('Rural Community Care Platform', pageWidth - marginX, pageHeight - 48, { align: 'right' });

  doc.save(`${reportBaseName(report)}.pdf`);
};

/* ------------------------------------------------------------------ */
/* CSV                                                                  */
/* ------------------------------------------------------------------ */

const csvCell = (value) => {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const buildReportCsv = (report = {}, context = {}) => {
  const { period = '', region = '' } = context;
  const generatedOn = reportDate(report);
  const { from, to } = getRangeDates(period);
  const rows = [];

  rows.push(['JeevanDoot Health Impact Report']);
  rows.push([]);
  rows.push(['Report Title', norm(report.title)]);
  rows.push(['Generated On', generatedOn.toISOString()]);
  rows.push(['Time Period', period]);
  rows.push(['Region', region]);
  rows.push(['Date Range', `${formatDate(from, 'yyyy-MM-dd')} to ${formatDate(to, 'yyyy-MM-dd')}`]);
  rows.push([]);

  rows.push(['Key Performance Indicators']);
  rows.push(['KPI', 'Value']);
  rows.push(['Resolution Rate', `${report.resolutionRate ?? ''}%`]);
  rows.push(['Patients Served', report.patientsServed ?? '']);
  rows.push(['SDG Alignment', report.sdgAlignment ?? '']);
  rows.push([]);

  const trends = Array.isArray(report.conditionTrends) ? report.conditionTrends : [];
  if (trends.length > 0) {
    rows.push(['Disease / Health Statistics']);
    rows.push(['Condition', 'Trend Index']);
    trends.forEach((c) => rows.push([c.label ?? '', c.value ?? '']));
    rows.push([]);
  }

  const demographics = report.demographics || {};
  const demoEntries = Object.entries(demographics);
  if (demoEntries.length > 0) {
    rows.push(['Demographics']);
    rows.push(['Population Segment', 'Share (%)']);
    demoEntries.forEach(([key, value]) => rows.push([key, value]));
    rows.push([]);
  }

  const insights = buildInsights(report);
  if (insights.length > 0) {
    rows.push(['Report Insights']);
    insights.forEach((insight) => rows.push([insight]));
  }

  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
};

export const downloadReportCSV = (report = {}, context = {}) => {
  const csv = buildReportCsv(report, context);
  const filename = `${reportBaseName(report)}.csv`;
  downloadBlob('\uFEFF' + csv, filename, 'text/csv;charset=utf-8;');
};

/* ------------------------------------------------------------------ */
/* HTML                                                                 */
/* ------------------------------------------------------------------ */

export const buildReportHTML = (report = {}, context = {}) => {
  const { period = '', region = '' } = context;
  const generatedOn = reportDate(report);
  const { from, to } = getRangeDates(period);

  const kpiCard = (label, value) => `
    <div class="kpi">
      <div class="kpi-value">${value}</div>
      <div class="kpi-label">${label}</div>
    </div>`;

  const trends = Array.isArray(report.conditionTrends) ? report.conditionTrends : [];
  const maxVal = Math.max(...trends.map((c) => Number(c.value) || 0), 1);
  const trendBars = trends
    .map(
      (c) => `
        <div class="trend-row">
          <span class="trend-label">${c.label}</span>
          <div class="trend-bar-wrap">
            <div class="trend-bar" style="width:${(Number(c.value) || 0) / maxVal * 100}%"></div>
          </div>
          <span class="trend-value">${c.value}</span>
        </div>`
    )
    .join('');

  const demographics = report.demographics || {};
  const demoRows = Object.entries(demographics)
    .map(
      ([key, value]) =>
        `<tr><td>${key}</td><td>${value}%</td></tr>`
    )
    .join('');

  const insights = buildInsights(report)
    .map((insight) => `<li>${insight}</li>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${norm(report.title) || 'JeevanDoot Health Impact Report'}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e1c10; margin: 0; padding: 32px; background: #f5f5f0; }
  .report { max-width: 860px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
  .brand { background: #00463a; color: #ffffff; padding: 28px 36px; }
  .brand h1 { margin: 0; font-size: 26px; }
  .brand p { margin: 4px 0 0; color: #f0c05a; font-weight: 600; }
  .body { padding: 28px 36px; }
  h2 { color: #00463a; border-bottom: 2px solid #e4e2d8; padding-bottom: 6px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 28px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .meta b { color: #3f4945; }
  .kpis { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
  .kpi { flex: 1; min-width: 150px; background: #f0f3ee; border: 1px solid #e4e2d8; border-radius: 10px; padding: 16px; text-align: center; }
  .kpi-value { font-size: 26px; font-weight: 700; color: #00463a; }
  .kpi-label { color: #3f4945; margin-top: 4px; font-size: 13px; }
  .trend-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .trend-label { width: 130px; font-size: 13px; color: #3f4945; }
  .trend-bar-wrap { flex: 1; background: #f0f3ee; border-radius: 6px; height: 16px; }
  .trend-bar { height: 16px; background: #00463a; border-radius: 6px; }
  .trend-value { width: 40px; text-align: right; font-weight: 700; color: #00463a; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 8px 12px; border: 1px solid #e4e2d8; font-size: 14px; }
  th { background: #00463a; color: #ffffff; }
  tr:nth-child(even) td { background: #f7f8f5; }
  .insights li { margin-bottom: 8px; line-height: 1.5; }
  .footer { border-top: 3px solid #00463a; margin-top: 28px; padding-top: 12px; color: #3f4945; font-size: 12px; display: flex; justify-content: space-between; }
</style>
</head>
<body>
<div class="report">
  <div class="brand">
    <h1>JeevanDoot</h1>
    <p>Rural Community Care</p>
  </div>
  <div class="body">
    <h2>${norm(report.title) || 'Health Impact Report'}</h2>
    <div class="meta">
      <div><b>Generated On:</b> ${formatDate(generatedOn, 'MMM d, yyyy • h:mm a')}</div>
      <div><b>Time Period:</b> ${period}</div>
      <div><b>Region:</b> ${region}</div>
      <div><b>Date Range:</b> ${formatDate(from, 'MMM d, yyyy')} — ${formatDate(to, 'MMM d, yyyy')}</div>
    </div>

    <h2>Key Performance Indicators</h2>
    <div class="kpis">
      ${kpiCard('Resolution Rate', report.resolutionRate != null ? `${report.resolutionRate}%` : '—')}
      ${kpiCard('Patients Served', report.patientsServed ?? '—')}
      ${kpiCard('SDG Alignment', report.sdgAlignment ?? '—')}
    </div>

    ${trends.length ? `<h2>Disease / Health Statistics</h2>${trendBars}` : ''}

    ${
      Object.keys(demographics).length
        ? `<h2>Demographics</h2>
           <table><thead><tr><th>Population Segment</th><th>Share</th></tr></thead>
           <tbody>${demoRows}</tbody></table>`
        : ''
    }

    ${insights ? `<h2>Report Insights</h2><ul class="insights">${insights}</ul>` : ''}

    <div class="footer">
      <span>Generated electronically by JeevanDoot</span>
      <span>Rural Community Care Platform</span>
    </div>
  </div>
</div>
</body>
</html>`;
};

export const downloadReportHTML = (report = {}, context = {}) => {
  const html = buildReportHTML(report, context);
  const filename = `${reportBaseName(report)}.html`;
  downloadBlob(html, filename, 'text/html;charset=utf-8;');
};
