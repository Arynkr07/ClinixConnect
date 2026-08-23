import { useEffect, useRef, useState } from 'react';
import { formatDuration, formatDateTime } from '../../utils/formatDate';
import { createBlobUrl, revokeBlobUrl, downloadBlob } from '../../utils/recordingUtils';
import Button from '../common/Button';

/**
 * RecordingPlayer - play / download / delete a consultation video recording.
 * Props:
 *  - recording: { id, recordingName, duration, recordingDate, videoBlob, mimeType }
 *  - onDelete: (id) => void
 *  - compact: render in a short single-row layout (for lists)
 */
export default function RecordingPlayer({ recording, onDelete, compact = false }) {
  const videoRef = useRef(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(recording?.duration || 0);

  useEffect(() => {
    if (!recording?.videoBlob) return undefined;
    const url = createBlobUrl(recording.videoBlob);
    setBlobUrl(url);
    return () => revokeBlobUrl(url);
  }, [recording]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !blobUrl) return undefined;
    const onTime = () => setTime(video.currentTime);
    const onMeta = () => setDuration(video.duration || recording?.duration || 0);
    const onEnd = () => setPlaying(false);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('ended', onEnd);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('ended', onEnd);
    };
  }, [blobUrl, recording]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const seek = (value) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Number(value);
    setTime(Number(value));
  };

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen?.();
    }
  };

  const handleDelete = () => {
    if (!recording?.id) return;
    if (window.confirm(`Delete recording "${recording.recordingName}"? This cannot be undone.`)) {
      onDelete?.(recording.id);
    }
  };

  const handleDownload = () => {
    if (!recording?.videoBlob) return;
    downloadBlob(recording.videoBlob, recording.recordingName || `recording-${recording.id}.webm`);
  };

  const filename = recording?.recordingName || 'Consultation recording';
  const hasVideo = Boolean(blobUrl);

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2">
        <button
          onClick={togglePlay}
          disabled={!hasVideo}
          className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center disabled:opacity-40 shrink-0"
          aria-label={playing ? 'Pause recording' : 'Play recording'}
        >
          <span className="material-symbols-outlined">{playing ? 'pause' : 'play_arrow'}</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-label-lg font-bold text-on-surface truncate">{filename}</p>
          <p className="text-label-sm text-on-surface-variant">
            {recording?.recordingDate
              ? formatDateTime(recording.recordingDate, 'MMM d, yyyy')
              : ''}
            {' · '}
            {formatDuration(recording?.duration || 0)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDownload}
            disabled={!hasVideo}
            className="p-2 rounded-full text-primary hover:bg-primary-container/30 disabled:opacity-40"
            title="Download recording"
            aria-label="Download recording"
          >
            <span className="material-symbols-outlined text-lg">download</span>
          </button>
          <button
            onClick={handleDelete}
            className="p-2 rounded-full text-error hover:bg-error-container disabled:opacity-40"
            title="Delete recording"
            aria-label="Delete recording"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
          </button>
        </div>
        {hasVideo && <video ref={videoRef} src={blobUrl} className="hidden" />}
      </div>
    );
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl card-shadow overflow-hidden">
      <div className="relative bg-black aspect-video flex items-center justify-center">
        {hasVideo ? (
          <video ref={videoRef} src={blobUrl} muted={muted} className="w-full h-full object-contain" />
        ) : (
          <div className="text-center text-white/60">
            <span className="material-symbols-outlined text-6xl">videocam_off</span>
            <p className="mt-2 font-bold">No video captured</p>
            <p className="text-label-sm text-white/50">Demo session — audio/video stream not recorded.</p>
          </div>
        )}

        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || 0)}
            onChange={(e) => seek(e.target.value)}
            className="w-full accent-primary"
            aria-label="Seek"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                disabled={!hasVideo}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white disabled:opacity-40"
                aria-label={playing ? 'Pause' : 'Play'}
              >
                <span className="material-symbols-outlined">{playing ? 'pause' : 'play_arrow'}</span>
              </button>
              <button
                onClick={() => setMuted((m) => !m)}
                disabled={!hasVideo}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white disabled:opacity-40"
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                <span className="material-symbols-outlined">{muted ? 'volume_off' : 'volume_up'}</span>
              </button>
              <span className="text-white text-label-md">
                {formatDuration(time)} / {formatDuration(duration)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                disabled={!hasVideo}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white disabled:opacity-40"
                aria-label="Fullscreen"
              >
                <span className="material-symbols-outlined text-lg">fullscreen</span>
              </button>
              <Button size="sm" icon="download" disabled={!hasVideo} onClick={handleDownload}>
                Download
              </Button>
              <Button size="sm" variant="danger" icon="delete" onClick={handleDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
