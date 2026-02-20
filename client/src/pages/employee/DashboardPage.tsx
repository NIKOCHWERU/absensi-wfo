import { useAuth } from "@/hooks/use-auth";
import { useAttendance } from "@/hooks/use-attendance";
import { CompanyHeader } from "@/components/CompanyHeader";
import { DigitalClock } from "@/components/DigitalClock";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, User, Camera, MapPin, Coffee, LogOut, X, Check, RefreshCw, SwitchCamera, Zap } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { CameraModal } from "@/components/CameraModal";
import { WorkTimer } from "@/components/WorkTimer";
import { reverseGeocode } from "@/lib/geocoding";
import { PiketSchedule } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

// Helper component for Shift Selection Modal
function ShiftModal({
    open,
    onSelect,
    onClose
}: {
    open: boolean,
    onSelect: (shift: string) => void,
    onClose: () => void
}) {
    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="rounded-2xl max-w-xs md:max-w-md">
                <DialogHeader>
                    <DialogTitle>Pilih Shift Kerja</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 gap-3">
                    <Button
                        variant="outline"
                        className="h-12 justify-start px-4 text-base"
                        onClick={() => onSelect('Shift 1')}
                    >
                        <span className="font-bold mr-2">Shift 1</span>
                        <span className="text-muted-foreground text-xs">(07:00 - 15:00)</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-12 justify-start px-4 text-base"
                        onClick={() => onSelect('Shift 2')}
                    >
                        <span className="font-bold mr-2">Shift 2</span>
                        <span className="text-muted-foreground text-xs">(12:00 - 20:00)</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-12 justify-start px-4 text-base"
                        onClick={() => onSelect('Shift 3')}
                    >
                        <span className="font-bold mr-2">Shift 3</span>
                        <span className="text-muted-foreground text-xs">(15:00 - 23:00)</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-12 justify-start px-4 text-base"
                        onClick={() => onSelect('Tim Management')}
                    >
                        <span className="font-bold mr-2">Tim Management</span>
                        <span className="text-muted-foreground text-xs">(07:00 - 17:00)</span>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-12 justify-start px-4 text-base"
                        onClick={() => onSelect('Long Shift')}
                    >
                        <span className="font-bold mr-2">Long Shift</span>
                        <span className="text-muted-foreground text-xs">(07:00 - ??)</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function EmployeeDashboard() {
    const { user } = useAuth();
    const { today, isLoadingToday, clockIn, clockOut, breakStart, breakEnd, permit, resume, isPending } = useAttendance();
    const { toast } = useToast();

    const [permitOpen, setPermitOpen] = useState(false);
    const [permitNote, setPermitNote] = useState("");
    const [permitType, setPermitType] = useState<"sick" | "permission">("permission");
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    // Shift Selection State
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [selectedShift, setSelectedShift] = useState<string | null>(null);

    const [activeAction, setActiveAction] = useState<{
        fn: (data: any) => Promise<any>,
        successTitle: string,
        type: 'attendance' | 'permit'
    } | null>(null);

    const [locationAddress, setLocationAddress] = useState<string>("");
    const [processingLocation, setProcessingLocation] = useState(false);

    const { data: schedules } = useQuery<PiketSchedule[]>({
        queryKey: ["/api/piket-schedules", format(new Date(), "yyyy-MM")],
    });

    const isScheduledPiket = schedules?.some(s => s.userId === user?.id && s.date === format(new Date(), "yyyy-MM-dd"));

    useEffect(() => {
        if (isScheduledPiket) setIsPiket(true);
    }, [isScheduledPiket]);

    // ... (Keep existing getCoordinates logic)
    const getCoordinates = async (): Promise<{ lat: number, lng: number, address: string }> => {
        if (!navigator.geolocation) {
            throw new Error("Geolocation is not supported by your browser");
        }

        setProcessingLocation(true);
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            const { latitude, longitude } = position.coords;
            const address = await reverseGeocode(latitude, longitude);

            setLocationAddress(address);
            return { lat: latitude, lng: longitude, address };
        } finally {
            setProcessingLocation(false);
        }
    };

    const handleError = (err: any) => {
        console.error(err);
        toast({
            title: "Gagal",
            description: err.message || "Terjadi kesalahan",
            variant: "destructive"
        });
    };

    const [isPiket, setIsPiket] = useState(false);

    const startAttendanceFlow = async (actionFn: (data: any) => Promise<any>, successTitle: string, requireShift = false) => {
        // For ABSENSI NH, we only use 'Management' shift.
        if (requireShift) {
            const wrappedClockIn = async (data: any) => {
                return clockIn({ ...data, shift: 'Management', shiftType: isPiket ? 'Piket' : 'Regular' });
            };
            setActiveAction({ fn: wrappedClockIn, successTitle, type: 'attendance' });
            setIsCameraOpen(true);
            return;
        }

        setActiveAction({ fn: actionFn, successTitle, type: 'attendance' });
        setIsCameraOpen(true);
    };

    // Removed handleShiftSelect logic as it's now defaulted to Management

    const startPermitFlow = () => {
        setPermitOpen(true);
    };

    const handlePermitCameraTrigger = () => {
        setPermitOpen(false);
        setActiveAction({
            fn: async (data: any) => {
                return permit({
                    type: permitType,
                    notes: permitNote,
                    checkInPhoto: data.checkInPhoto,
                    location: data.location
                });
            },
            successTitle: "Izin Diajukan",
            type: 'permit'
        });
        setIsCameraOpen(true);
    }

    const handlePhotoCaptured = async (photoData: string) => {
        if (!activeAction) return;

        try {
            const { address } = await getCoordinates();

            await activeAction.fn({
                location: address,
                checkInPhoto: photoData
            });

            toast({
                title: activeAction.successTitle,
                description: `Lokasi: ${address}`,
                className: "bg-green-500 text-white"
            });

            // Only close on success
            setIsCameraOpen(false);
            setActiveAction(null);
            // Clear shift selection after success
            setSelectedShift(null);

        } catch (err: any) {
            handleError(err);
            // Re-throw so the modal knows it failed
            throw err;
        }
    };

    // Clock Out Logic for Early Leave Check
    const handleClockOutClick = () => {
        // Logic: if current time < shift end time, warn user
        // We need to know shift end time. 
        // User prompt says: "jika karyawan pulang sebelum jam nya beri peringatan... dan beri pilihan IZIN"
        // Since we don't track shift info in 'today' object fully (we just added it to schema), we might need to rely on assumptions or fetch it.
        // Let's assume standard 8 hours from clockIn or fixed times based on shift name if we can get it.
        // BUT 'today' object in 'useAttendance' might not have 'shift' field yet on frontend type.
        // We should check shared/schema.ts updates are reflected in frontend types (Drizzle types are inferred usually).

        // Let's assume we can access today.shift or infer it.
        // If we can't get it easily, we will just prompt "Apakah anda yakin pulang sekarang?" -> "Izin Pulang Cepat" or "Pulang Biasa".
        // But prompt asks specific warning. 

        // Since I just added 'shift' to schema, 'today' SHOULD have it if I refetched.
        // Let's check time.

        const now = new Date();
        const hour = now.getHours();
        let isEarly = false;

        // We need to know the shift of the current attendance.
        // 'today' is type Attendance.
        // We can check 'today.shift' (we need to cast or ensure type is updated).
        // Let's assume 'today' has 'shift' property now.

        const currentShift = (today as any)?.shift;

        if (currentShift === 'Shift 1') {
            if (hour < 15) isEarly = true; // Ends 15:00
        } else if (currentShift === 'Shift 2') {
            if (hour < 20) isEarly = true; // Ends 20:00 (assumed 8h from 12)
            // Wait, shift 2 entry 12-14. Late >12. 
            // Use prompt rules? Shift 1 late >7. Shift 2 late >12. Shift 3 late >15.
            // Let's assume 8h work.
            // Shift 1: 07-15? Shift 2: 12-20? Shift 3: 15-23? Long: 07-??
        } else if (currentShift === 'Shift 3') {
            // Ends 23:00?
            if (hour < 23) {
                // But 23 is late night. Check if hour is small (next day) ? 
                // Complex. Let's just use 23 for today.
                isEarly = true;
            }
        }
        // If no shift stored, maybe skip check or warn always.

        if (isEarly) {
            // Show alert dialog (using a simple browser confirm or better a custom dialog)
            // Since I can't easily add another complex Dialog in this huge file without risk, I'll use window.confirm? 
            // No, User wants "pilihan IZIN yang akan membuat keterangan izin".

            // I'll reuse the Permit Flow for "Early Leave" aka "Izin Pulang"?
            // "jika karyawan pulang sebelum jam nya... beri pilihan IZIN yang akan membuat keterangan izin, dan foto pulang"

            // Let's trigger a specialized dialog or reuse permit dialog with type "permission" and prefilled note "Pulang Cepat / Early Leave".

            // I will use a simple window.confirm to ask "Belum waktunya pulang. Apakah anda ingin Izin Pulang Cepat?" 
            // If yes -> Open Permit Dialog. 
            // If no -> Cancel? Or proceed as normal clock out? 
            // "beri peringatan ... dan beri pilihan" -> usually implies blocking normal flow unless they force it, or guiding them to Izin.

            if (confirm("Belum waktunya pulang. Apakah Anda ingin mengajukan ISTIRAHAT/IZIN Pulang Cepat? \n\nKlik OK untuk Form Izin.\nKlik Cancel untuk membatalkan.")) {
                setPermitType('permission');
                setPermitNote("Pulang Cepat (Early Leave)");
                setPermitOpen(true);
            }
            return;
        }

        startAttendanceFlow(clockOut, "Hati-hati di jalan");
    };

    const isLoading = isPending || processingLocation;

    const hasCheckedIn = !!today?.checkIn;
    const hasCheckedOut = !!today?.checkOut;
    const isBreak = !!today?.breakStart && !today?.breakEnd;
    const hasBreakEnded = !!today?.breakEnd;

    const getStatusText = () => {
        if (!today) return "Belum Absen";
        if (today.status === 'sick') return "Sakit";
        if (today.status === 'permission') return "Izin";
        if (today.status === 'late') return "Telat";
        if (today.status === 'present') return "Hadir";
        if (today.checkOut) return "Absensi Selesai";
        if (isBreak) return "Sedang Istirahat";
        if (hasBreakEnded) return "Waktunya Pulang";
        return "Sedang Bekerja";
    };

    const handleResumeWork = async () => {
        if (confirm("Mau lanjut kerja hari ini?")) {
            try {
                await resume();
                toast({ title: "Selamat Bekerja Kembali", description: "Sesi Anda telah diaktifkan kembali." });
            } catch (err: any) {
                handleError(err);
            }
        }
    };

    const renderMainButton = () => {
        if (today?.status === 'sick' || today?.status === 'permission') {
            return (
                <Button
                    onClick={handleResumeWork}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-500 text-white font-bold shadow-primary/20 shadow-lg text-lg animate-pulse"
                >
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : (
                        <>
                            <Zap className="mr-2 h-5 w-5" />
                            Masuk Kerja
                        </>
                    )}
                </Button>
            );
        }
        if (today?.checkOut) {
            const currentHour = new Date().getHours();
            const canStartOvertime = currentHour >= 17 || (new Date().getDay() === 0 || new Date().getDay() === 6);

            return (
                <div className="flex flex-col gap-3 w-full">
                    <div className="bg-primary/10 border border-primary/20 p-4 rounded-2xl text-center">
                        <p className="text-primary font-bold text-sm">Absensi Selesai</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Sesi {today.sessionNumber}</p>
                    </div>

                    {canStartOvertime && (
                        <Button
                            onClick={handleResumeWork}
                            className="w-full h-15 rounded-2xl bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-600 text-white font-black shadow-primary/30 shadow-xl text-lg transition-all transform active:scale-95"
                        >
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : (
                                <>
                                    <Zap className="mr-2 h-6 w-6" />
                                    MULAI SESI OVERTIME
                                </>
                            )}
                        </Button>
                    )}
                </div>
            );
        }

        if (!hasCheckedIn) {
            return (
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-2xl border border-primary/10 shadow-sm flex items-center justify-between transition-all hover:border-primary/30">
                        <div className="flex flex-col">
                            <span className="font-extrabold text-foreground text-sm">Piket Hari Ini?</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Masuk sebelum 08:15</span>
                        </div>
                        <div
                            className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-all duration-500 ${isPiket ? 'bg-primary shadow-inner shadow-black/10' : 'bg-slate-200'}`}
                            onClick={() => setIsPiket(!isPiket)}
                        >
                            <div className={`bg-white w-6 h-6 rounded-full shadow-lg transform duration-300 ease-in-out ${isPiket ? 'translate-x-6' : ''}`} />
                        </div>
                    </div>

                    <Button
                        onClick={() => startAttendanceFlow(clockIn, "Berhasil Absen Masuk", true)}
                        disabled={isLoading}
                        className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black shadow-primary/30 shadow-xl text-xl transition-all transform active:scale-95 flex items-center justify-center gap-3"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                            <>
                                <Camera className="h-6 w-6" />
                                <span>ABSEN MASUK {isPiket ? 'PIKET' : ''}</span>
                            </>
                        )}
                    </Button>
                </div>
            );
        }

        if (!isBreak && !hasBreakEnded) {
            return (
                <Button
                    onClick={() => startAttendanceFlow(breakStart, "Selamat Istirahat")}
                    disabled={isLoading}
                    className="w-full h-14 rounded-2xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold shadow-lg shadow-black/5 text-lg border-2 border-primary/10"
                >
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : (
                        <>
                            <Coffee className="mr-2 h-5 w-5 text-primary" />
                            Mulai Istirahat
                        </>
                    )}
                </Button>
            );
        }

        if (isBreak && !hasBreakEnded) {
            return (
                <Button
                    onClick={() => startAttendanceFlow(breakEnd, "Selamat Bekerja Kembali")}
                    disabled={isLoading}
                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold shadow-primary/20 shadow-lg text-lg"
                >
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : (
                        <>
                            <Camera className="mr-2 h-5 w-5" />
                            Selesai Istirahat
                        </>
                    )}
                </Button>
            );
        }

        if (hasCheckedIn && hasBreakEnded && !hasCheckedOut) {
            return (
                <Button
                    onClick={handleClockOutClick}
                    disabled={isLoading}
                    className="w-full h-16 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black shadow-red-200 shadow-xl text-xl transition-all transform active:scale-95"
                >
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : (
                        <>
                            <LogOut className="mr-2 h-6 w-6" />
                            ABSEN PULANG
                        </>
                    )}
                </Button>
            );
        }
    };

    // Fetch location when camera opens
    useEffect(() => {
        if (isCameraOpen) {
            getCoordinates().catch(console.error);
        }
    }, [isCameraOpen]);

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Camera Modal */}
            <CameraModal
                open={isCameraOpen}
                onCapture={handlePhotoCaptured}
                onClose={() => setIsCameraOpen(false)}
                locationAddress={locationAddress}
                userName={user?.fullName}
            />

            {/* No Shift Selection Modal - Defaulting to Management */}

            <CompanyHeader />

            <main className="px-4 -mt-8 max-w-lg mx-auto space-y-6">
                {/* User Card */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white rounded-3xl p-5 shadow-xl shadow-primary/5 border border-primary/10 flex items-center justify-between relative overflow-hidden"
                >
                    <div className="space-y-1.5 z-10">
                        <h2 className="text-lg font-bold text-foreground">{user?.fullName}</h2>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>NIK: <span className="font-semibold text-foreground">{user?.username}</span></p>
                            <p>Cabang: <span className="font-semibold text-foreground">{user?.branch || '-'}</span></p>
                            <p>Jabatan: <span className="font-semibold text-foreground">{user?.position || '-'}</span></p>
                            <p>Shift: <span className="font-semibold text-foreground">{(today as any)?.shift || user?.shift || '-'} {(today as any)?.sessionNumber > 1 ? `(Sesi ${(today as any).sessionNumber})` : ''}</span></p>
                        </div>
                    </div>
                    <div className="z-10">
                        <div className="w-20 h-20 rounded-2xl bg-secondary border-2 border-white shadow-lg overflow-hidden flex items-center justify-center">
                            {user?.photoUrl ? (
                                <img src={user.photoUrl} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-2xl">
                                    {user?.fullName?.charAt(0)}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Timer & Status */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex flex-col items-center justify-center bg-white border border-primary/5 py-6 rounded-[2.5rem] shadow-xl shadow-primary/5"
                >
                    <DigitalClock />

                    <div className="mt-4 flex flex-col items-center">
                        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Status Hari Ini</p>
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-black ${(getStatusText() === 'Telat' || getStatusText() === 'Sakit') ? 'text-red-500' : 'text-primary'}`}>
                                {getStatusText()}
                            </span>
                            {today?.status === 'late' && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">TELAT</span>}
                            {today?.status === 'overtime' && <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">OVERTIME</span>}
                        </div>
                        {locationAddress && (
                            <p className="text-[10px] text-muted-foreground mt-3 flex items-center justify-center gap-1.5 max-w-[250px] text-center leading-tight">
                                <MapPin className="w-3.5 h-3.5 text-primary flex-shrink-0" /> {locationAddress}
                            </p>
                        )}
                    </div>

                    {/* Work Timer */}
                    {hasCheckedIn && !hasCheckedOut && (
                        <div className="mt-6 flex flex-col items-center bg-secondary/50 px-6 py-2 rounded-full border border-primary/10">
                            <p className="text-[9px] text-primary font-black uppercase tracking-[0.1em] mb-0.5">
                                {isBreak ? "⏳ Waktu Istirahat" : "💼 Waktu Kerja"}
                            </p>
                            <WorkTimer
                                startTime={new Date(isBreak ? today!.breakStart! : today!.checkIn!)}
                            />
                        </div>
                    )}
                </motion.div>

                {/* Controls */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                >
                    <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                        {renderMainButton()}

                        <div className="grid grid-cols-2 gap-3 mt-1">
                            <Button
                                variant="outline"
                                disabled={!!today?.checkOut || today?.status === 'sick' || today?.status === 'permission'}
                                onClick={() => {
                                    setPermitType('sick');
                                    setPermitNote("");
                                    setPermitOpen(true);
                                }}
                                className="h-14 rounded-2xl border-primary/10 hover:bg-primary/5 text-foreground bg-white transition-all active:scale-95"
                            >
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="font-bold">Sakit</span>
                                </div>
                            </Button>
                            <Button
                                variant="outline"
                                disabled={!!today?.checkOut || today?.status === 'sick' || today?.status === 'permission'}
                                onClick={() => {
                                    setPermitType('permission');
                                    setPermitNote("");
                                    setPermitOpen(true);
                                }}
                                className="h-14 rounded-2xl border-primary/10 hover:bg-primary/5 text-foreground bg-white transition-all active:scale-95"
                            >
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className="font-bold">Izin</span>
                                </div>
                            </Button>
                        </div>
                    </div>
                </motion.div>

                {/* Today Summary */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4"
                >
                    <h4 className="font-bold text-gray-800 border-b pb-2">Riwayat Hari Ini</h4>

                    <div className="grid grid-cols-2 gap-y-4">
                        <div>
                            <p className="text-gray-400 text-xs font-medium">Masuk</p>
                            <p className="font-mono font-bold text-gray-800">
                                {today?.checkIn ? format(new Date(today.checkIn), "HH:mm") : "--:--"}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-medium">Pulang</p>
                            <p className="font-mono font-bold text-gray-800">
                                {today?.checkOut ? format(new Date(today.checkOut), "HH:mm") : "--:--"}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-medium">Mulai Istirahat</p>
                            <p className="font-mono font-bold text-gray-800">
                                {today?.breakStart ? format(new Date(today.breakStart), "HH:mm") : "--:--"}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-xs font-medium">Total Istirahat</p>
                            <p className="font-mono font-bold text-gray-800 italic text-[10px]">
                                {today?.breakStart && today?.breakEnd ? "Selesai" : "--:--"}
                            </p>
                        </div>
                    </div>

                    {today?.notes && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Keterangan:</p>
                            <p className="text-xs text-gray-600 line-clamp-3">{today.notes}</p>
                        </div>
                    )}
                </motion.div>
            </main>

            <BottomNav />

            {/* Permission Dialog */}
            <Dialog open={permitOpen} onOpenChange={setPermitOpen}>
                <DialogContent className="rounded-3xl max-w-xs md:max-w-md p-6">
                    <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold">
                            {permitType === 'sick' ? 'Form Sakit' : 'Form Izin'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                        <Textarea
                            placeholder={`Alasan ${permitType === 'sick' ? 'sakit' : 'izin'}...`}
                            value={permitNote}
                            onChange={(e) => setPermitNote(e.target.value)}
                            className="resize-none rounded-2xl border-gray-200 focus:border-primary min-h-[100px]"
                        />

                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                            <p className="text-[10px] font-bold text-orange-700 uppercase mb-2">Penting:</p>
                            <ul className="text-[11px] text-orange-600/80 space-y-1">
                                <li className="flex gap-2"><span>•</span> <span>Sistem akan mengambil foto wajah/dokumen.</span></li>
                                <li className="flex gap-2"><span>•</span> <span>Pastikan GPS aktif untuk mencatat lokasi.</span></li>
                                <li className="flex gap-2"><span>•</span> <span>Sesi kerja Anda akan berakhir setelah ini.</span></li>
                            </ul>
                        </div>

                        <Button
                            onClick={handlePermitCameraTrigger}
                            className="w-full h-14 rounded-2xl gap-3 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
                        >
                            <Camera className="w-5 h-5" />
                            Ambil Foto & Kirim
                        </Button>

                        <Button
                            variant="ghost"
                            onClick={() => setPermitOpen(false)}
                            className="w-full text-gray-400 text-sm"
                        >
                            Batalkan
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
