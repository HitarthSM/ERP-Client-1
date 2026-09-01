import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getAppName } from '../lib/branding';

type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; percent: number; bytesPerSecond: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string }
  | { status: 'up-to-date' };

function formatSpeed(bps: number): string {
  if (bps > 1_000_000) return `${(bps / 1_000_000).toFixed(1)} MB/s`;
  if (bps > 1_000) return `${(bps / 1_000).toFixed(0)} KB/s`;
  return `${bps} B/s`;
}

export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const [errorDismissed, setErrorDismissed] = useState(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.getUpdateState) return;

    api
      .getUpdateState()
      .then((cached: { status: string; version?: string }) => {
        if (cached.status === 'available' && cached.version) {
          setState({ status: 'available', version: cached.version });
        } else if (cached.status === 'downloaded' && cached.version) {
          setState({ status: 'downloaded', version: cached.version });
        }
      })
      .catch(() => {});

    const unsubs = [
      api.onUpdateChecking(() => {
        setState({ status: 'checking' });
        setErrorDismissed(false);
      }),
      api.onUpdateAvailable((info: { version: string }) =>
        setState({ status: 'available', version: info.version }),
      ),
      api.onUpdateNotAvailable(() => setState({ status: 'up-to-date' })),
      api.onUpdateProgress((p: { percent: number; bytesPerSecond: number }) =>
        setState({
          status: 'downloading',
          percent: p.percent,
          bytesPerSecond: p.bytesPerSecond,
        }),
      ),
      api.onUpdateDownloaded((info: { version: string }) =>
        setState({ status: 'downloaded', version: info.version }),
      ),
      api.onUpdateError((msg: string) => setState({ status: 'error', message: msg })),
    ];

    return () => unsubs.forEach((u) => u());
  }, []);

  const handleDownload = async () => {
    setState({ status: 'downloading', percent: 0, bytesPerSecond: 0 });
    const res = await window.electronAPI.downloadUpdate();
    if (!res.success) {
      setState({ status: 'error', message: res.error ?? 'Download failed' });
    }
  };

  const handleInstall = async () => {
    if (
      !confirm(
        `Restart ${getAppName()} now to install the update? Unsaved local work may be lost.`,
      )
    ) {
      return;
    }
    await window.electronAPI.installUpdate();
  };

  if (
    state.status === 'idle' ||
    state.status === 'checking' ||
    state.status === 'up-to-date'
  ) {
    return null;
  }

  if (state.status === 'error' && errorDismissed) return null;

  let bg = 'bg-blue-600';
  let content: React.ReactNode = null;

  if (state.status === 'available') {
    content = (
      <div className="flex items-center gap-3 w-full">
        <span className="flex-1 text-sm font-medium">
          Update v{state.version} is available
        </span>
        <button
          type="button"
          onClick={() => void handleDownload()}
          className="px-3 py-1 text-xs font-semibold bg-white text-blue-700 rounded hover:bg-blue-50 transition-colors"
        >
          Download
        </button>
      </div>
    );
  } else if (state.status === 'downloading') {
    const pct = Math.round(state.percent);
    content = (
      <div className="flex items-center gap-3 w-full">
        <span className="text-sm font-medium whitespace-nowrap">
          Downloading update… {pct}%
          {state.bytesPerSecond > 0 && (
            <span className="ml-2 text-white/70 text-xs">({formatSpeed(state.bytesPerSecond)})</span>
          )}
        </span>
        <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  } else if (state.status === 'downloaded') {
    bg = 'bg-green-600';
    content = (
      <div className="flex items-center gap-3 w-full">
        <span className="flex-1 text-sm font-medium">
          Update v{state.version} ready — restart to install
        </span>
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="px-3 py-1 text-xs font-semibold bg-white text-green-700 rounded hover:bg-green-50 transition-colors"
        >
          Restart Now
        </button>
      </div>
    );
  } else if (state.status === 'error') {
    bg = 'bg-red-600';
    content = (
      <div className="flex items-center gap-3 w-full">
        <span className="flex-1 text-sm">Update check failed: {state.message}</span>
        <button
          type="button"
          onClick={() => setErrorDismissed(true)}
          className="text-white/70 hover:text-white"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={`${bg} text-white px-4 py-2 flex items-center shrink-0`}>
      {content}
    </div>
  );
}
