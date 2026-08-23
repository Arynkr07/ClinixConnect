import Sidebar from './Sidebar';
import Header from './Header';

/**
 * DashboardLayout - wraps admin & doctor dashboards with a shared shell.
 * Props:
 *  - sidebarProps, headerProps
 *  - sidebar: optional React node overriding sidebarProps
 *  - children (page content)
 */
export default function DashboardLayout({
  sidebarProps = {},
  sidebar,
  headerProps = {},
  contentClassName = 'p-10 space-y-10',
  children,
}) {
  return (
    <div className="bg-background min-h-screen">
      {sidebar ? sidebar : <Sidebar {...sidebarProps} />}
      <main className="ml-72 min-h-screen">
        <Header {...headerProps} />
        <div className={contentClassName}>{children}</div>
      </main>
    </div>
  );
}
