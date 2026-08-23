import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import AdminProfileMenu from '../../components/layout/AdminProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import KPIWidget from '../../components/charts/KPIWidget';
import DistrictMap from '../../components/map/DistrictMap';
import VillageClusters from '../../components/map/VillageClusters';
import { mapService, DISTRICT_CLUSTERS } from '../../services/mapService';
import { useNotification } from '../../hooks/useNotification';
import { adminSidebarItems } from './adminNav';

export default function DiseaseSurveillance() {
  const { t } = useTranslation();
  const { notify } = useNotification();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const result = await mapService.getSurveillance();
      setData(result);
      setLoading(false);
    };
    load();
  }, []);

  const activeClusters = DISTRICT_CLUSTERS.filter((c) => c.status === 'Active').length;

  const sidebarItems = adminSidebarItems(t);

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: 'Disease Cluster Surveillance',
        subtitle: 'Real-time outbreak monitoring',
        right: (
          <>
            <Button variant="outline" icon="refresh" onClick={() => notify({ type: 'info', message: 'Surveillance data refreshed' })}>
              Refresh Data
            </Button>
            <AdminProfileMenu />
          </>
        ),
      }}
    >
      {loading || !data ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <KPIWidget label="Total Reported Cases" value={(data?.totalCases ?? 0).toLocaleString()} icon="coronavirus" color="error" trend={-3} />
            <KPIWidget label="Active Outbreaks" value={data.activeOutbreaks} icon="public" color="primary" trend={2} />
            <KPIWidget label="Facilities Notified" value="18" icon="domain" color="secondary" trend={5} />
            <KPIWidget label="Containment Rate" value="87%" icon="shield" color="tertiary" trend={4} />
          </div>

          <Card
            title="Village Cluster Map"
            subtitle="Real-time outbreak monitoring across operational villages"
            headerRight={
              <Badge variant="critical" icon="place">{activeClusters} active of {DISTRICT_CLUSTERS.length} clusters</Badge>
            }
          >
            <DistrictMap clusters={DISTRICT_CLUSTERS} title="AMROLI · PALIA · DEVGRAM — DISTRICT HEALTH SURVEILLANCE" height={460} />
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#22c55e]" />
                <span className="text-label-md text-on-surface-variant">Low risk</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#f59e0b]" />
                <span className="text-label-md text-on-surface-variant">Elevated</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#ef4444]" />
                <span className="text-label-md text-on-surface-variant">Active outbreak</span>
              </div>
            </div>
          </Card>

          <div>
            <h3 className="font-headline text-headline-sm font-bold text-on-surface mb-4">Village Clusters</h3>
            <VillageClusters clusters={DISTRICT_CLUSTERS} />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
