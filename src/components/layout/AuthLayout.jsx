/**
 * AuthLayout - two-panel login shell (illustration left / form right).
 * Props:
 *  - illustration: React node (left panel)
 *  - children: form content (right panel)
 */
export default function AuthLayout({ illustration, children }) {
  return (
    <div className="min-h-screen flex overflow-hidden">
      {illustration && (
        <aside className="hidden lg:flex lg:w-1/2 illustration-side relative items-center justify-center p-12 overflow-hidden border-r border-outline-variant/30">
          {illustration}
        </aside>
      )}
      <main className="w-full lg:w-1/2 bg-surface-container-lowest flex items-center justify-center p-6 md:p-12 relative">
        <div className="w-full max-w-md">{children}</div>
        {/* Floating background decor for mobile */}
        <div className="lg:hidden fixed -z-10 top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-fixed-dim/30 rounded-full blur-[100px]"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary-fixed/30 rounded-full blur-[100px]"></div>
        </div>
      </main>
    </div>
  );
}
