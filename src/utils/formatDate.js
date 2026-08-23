const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');

const toDate = (value) => (value instanceof Date ? value : new Date(value));

export const formatDate = (date, pattern = 'MMM d, yyyy') => {
  const d = toDate(date);
  if (Number.isNaN(d.getTime())) return '';

  const tokens = {
    MMMM: MONTHS[d.getMonth()],
    MMM: MONTHS[d.getMonth()],
    MM: pad(d.getMonth() + 1),
    M: String(d.getMonth() + 1),
    yyyy: String(d.getFullYear()),
    yy: String(d.getFullYear()).slice(-2),
    dd: pad(d.getDate()),
    d: String(d.getDate()),
    EEE: DAYS[d.getDay()],
    HH: pad(d.getHours()),
    H: String(d.getHours()),
    hh: pad(d.getHours() % 12 || 12),
    h: String(d.getHours() % 12 || 12),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
    a: d.getHours() < 12 ? 'AM' : 'PM',
  };

  return pattern.replace(/MMMM|MMM|MM|EEE|yyyy|yy|dd|hh|mm|ss|HH|aa|a|[MdH]/g, (token) => {
    if (token === 'aa') return tokens.a;
    if (token === 'a') return tokens.a;
    return tokens[token] ?? token;
  });
};

export const formatDateTime = (date, pattern = 'MMM d, yyyy • h:mm a') =>
  formatDate(date, pattern);

export const formatTime = (date, pattern = 'h:mm a') => formatDate(date, pattern);

export const formatRelative = (date) => {
  const d = toDate(date);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

export const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m < 60) return `${m}:${String(sec).padStart(2, '0')}`;
  const h = Math.floor(m / 60);
  return `${h}:${String(m % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export const todayISO = () => formatDate(new Date(), 'yyyy-MM-dd');
