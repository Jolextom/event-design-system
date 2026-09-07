"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    Camera,
    RefreshCw,
    X,
    AlertTriangle,
    CheckCircle2,
    Building2,
    GraduationCap,
    Sparkles,
    AlertCircle,
    Info,
    RotateCcw
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Attendee {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    ref?: string | null;
    check_in?: boolean;
    pass?: { title: string } | { title: string }[] | null;
    organization?: string;
    role?: string;
    unipodTour?: string;
}

interface ScanNotification {
    type: "success" | "warning" | "not_found";
    title: string;
    message: string;
    attendee?: Attendee;
}

interface QrCameraScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
    isScanningPaused?: boolean;
    lastNotification?: ScanNotification | null;
    onUndoCheckIn?: (attendeeId: string) => void;
    onViewDetails?: (attendee: Attendee) => void;
}

export default function QrCameraScanner({
    onScan,
    onClose,
    isScanningPaused = false,
    lastNotification,
    onUndoCheckIn,
    onViewDetails,
}: QrCameraScannerProps) {
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
                    (d) =>
                        d.label.toLowerCase().includes("back") ||
                        d.label.toLowerCase().includes("rear") ||
                        d.label.toLowerCase().includes("environment")
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
                    qrbox: { width: 230, height: 230 },
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
        setSelectedCameraId(newCameraId);
        try {
            await scannerRef.current.stop();
            await startScanning(scannerRef.current, newCameraId);
            setIsInitializing(false);
        } catch (err: any) {
            console.error("Switch camera error:", err);
            setError(err?.message || "Failed to switch camera.");
            setIsInitializing(false);
        }
    };

    const attendee = lastNotification?.attendee;
    const passTitle = attendee?.pass
        ? Array.isArray(attendee.pass)
            ? attendee.pass[0]?.title
            : attendee.pass.title
        : null;

    return (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="bg-gray-900 rounded-3xl sm:rounded-[32px] border border-gray-800 w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[95vh]">
                {/* Modal Header */}
                <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-800 bg-gray-900/90">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                            <Camera className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white">Live QR Scanner</h3>
                            <p className="text-[10px] font-bold text-gray-400">Scan phone ticket or printed pass</p>
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
                <div className="relative bg-black flex items-center justify-center min-h-[260px] max-h-[300px] overflow-hidden">
                    <div id="qr-reader-video-container" className="w-full h-full min-h-[260px]" />

                    {/* Viewfinder Target Graphic */}
                    {!error && !isInitializing && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div
                                className={cn(
                                    "relative w-52 h-52 border-2 border-dashed rounded-2xl transition-colors duration-300",
                                    lastNotification?.type === "success"
                                        ? "border-green-400"
                                        : lastNotification?.type === "warning"
                                        ? "border-amber-400"
                                        : "border-blue-400/80"
                                )}
                            >
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

                {/* IN-CAMERA ATTENDEE FEEDBACK HUD (Live scanned details) */}
                <div className="p-3 bg-gray-950 border-t border-gray-800">
                    <AnimatePresence mode="wait">
                        {lastNotification ? (
                            <motion.div
                                key={lastNotification.title + (attendee?.id || "")}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className={cn(
                                    "p-3.5 rounded-2xl border flex flex-col gap-2 transition-all",
                                    lastNotification.type === "success" &&
                                        "bg-gradient-to-r from-emerald-950/80 to-emerald-900/60 border-emerald-500/40 text-emerald-100",
                                    lastNotification.type === "warning" &&
                                        "bg-gradient-to-r from-amber-950/80 to-amber-900/60 border-amber-500/40 text-amber-100",
                                    lastNotification.type === "not_found" &&
                                        "bg-gradient-to-r from-rose-950/80 to-rose-900/60 border-rose-500/40 text-rose-100"
                                )}
                            >
                                {/* Header Row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {lastNotification.type === "success" && (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                        )}
                                        {lastNotification.type === "warning" && (
                                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                        )}
                                        {lastNotification.type === "not_found" && (
                                            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                        )}
                                        <span className="text-[10px] font-black uppercase tracking-wider">
                                            {lastNotification.title}
                                        </span>
                                    </div>

                                    {/* Action buttons inside HUD */}
                                    <div className="flex items-center gap-2">
                                        {attendee && onUndoCheckIn && lastNotification.type === "success" && (
                                            <button
                                                onClick={() => onUndoCheckIn(attendee.id)}
                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-300 hover:text-rose-400 bg-gray-800/80 px-2 py-0.5 rounded-md transition-colors"
                                            >
                                                <RotateCcw className="w-2.5 h-2.5" />
                                                <span>Undo</span>
                                            </button>
                                        )}
                                        {attendee && onViewDetails && (
                                            <button
                                                onClick={() => onViewDetails(attendee)}
                                                className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-300 hover:text-white bg-blue-900/60 px-2 py-0.5 rounded-md transition-colors"
                                            >
                                                <Info className="w-2.5 h-2.5" />
                                                <span>Details</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Guest Name */}
                                {attendee ? (
                                    <div>
                                        <div className="text-base font-black text-white tracking-tight leading-tight">
                                            {attendee.first_name} {attendee.last_name}
                                        </div>

                                        {/* Rich Badges */}
                                        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                            {passTitle && (
                                                <span className="text-[9px] font-black uppercase bg-white/10 px-2 py-0.5 rounded text-gray-200">
                                                    {passTitle}
                                                </span>
                                            )}
                                            {attendee.organization && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded text-gray-200">
                                                    <Building2 className="w-2.5 h-2.5 text-gray-400" />
                                                    <span className="truncate max-w-[130px]">
                                                        {attendee.organization}
                                                    </span>
                                                </span>
                                            )}
                                            {attendee.role && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded text-gray-200">
                                                    <GraduationCap className="w-2.5 h-2.5 text-blue-400" />
                                                    <span>{attendee.role}</span>
                                                </span>
                                            )}
                                            {attendee.unipodTour?.toLowerCase() === "yes" && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded shadow-xs">
                                                    <Sparkles className="w-2.5 h-2.5" />
                                                    UNIPOD TOUR: YES
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs font-bold text-gray-300">{lastNotification.message}</p>
                                )}
                            </motion.div>
                        ) : (
                            <div className="p-3 text-center text-xs font-bold text-gray-500">
                                Ready to scan • Aim camera at attendee QR ticket
                            </div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer Controls */}
                <div className="p-3.5 bg-gray-900 border-t border-gray-800 flex items-center justify-between gap-3">
                    {cameras.length > 1 ? (
                        <div className="flex items-center gap-2 flex-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider shrink-0">
                                Cam:
                            </span>
                            <select
                                value={selectedCameraId}
                                onChange={(e) => handleSwitchCamera(e.target.value)}
                                className="bg-gray-800 text-white text-xs font-bold rounded-xl px-2.5 py-1.5 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 flex-1 truncate"
                            >
                                {cameras.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.label || `Camera ${c.id.substring(0, 5)}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Camera Active
                        </span>
                    )}

                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-black rounded-xl transition-colors shrink-0"
                    >
                        Done Scanning
                    </button>
                </div>
            </div>
        </div>
    );
}
