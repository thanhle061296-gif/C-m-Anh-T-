import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ isOpen, onClose, onCapture }) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setErrorMsg(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setErrorMsg('Không thể mở máy ảnh. Vui lòng cấp quyền truy cập camera cho trình duyệt.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Compress to high quality jpeg
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmCapture = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      handleClose();
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 bg-zinc-950/80">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-rose-500" />
            <h3 className="font-bold text-white text-base">Chụp ảnh tài sản / CCCD</h3>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[360px] overflow-hidden">
          {errorMsg ? (
            <div className="p-6 text-center text-rose-400 max-w-sm">
              <AlertCircle className="h-10 w-10 mx-auto mb-3" />
              <p className="text-sm font-medium">{errorMsg}</p>
              <button
                onClick={startCamera}
                className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-xl text-xs hover:bg-zinc-700"
              >
                Thử lại
              </button>
            </div>
          ) : capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-contain max-h-[60vh]" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain max-h-[60vh]"
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Viewfinder crosshairs */}
              <div className="pointer-events-none absolute inset-8 border border-white/20 rounded-xl flex items-center justify-center">
                <div className="w-16 h-16 border-t-2 border-b-2 border-rose-500/70" />
                <div className="absolute w-16 h-16 border-l-2 border-r-2 border-rose-500/70" />
              </div>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="border-t border-zinc-800 bg-zinc-950 p-4 flex items-center justify-around">
          {capturedImage ? (
            <>
              <button
                onClick={retake}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-800 text-zinc-200 hover:bg-zinc-700 font-semibold text-sm transition"
              >
                <RefreshCw className="h-4 w-4" />
                Chụp lại
              </button>
              <button
                onClick={confirmCapture}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-950/50 transition"
              >
                <Check className="h-5 w-5" />
                Dùng ảnh này
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleFacingMode}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 text-xs font-medium transition"
                title="Đổi camera trước/sau"
              >
                <RefreshCw className="h-4 w-4" />
                Đổi camera
              </button>
              <button
                onClick={takeSnapshot}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-xl shadow-rose-600/40 active:scale-95 transition"
                title="Bấm để chụp"
              >
                <div className="h-13 w-13 rounded-full border-2 border-white/80" />
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-3 rounded-xl text-zinc-400 hover:text-white text-xs font-medium"
              >
                Đóng
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
