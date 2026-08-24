import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NotificationBell from '../../components/layout/NotificationBell';
import ProfileMenu from '../../components/layout/ProfileMenu';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import SearchBar from '../../components/common/SearchBar';
import { doctorService } from '../../services/doctorService';
import { SPECIALIZATIONS } from '../../utils/constants';
import { patientSidebarItems } from './patientNav';

export default function DoctorSearch() {
  const { t } = useTranslation();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const REGIONS = ['All', 'Amroli', 'Devgram', 'Palia', 'Dhamtari Rural', 'Lormi Block', 'Bijapur Sector 2', 'Sundargarh', 'Raigarh'];

  const sidebarItems = patientSidebarItems(t);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await doctorService.getAll();
        setDoctors(list);
      } catch (err) {
        console.error('Failed to load doctors', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = doctors.filter((doc) => {
    const matchesSearch =
      !search ||
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      (doc.specialty || doc.specialization || '').toLowerCase().includes(search.toLowerCase()) ||
      (doc.hospital || doc.facility || '').toLowerCase().includes(search.toLowerCase());

    const matchesSpecialty =
      selectedSpecialty === 'All' ||
      (doc.specialty || doc.specialization) === selectedSpecialty;

    const docRegion = doc.region || doc.hospital || doc.facility || '';
    const matchesRegion =
      selectedRegion === 'All' ||
      docRegion.toLowerCase().includes(selectedRegion.toLowerCase());

    return matchesSearch && matchesSpecialty && matchesRegion;
  });

  return (
    <DashboardLayout
      sidebarProps={{ items: sidebarItems }}
      headerProps={{
        title: t('patient.searchSpecialists'),
        subtitle: t('patient.browseDoctors'),
        right: (
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileMenu />
          </div>
        ),
      }}
    >
      {/* Search & Filter Header */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 mb-8 card-shadow space-y-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <SearchBar
              placeholder="Search by doctor name, specialty, or clinic..."
              onSearch={setSearch}
              containerClassName="w-full md:w-80"
            />
            <div className="flex items-center gap-2 bg-surface-container-low px-3.5 py-2 rounded-xl border border-outline-variant/40 shrink-0">
              <span className="material-symbols-outlined text-primary text-xl">location_on</span>
              <span className="text-label-sm font-semibold text-on-surface">Region:</span>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="bg-transparent font-headline font-bold text-label-md text-primary focus:outline-none cursor-pointer"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r} className="bg-surface text-on-surface">
                    {r === 'All' ? 'All Regions' : r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-label-md text-on-surface-variant shrink-0">
            Found <span className="font-bold text-primary">{filtered.length}</span> doctor(s)
          </div>
        </div>

        {/* Specialization Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedSpecialty('All')}
            className={`px-4 py-2 rounded-full text-label-md font-semibold shrink-0 transition-all ${
              selectedSpecialty === 'All'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/30'
            }`}
          >
            All Specialisations
          </button>
          {SPECIALIZATIONS.map((spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => setSelectedSpecialty(spec)}
              className={`px-4 py-2 rounded-full text-label-md font-semibold shrink-0 transition-all ${
                selectedSpecialty === spec
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/30'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Doctor Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-16">
          <span className="material-symbols-outlined text-5xl text-outline mb-3">person_search</span>
          <h3 className="font-headline font-bold text-title-lg text-on-surface">No specialists found</h3>
          <p className="text-on-surface-variant mt-1">Try selecting a different specialization or adjusting your search keywords.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((doctor) => {
            const initials = doctor.name
              .replace('Dr. ', '')
              .split(' ')
              .map((n) => n[0])
              .join('');

            const todayStr = new Date().toISOString().slice(0, 10);
            let isOnLeaveToday = false;
            try {
              const leaveRequests = JSON.parse(localStorage.getItem('jd_doctor_leave_requests') || '[]');
              const docId = (doctor.id || doctor.doctorId || '').toLowerCase();
              const docName = (doctor.name || '').toLowerCase();
              isOnLeaveToday = leaveRequests.some((r) => {
                const isAppr = (r.status || '').toLowerCase() === 'approved';
                const isDateMatch = String(r.date).slice(0, 10) === todayStr;
                const rDocId = (r.doctorId || '').toLowerCase();
                const rDocName = (r.doctorName || '').toLowerCase();
                return isAppr && isDateMatch && (rDocId === docId || (rDocName && docName && (rDocName.includes(docName) || docName.includes(rDocName))));
              }) || (doctor.leaveDays || []).some((l) => String(l).slice(0, 10) === todayStr);
            } catch {
              isOnLeaveToday = false;
            }

            return (
              <div
                key={doctor.id}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 card-shadow flex flex-col justify-between hover:border-primary/50 transition-all group"
              >
                <div>
                  {/* Doctor Info Header */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline text-title-lg font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-headline font-bold text-title-md text-on-surface truncate group-hover:text-primary transition-colors">
                          {doctor.name}
                        </h4>
                        <span className="flex items-center gap-1 font-bold text-label-md text-warning shrink-0">
                          <span className="material-symbols-outlined text-sm fill-1">star</span>
                          {doctor.rating}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        <Badge variant="secondary">
                          {doctor.specialty || doctor.specialization}
                        </Badge>
                        {isOnLeaveToday && (
                          <Badge variant="error" icon="event_busy">
                            On Approved Leave Today
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Doctor Details */}
                  <div className="space-y-2.5 bg-surface-container-low p-4 rounded-xl text-label-md text-on-surface-variant mb-6 border border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">domain</span>
                      <span className="truncate">{doctor.hospital || doctor.facility || 'Primary Health Centre'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">
                        {doctor.shiftType === 'Night Shift' ? 'nights_stay' : 'wb_sunny'}
                      </span>
                      <span className="font-bold text-on-surface">
                        {doctor.shiftType || 'Day Shift'}: {doctor.workingHours?.start || '09:00'} – {doctor.workingHours?.end || '17:00'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-base">timelapse</span>
                      <span>Slot Duration: {doctor.slotDuration || 30} mins</span>
                    </div>
                    {doctor.experience > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-base">verified</span>
                        <span>{doctor.experience}+ Years Experience</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Button */}
                {isOnLeaveToday ? (
                  <Button fullWidth variant="outline" icon="event_busy" disabled>
                    Unavailable - On Leave Today
                  </Button>
                ) : (
                  <Link to={`/patient/book/${doctor.id}`}>
                    <Button fullWidth icon="calendar_today" size="md">
                      Book Appointment
                    </Button>
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
