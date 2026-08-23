import { useEffect, useRef, useState } from 'react';
import { cx } from '../../utils/helpers';
import { formatDuration } from '../../utils/formatDate';
import Button from '../common/Button';

const REMOTE_PARTICIPANT = {
  name: 'Dr. Rajesh Khanna',
  role: 'Consulting Physician',
  specialty: 'Cardiology',
};

/**
 * ConsultationVideo - telemedicine video surface.
 * Props:
 *  - patient: { name, ... }
 *  - onEnd: callback when the call ends
 *  - doctor: optional remote participant
 *  - enableRecording: allow recording the session (default true)
 *  - onRecordingComplete: ({ videoBlob, mimeType, duration }) => void
 *      videoBlob is null in demo/simulated mode (no real stream).
 *  - onRecordingStatusChange: ({ active, mode }) => void
 *      mode: 'real' | 'simulated' | null
 */
export default function ConsultationVideo({
  patient,
  onEnd,
  doctor = REMOTE_PARTICIPANT,
  enableRecording = true,
  onRecordingComplete,
  onRecordingStatusChange,
}) {
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [connection, setConnection] = useState('connecting');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [recordingMode, setRecordingMode] = useState(null);

  const startRef = useRef(Date.now());
  const callTimerRef = useRef(null);
  const recordStartRef = useRef(Date.now());
  const recordTimerRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingElapsedRef = useRef(0);
  const modeRef = useRef(null);
  const onCompleteRef = useRef(onRecordingComplete);
  const onStatusRef = useRef(onRecordingStatusChange);

  onCompleteRef.current = onRecordingComplete;
  onStatusRef.current = onRecordingStatusChange;

  useEffect(() => {
    const connectTimer = setTimeout(() => setConnection('connected'), 1200);
    callTimerRef.current = setInterval(
      () => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)),
      1000
    );
    return () => {
      clearTimeout(connectTimer);
      clearInterval(callTimerRef.current);
      clearInterval(recordTimerRef.current);
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const stopTracks = () => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  };

  const finishRecording = (videoBlob, mimeType, duration) => {
    setRecordingMode(null);
    onCompleteRef.current?.({ videoBlob, mimeType, duration });
  };

  const handleRecorderStop = () => {
    const recorder = mediaRecorderRef.current;
    const mimeType = recorder?.mimeType || 'video/webm';
    const blob = new Blob(chunksRef.current || [], { type: mimeType });
    const duration = recordingElapsedRef.current;
    stopTracks();
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
    finishRecording(blob.size > 0 ? blob : null, mimeType, duration);
  };

  const startRecording = async () => {
    if (isRecording) return;
    recordStartRef.current = Date.now();
    recordingElapsedRef.current = 0;

    let mode = 'simulated';
    if (enableRecording && 'MediaRecorder' in window && navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(
          (type) => MediaRecorder.isTypeSupported(type)
        );
        const recorder = new MediaRecorder(stream, { mimeType });
        chunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = handleRecorderStop;
        recorder.start();
        mediaStreamRef.current = stream;
        mediaRecorderRef.current = recorder;
        mode = 'real';
      } catch {
        mode = 'simulated';
      }
    }

    modeRef.current = mode;
    setIsRecording(true);
    setRecordingMode(mode);
    setRecordingElapsed(0);
    recordTimerRef.current = setInterval(() => {
      recordingElapsedRef.current = Math.floor((Date.now() - recordStartRef.current) / 1000);
      setRecordingElapsed(recordingElapsedRef.current);
    }, 1000);
    onStatusRef.current?.({ active: true, mode });
  };

  const stopRecording = () => {
    if (!isRecording) return;
    recordingElapsedRef.current = Math.floor((Date.now() - recordStartRef.current) / 1000);
    clearInterval(recordTimerRef.current);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
      return;
    }

    const duration = recordingElapsedRef.current;
    stopTracks();
    setIsRecording(false);
    finishRecording(null, null, duration);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-2xl card-shadow overflow-hidden">
      <div className="relative bg-black aspect-video flex items-center justify-center">
        {videoOff ? (
          <div className="text-center text-white/70">
            <span className="material-symbols-outlined text-6xl">videocam_off</span>
            <p className="mt-2 font-bold">Camera off</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center text-4xl font-headline font-bold mb-4">
              {patient?.name?.split(' ').map((n) => n[0]).join('') || 'JD'}
            </div>
            <p className="text-white font-headline text-title-lg">{patient?.name}</p>
            <p className="text-white/60">Patient · {connection === 'connected' ? 'Connected' : 'Connecting…'}</p>
            <div className="absolute inset-0 pointer-events-none video-grid opacity-10" />
          </div>
        )}

        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 text-white px-3 py-1.5 rounded-full">
            <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse" />
            <span className="text-label-md font-bold">REC {formatDuration(recordingElapsed)}</span>
            <span className="text-label-sm text-white/60">
              {recordingMode === 'real' ? 'Recording' : 'Demo mode'}
            </span>
          </div>
        )}

        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 text-white px-3 py-1.5 rounded-full">
          <span
            className={cx(
              'w-2 h-2 rounded-full',
              connection === 'connected' ? 'bg-success' : 'bg-secondary-fixed animate-pulse'
            )}
          />
          <span className="text-label-md font-bold">
            {connection === 'connected' ? 'Connected' : 'Connecting…'}
          </span>
          <span className="material-symbols-outlined text-sm text-white/60">lock</span>
        </div>

        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/40 text-white px-3 py-1.5 rounded-full text-label-md">
          <span className="material-symbols-outlined text-sm text-error">fiber_manual_record</span>
          {formatDuration(elapsed)}
        </div>

        <div className="absolute bottom-4 right-4 w-40 aspect-video rounded-lg overflow-hidden border-2 border-white/30 bg-surface-container shadow-lg">
          {videoOff ? (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-white/70">videocam_off</span>
            </div>
          ) : (
            <div className="w-full h-full bg-primary/40 flex items-center justify-center">
              <span className="text-white font-headline font-bold">
                {doctor.name.split(' ').map((n) => n[0]).join('')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline font-bold">
            {doctor.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-on-surface truncate">{doctor.name}</p>
            <p className="text-label-sm text-on-surface-variant">{doctor.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setMuted((m) => !m)}
            className={cx(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all',
              muted ? 'bg-error text-white' : 'bg-surface-variant text-on-surface-variant'
            )}
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            <span className="material-symbols-outlined">{muted ? 'mic_off' : 'mic'}</span>
          </button>
          <button
            onClick={() => setVideoOff((v) => !v)}
            className={cx(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all',
              videoOff ? 'bg-error text-white' : 'bg-surface-variant text-on-surface-variant'
            )}
            aria-label={videoOff ? 'Turn camera on' : 'Turn camera off'}
          >
            <span className="material-symbols-outlined">{videoOff ? 'videocam_off' : 'videocam'}</span>
          </button>
          <button
            onClick={toggleRecording}
            className={cx(
              'w-12 h-12 rounded-full flex items-center justify-center transition-all',
              isRecording ? 'bg-error text-white' : 'bg-surface-variant text-on-surface-variant'
            )}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <span className="material-symbols-outlined">{isRecording ? 'stop' : 'fiber_manual_record'}</span>
          </button>
          <Button variant="danger" onClick={onEnd}>
            <span className="material-symbols-outlined">call_end</span>
            End Call
          </Button>
        </div>
      </div>
    </div>
  );
}
