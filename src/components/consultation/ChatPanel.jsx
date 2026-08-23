import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../common/Button';
import { cx } from '../../utils/helpers';

/**
 * ChatPanel - mock in-call chat with the remote physician.
 */
export default function ChatPanel({ onSend }) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    { from: 'doctor', text: 'Namaste doctor ji, I can see the ECG now. ST elevation in leads II, III and aVF is concerning.' },
    { from: 'self', text: 'Yes, I suspected an inferior wall MI. Vitals: BP 96/58, HR 112.' },
    { from: 'doctor', text: 'Administer Aspirin 300mg chewable immediately. Also check for contraindications before Nitroglycerin. I will arrange the ambulance to CHC.' },
  ]);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;
    const updated = [...messages, { from: 'self', text: input }];
    setMessages(updated);
    onSend?.(input);
    setInput('');
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl card-shadow flex flex-col h-[420px]">
      <div className="px-6 py-4 border-b border-outline-variant flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline font-bold">
          R
        </div>
        <div>
          <p className="font-bold text-on-surface">{t('chat.doctorName')}</p>
          <p className="text-label-sm text-success flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success inline-block" />
            {t('chat.online')}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-surface-container-low">
        {messages.map((m, i) => (
          <div key={i} className={cx('flex', m.from === 'self' ? 'justify-end' : 'justify-start')}>
            <div
              className={cx(
                'max-w-[75%] px-4 py-3 rounded-2xl text-body-md',
                m.from === 'self'
                  ? 'bg-primary text-on-primary rounded-br-sm'
                  : 'bg-surface-container-highest text-on-surface rounded-bl-sm'
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 flex gap-2 border-t border-outline-variant">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 rounded-full border border-outline-variant focus:ring-2 focus:ring-primary outline-none text-body-md"
        />
        <Button onClick={send} className="!rounded-full w-11 h-11 !p-0 flex items-center justify-center">
          <span className="material-symbols-outlined">send</span>
        </Button>
      </div>
    </div>
  );
}
