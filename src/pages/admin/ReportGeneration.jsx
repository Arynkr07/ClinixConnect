import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AdminProfileMenu from '../../components/layout/AdminProfileMenu';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import KPIWidget from '../../components/charts/KPIWidget';
import BarChart from '../../components/charts/BarChart';
import { reportService } from '../../services/reportService';
import { useNotification } from '../../hooks/useNotification';
import { DATE_RANGES } from '../../utils/constants';
import { adminSidebarItems } from './adminNav';
import {
  downloadReportPDF,
  downloadReportCSV,
  downloadReportHTML,
} from '../../utils/reportExportUtils';

export default function ReportGeneration() {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [period, setPeriod] = useState('Last 30 Days');
  const [region, setRegion] = useState('All Regions');
  const [format, setFormat] = useState('PDF');
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [report, setReport] = useState(null);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await reportService.generate({ period, region, format });
      setReport(result);
      notify({ type: 'success', message: t('reports.generated') });
    } catch {
      notify({ type: 'error', message: t('reports.generateFailed') });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!report || downloading) return;
    setDownloading(true);
    try {
      const context = { period, region };
      if (format === 'PDF') {
        downloadReportPDF(report, context);
      } else if (format === 'CSV') {
        downloadReportCSV(report, context);
      } else {
        downloadReportHTML(report, context);
      }
      notify({ type: 'success', message: t('reports.downloaded') });
    } catch {
      notify({ type: 'error', message: t('reports.downloadFailed') });
    } finally {
      setDownloading(false);
    }
  };

  const sidebarItems = adminSidebarItems(t);

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{ title: t('reports.title'), subtitle: t('reports.subtitle'), right: <AdminProfileMenu /> }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Report Configuration" icon="tune">
          <div className="space-y-4">
            <Select label="Time Period" value={period} onChange={(e) => setPeriod(e.target.value)} options={DATE_RANGES} />
            <Select
              label="Region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              options={['All Regions', 'Amroli Cluster', 'Palia Cluster', 'Devgram Block', 'Bijapur Sector']}
            />
            <div>
              <p className="font-bold text-on-surface mb-2">Export Format</p>
              <div className="flex gap-2">
                {['PDF', 'CSV', 'HTML'].map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(f)}
                    className={`px-4 py-2 rounded-lg border text-label-md transition-all ${
                      format === f ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <Button fullWidth size="lg" onClick={handleGenerate} loading={generating} icon="auto_awesome">
              Generate Report
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-2">
          {report ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <KPIWidget label="Resolution Rate" value={`${report.resolutionRate}%`} icon="verified" color="primary" trend={5} />
                <KPIWidget label="Patients Served" value={report.patientsServed} icon="group" color="secondary" trend={11} />
                <KPIWidget label="SDG Alignment" value={report.sdgAlignment} icon="public" color="tertiary" trend={2} />
              </div>
              <Card title={report.title} subtitle={`Generated ${new Date(report.generatedOn).toLocaleString()}`} icon="summarize">
                <div className="mb-6 flex flex-wrap gap-3">
                  <Badge variant="secondary" icon="calendar_month">{period}</Badge>
                  <Badge variant="neutral" icon="map">{region}</Badge>
                  <Badge variant="primary" icon="file_copy">{format}</Badge>
                </div>
                <BarChart
                  labels={report.conditionTrends.map((c) => c.label)}
                  data={report.conditionTrends.map((c) => c.value)}
                  colors={['#1B5E4F', '#00639B', '#7C5800', '#722000', '#E8734A']}
                  height={280}
                />
                <div className="grid grid-cols-3 gap-4 mt-6">
                  {Object.entries(report.demographics).map(([key, value]) => (
                    <div key={key} className="bg-surface-container-low rounded-lg p-4 text-center">
                      <p className="font-headline text-headline-lg font-bold text-primary">{value}%</p>
                      <p className="text-label-md text-on-surface-variant capitalize">{key}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <Button icon="download" onClick={handleDownload} loading={downloading}>
                    {downloading ? t('reports.generating', { format }) : t('reports.download', { format })}
                  </Button>
                  <Button variant="outline" icon="share" onClick={() => notify({ type: 'info', message: t('reports.shareLinkCopied') })}>
                    {t('reports.share')}
                  </Button>
                </div>
              </Card>
            </>
          ) : (
            <Card className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-4xl">summarize</span>
              </div>
              <h3 className="font-headline text-headline-md font-bold text-on-surface mb-2">No report generated yet</h3>
              <p className="text-on-surface-variant max-w-sm">
                Configure your parameters on the left and click "Generate Report" to build a regional health impact summary.
              </p>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
