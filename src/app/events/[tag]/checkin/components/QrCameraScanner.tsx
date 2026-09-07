"use client";

import React, { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface QrCameraScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
    isScanningPaused?: boolean;
}

export default function QrCameraScanner({ onScan, onClose, isScanningPaused = false }: QrCameraScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [isInitializing, setIsInitializing] = useState<boolean>(true);
    const lastScannedRef = useRef<{ text: string; time: number }>({ text: "", time: 0 });

    useEffect(() => {
        let isMounted = true;
        const elementId = "qr-reader-video-container";

        async function initCamera() {
            try {
                const devices = await Html5Qrcode.getCameras();
                if (!isMounted) return;

                if (!devices || devices.length === 0) {
                    setError("No camera found on this device. Please use manual code search.");
                    setIsInitializing(false);
                    return;
                }

                setCameras(devices);
                // Prefer back/rear camera on mobile
                const backCamera = devices.find(
                    (d) => d.label.toLowerCase().includes("back") || d.label.toLowerCase().includes("rear") || d.label.toLowerCase().includes("environment")
                );
                const chosenCamera = backCamera || devices[0];
                setSelectedCameraId(chosenCamera.id);

                const scanner = new Html5Qrcode(elementId);
                scannerRef.current = scanner;

                await startScanning(scanner, chosenCamera.id);
                if (isMounted) setIsInitializing(false);
            } catch (err: any) {
                if (!isMounted) return;
                console.error("Camera init error:", err);
                setError(err?.message || "Failed to access camera. Please allow camera permissions in your browser.");
                setIsInitializing(false);
            }
        }

        initCamera();

        return () => {
            isMounted = false;
            if (scannerRef.current) {
                scannerRef.current
                    .stop()
                    .then(() => scannerRef.current?.clear())
                    .catch((e) => console.warn("Scanner stop error on cleanup:", e));
            }
        };
    }, []);

    async function startScanning(scanner: Html5Qrcode, cameraId: string) {
        try {
            await scanner.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    // Debounce same code within 2.5 seconds to prevent multi-scans
                    const now = Date.now();
                    if (decodedText === lastScannedRef.current.text && now - lastScannedRef.current.time < 2500) {
                        return;
                    }
                    lastScannedRef.current = { text: decodedText, time: now };
                    onScan(decodedText);
                },
                () => {
                    // ignore frame-level decode failures
                }
            );
        } catch (err: any) {
            console.error("Failed to start scanner:", err);
            setError(err?.message || "Could not start camera feed.");
        }
    }

    const handleSwitchCamera = async (newCameraId: string) => {
        if (!scannerRef.current || newCameraId === selectedCameraId) return;
        setIsInitializing(true);
        try {
            await scannerRef.current.stop();
            setSelectedCameraId(newCameraId);
            await startScanning(scannerRef.current, newCameraId);
        } catch (err: any) {
            console.error("Camera switch error:", err);
            setError(err?.message || "Failed to switch camera.");
        } finally {
            setIsInitializing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-[32px] border border-gray-800 w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-800">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                            <Camera className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white">Scan Attendee QR Code</h3>
                            <p className="text-[10px] font-bold text-gray-400">Point at attendee phone or ticket</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 flex items-center justify-center transition-colors"
                        aria-label="Close scanner"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Camera Viewfinder */}
                <div className="relative bg-black flex items-center justify-center min-h-[320px] overflow-hidden">
                    <div id="qr-reader-video-container" className="w-full h-full min-h-[320px]" />

                    {/* Viewfinder Target Graphic */}
                    {!error && !isInitializing && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="relative w-56 h-56 border-2 border-dashed border-blue-400/80 rounded-2xl">
                                {/* Corners */}
                                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                                {/* Subtle animated scan line */}
                                <div className="absolute left-2 right-2 h-0.5 bg-blue-400/80 shadow-[0_0_8px_#60a5fa] animate-pulse top-1/2 -translate-y-1/2" />
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {isInitializing && (
                        <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                            <span className="text-xs font-bold text-gray-300">Opening camera...</span>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center p-6 text-center gap-3">
                            <AlertTriangle className="w-10 h-10 text-amber-400" />
                            <p className="text-xs font-bold text-gray-300 max-w-xs">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 px-4 py-2 bg-gray-800 text-xs font-bold text-white rounded-xl hover:bg-gray-700"
                            >
                                Retry
                            </button>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-gray-900 border-t border-gray-800 flex items-center justify-between gap-3">
                    {cameras.length > 1 ? (
                        <div className="flex items-center gap-2 flex-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Camera:</span>
                            <select
                                value={selectedCameraId}
                                onChange={(e) => handleSwitchCamera(e.target.value)}
                                className="bg-gray-800 text-white text-xs font-bold rounded-xl px-3 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 truncate"
                            >
                                {cameras.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label || `Camera ${c.id.substring(0, 5)}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            Align QR code inside square
                        </p>
                    )}

                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-black rounded-xl transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
