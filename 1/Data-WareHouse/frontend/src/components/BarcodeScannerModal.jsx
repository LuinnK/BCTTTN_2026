import { useEffect, useMemo, useRef, useState } from 'react';

const CAMERA_PRIORITY_PATTERNS = [
  /back|rear|environment|world/i,
  /external|usb/i,
  /front|user|face|facetime|integrated|webcam/i,
];

function getCameraPriority(device) {
  const label = device.label || '';
  const matchedIndex = CAMERA_PRIORITY_PATTERNS.findIndex((pattern) => pattern.test(label));
  return matchedIndex === -1 ? CAMERA_PRIORITY_PATTERNS.length : matchedIndex;
}

function getPreferredCameraId(cameraDevices, currentDeviceId) {
  if (!cameraDevices.length) return '';
  if (currentDeviceId && cameraDevices.some((device) => device.deviceId === currentDeviceId)) {
    return currentDeviceId;
  }

  return [...cameraDevices]
    .sort((a, b) => getCameraPriority(a) - getCameraPriority(b))
    .map((device) => device.deviceId)[0];
}

function isIgnorableZxingError(error) {
  const errorName = error?.name || '';
  const message = error?.message || '';

  return (
    errorName === 'NotFoundException' ||
    errorName === 'ChecksumException' ||
    errorName === 'FormatException' ||
    message.includes('No MultiFormat Readers were able to detect the code')
  );
}

export default function BarcodeScannerModal({ open, onClose, onDetected, title = 'Quét mã vạch bằng camera' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const zxingControlsRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [status, setStatus] = useState('Sẵn sàng mở camera');
  const [loading, setLoading] = useState(false);

  const hasCameraSupport = useMemo(
    () => typeof navigator !== 'undefined' && !!navigator.mediaDevices,
    [],
  );
  const hasBarcodeDetectorSupport = useMemo(
    () => typeof window !== 'undefined' && 'BarcodeDetector' in window,
    [],
  );

  useEffect(() => {
    if (!open) {
      stopScanner();
      return undefined;
    }

    if (!hasCameraSupport) {
      setStatus('Trình duyệt không hỗ trợ truy cập camera.');
      return undefined;
    }

    let cancelled = false;

    const initScanner = async () => {
      setLoading(true);
      setStatus('Đang tìm camera...');

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        mediaStream.getTracks().forEach((track) => track.stop());
        const videoDevices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;

        const cameraDevices = videoDevices.filter((device) => device.kind === 'videoinput');
        setDevices(cameraDevices);

        if (!cameraDevices.length) {
          setStatus('Không tìm thấy camera trên thiết bị này.');
          return;
        }

        const preferredDeviceId = getPreferredCameraId(cameraDevices, selectedDeviceId);
        setSelectedDeviceId(preferredDeviceId);
      } catch (error) {
        if (!cancelled) {
          setStatus(error?.message || 'Không thể khởi tạo camera.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    initScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [open, hasCameraSupport]);

  useEffect(() => {
    if (!open || !selectedDeviceId || !videoRef.current) {
      return undefined;
    }

    let active = true;

    const startScanner = async () => {
      stopScanner();
      setLoading(true);
      setStatus(
        hasBarcodeDetectorSupport
          ? 'Đưa mã vạch vào giữa khung hình...'
          : 'Đang khởi động chế độ quét tương thích cho Chrome...',
      );

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { ideal: selectedDeviceId },
            facingMode: 'environment',
          },
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        if (!hasBarcodeDetectorSupport) {
          const { BrowserMultiFormatReader } = await import('@zxing/browser');
          const reader = new BrowserMultiFormatReader();
          let stopped = false;

          const controls = await reader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, error) => {
            if (stopped) return;

            const firstValue = result?.getText?.()?.trim();
            if (firstValue) {
              stopped = true;
              setStatus(`Đã quét: ${firstValue}`);
              zxingControlsRef.current?.stop?.();
              zxingControlsRef.current = null;
              onDetected(firstValue);
              onClose();
              return;
            }

            if (error) {
              const normalizedError = error instanceof Error ? error : new Error(String(error));
              if (!isIgnorableZxingError(normalizedError)) {
                setStatus(normalizedError.message || 'Không thể nhận diện mã vạch.');
              }
            }
          });

          zxingControlsRef.current = controls;
          setStatus('Đưa mã vạch vào giữa khung hình để hệ thống tự nhận diện...');
          return;
        }

        const detector = new window.BarcodeDetector({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'],
        });

        const scanFrame = async () => {
          if (!active || !videoRef.current) return;

          try {
            const barcodes = await detector.detect(videoRef.current);
            const firstValue = barcodes[0]?.rawValue?.trim();
            if (firstValue) {
              setStatus(`Đã quét: ${firstValue}`);
              onDetected(firstValue);
              onClose();
              return;
            }
          } catch (error) {
            setStatus(error?.message || 'Không thể nhận diện mã vạch.');
          }

          frameRef.current = window.requestAnimationFrame(scanFrame);
        };

        frameRef.current = window.requestAnimationFrame(scanFrame);
      } catch (error) {
        if (active) {
          setStatus(error?.message || 'Không thể mở camera.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    startScanner();

    return () => {
      active = false;
      stopScanner();
    };
  }, [open, selectedDeviceId, onClose, onDetected, hasBarcodeDetectorSupport]);

  const stopScanner = () => {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
            <p className="text-sm text-gray-500">Cho phép camera và hướng mã vạch vào vùng video để hệ thống tự nhận diện.</p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 transition hover:text-gray-600" type="button">
            &times;
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="overflow-hidden rounded-xl bg-gray-900">
              <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Chọn camera</label>
                <select
                  className="input-field"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  disabled={!devices.length || loading}
                >
                  {devices.length === 0 ? (
                    <option value="">Không có camera</option>
                  ) : (
                    [...devices]
                      .sort((a, b) => getCameraPriority(a) - getCameraPriority(b))
                      .map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                      </option>
                      ))
                  )}
                </select>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                {status}
              </div>

              <div className="text-sm text-gray-500">
                Nếu camera không mở được, hãy kiểm tra quyền truy cập camera của trình duyệt. Nếu trình duyệt chưa hỗ trợ tự nhận diện, hãy nhập barcode thủ công.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2.5 transition hover:bg-gray-50"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
