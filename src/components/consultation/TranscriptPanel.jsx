import { useEffect, useRef } from 'react';
import { SPEAKER_META } from '../../utils/transcriptUtils';
import { cx } from '../../utils/helpers';

/**
 * TranscriptPanel - live conversation transcript for a telemedicine session.
 * Props:
 *  - messages: [{ id, speaker: 'patient'|'doctor'|'ai', text, time }]
 *  - className: extra wrapper classes (default fixed height h-[420px])
 */
export default function TranscriptPanel({
  messages = [],
  emptyText = 'Conversation transcript will appear here in real time.',
  className,
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      className={cx(
        'flex flex-col h-[420px] bg-surface-container-lowest rounded-2xl card-shadow overflow-hidden',
        className
      )}
    >
      <div className="px-6 py-4 border-b border-outline-variant flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-lg">subtitles</span>
        <p className="font-bold text-on-surface">Live Transcript</p>
        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        <span className="text-label-sm text-on-surface-variant">Auto-captioned</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-container-low custom-scrollbar">
        {messages.length === 0 && (
          <p className="text-center text-on-surface-variant text-label-md pt-16">{emptyText}</p>
        )}
        {messages.map((m) => {
          const meta = SPEAKER_META[m.speaker] ?? SPEAKER_META.ai;
          const isAI = m.speaker === 'ai';
          return (
            <div
              key={m.id}
              className={cx(
                'flex',
                m.speaker === 'doctor' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cx(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-body-md',
                  isAI
                    ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed-variant w-full border-l-4 border-tertiary rounded-l-sm'
                    : m.speaker === 'doctor'
                      ? 'bg-primary text-on-primary rounded-br-sm'
                      : 'bg-surface-container-highest text-on-surface rounded-bl-sm'
                )}
              >
                <div className={cx('flex items-center gap-2 mb-1', isAI && 'mb-1.5')}>
                  <span
                    className={cx(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm font-bold',
                      meta.color
                    )}
                  >
                    {meta.label}
                  </span>
                  {m.time && <span className="text-label-sm opacity-70">{m.time}</span>}
                </div>
                {m.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
