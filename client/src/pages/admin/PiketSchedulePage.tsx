import { useQuery, useMutation } from "@tanstack/react-query";
import { User, PiketSchedule } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { id } from "date-fns/locale";
import { useState } from "react";
import { Loader2, ChevronLeft, ChevronRight, UserPlus, Calendar as CalendarIcon, Save, Trash2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PiketSchedulePage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    const monthStr = format(currentMonth, "yyyy-MM");

    const { data: users } = useQuery<User[]>({
        queryKey: ["/api/admin/users"],
    });

    const { data: schedules, isLoading } = useQuery<PiketSchedule[]>({
        queryKey: ["/api/admin/piket-schedules", monthStr],
        queryFn: async () => {
            const res = await fetch(`/api/admin/piket-schedules?month=${monthStr}`);
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Gagal mengambil data piket");
            }
            return res.json();
        }
    });

    const saveMutation = useMutation({
        mutationFn: async (data: { userId: number, date: string }) => {
            const res = await apiRequest("POST", "/api/admin/piket-schedules", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/piket-schedules", monthStr] });
            toast({ title: "Berhasil", description: "Jadwal piket diperbarui" });
            setSelectedDate(null);
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/admin/piket-schedules/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/piket-schedules", monthStr] });
            toast({ title: "Berhasil", description: "Jadwal piket dihapus" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    const employees = users?.filter(u => u.role === 'employee') || [];

    const daysInRange = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar (Simple version for now) */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                    <div>
                        <h1 className="text-xl font-bold text-primary uppercase">Admin NH</h1>
                        <p className="text-[8px] text-muted-foreground uppercase tracking-widest font-black">Legal Excellence</p>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation("/admin")}>
                        Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full justify-start font-bold bg-primary/10 text-primary">
                        Jadwal Piket
                    </Button>
                </nav>
            </aside>

            <main className="flex-1 p-8 overflow-auto">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Manajemen Jadwal Piket</h2>
                        <p className="text-muted-foreground text-sm uppercase font-bold">Atur penugasan piket pagi (08:15)</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="font-bold text-sm min-w-[120px] text-center capitalize">
                            {format(currentMonth, "MMMM yyyy", { locale: id })}
                        </span>
                        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* Calendar Grid */}
                    <div className="xl:col-span-3">
                        <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                            <CardContent className="p-6">
                                <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-2xl overflow-hidden border border-gray-100">
                                    {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                                        <div key={day} className="bg-white p-4 text-center text-[10px] font-black uppercase text-muted-foreground">
                                            {day}
                                        </div>
                                    ))}
                                    {daysInRange.map((day, idx) => {
                                        const schedule = schedules?.find(s => isSameDay(new Date(s.date), day));
                                        const assignedUser = employees.find(u => u.id === schedule?.userId);
                                        const isToday = isSameDay(day, new Date());
                                        const isSelected = selectedDate && isSameDay(day, selectedDate);

                                        return (
                                            <div
                                                key={idx}
                                                className={`min-h-[120px] p-2 bg-white flex flex-col gap-2 cursor-pointer transition-all hover:bg-primary/5 border-t border-gray-50
                                            ${isSelected ? 'ring-2 ring-inset ring-primary' : ''}
                                        `}
                                                onClick={() => {
                                                    setSelectedDate(day);
                                                    setSelectedUserId("");
                                                }}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                                                ${isToday ? 'bg-primary text-white shadow-lg' : 'text-gray-400'}
                                            `}>
                                                        {format(day, "d")}
                                                    </span>
                                                </div>

                                                {schedules?.filter(s => isSameDay(new Date(s.date), day)).map(schedule => {
                                                    const assignedUser = employees.find(u => u.id === schedule.userId);
                                                    if (!assignedUser) return null;
                                                    return (
                                                        <div key={schedule.id} className="bg-primary/10 p-1.5 rounded-xl flex items-center gap-2 border border-primary/20">
                                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[8px] text-white font-bold shrink-0">
                                                                {assignedUser.fullName.charAt(0)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[9px] font-bold text-primary truncate leading-tight">{assignedUser.fullName}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {!schedules?.some(s => isSameDay(new Date(s.date), day)) && (
                                                    <div className="flex-1 flex items-center justify-center">
                                                        <UserPlus className="w-4 h-4 text-gray-200 group-hover:text-primary/30" />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Editor Panel */}
                    <div className="xl:col-span-1">
                        <Card className="border-none shadow-xl rounded-3xl bg-white sticky top-8">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CalendarIcon className="w-5 h-5 text-primary" />
                                    Detail Penugasan
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {selectedDate ? (
                                    <>
                                        <div className="p-4 bg-secondary/50 rounded-2xl border border-secondary">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Tanggal Terpilih</p>
                                            <p className="font-bold text-gray-800">{format(selectedDate, "EEEE, d MMMM yyyy", { locale: id })}</p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Karyawan Terpilih</label>
                                                <div className="space-y-2">
                                                    {schedules?.filter(s => isSameDay(new Date(s.date), selectedDate)).map(s => {
                                                        const user = employees.find(u => u.id === s.userId);
                                                        return (
                                                            <div key={s.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                                        {user?.fullName.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-bold">{user?.fullName}</p>
                                                                        <p className="text-[10px] text-muted-foreground font-mono">{user?.nik}</p>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={() => deleteMutation.mutate(s.id)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        );
                                                    })}
                                                    {schedules?.filter(s => isSameDay(new Date(s.date), selectedDate)).length === 0 && (
                                                        <div className="text-center py-4 border-2 border-dashed border-gray-100 rounded-2xl">
                                                            <p className="text-xs text-muted-foreground">Belum ada penugasan</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase ml-1">Tambah Penugasan</label>
                                                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                                                    <SelectTrigger className="h-12 rounded-xl">
                                                        <SelectValue placeholder="Pilih Karyawan" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {employees.map(emp => (
                                                            <SelectItem key={emp.id} value={emp.id.toString()}>{emp.fullName}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <Button
                                            className="w-full h-12 rounded-2xl font-bold"
                                            onClick={() => {
                                                if (!selectedUserId) return;
                                                saveMutation.mutate({
                                                    userId: parseInt(selectedUserId),
                                                    date: format(selectedDate, "yyyy-MM-dd")
                                                });
                                                setSelectedUserId(""); // Reset after mut
                                            }}
                                            disabled={saveMutation.isPending || !selectedUserId}
                                        >
                                            {saveMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                            Tambah & Simpan
                                        </Button>

                                        <p className="text-[10px] text-center text-muted-foreground italic">
                                            Piket mewajibkan karyawan masuk sebelum pukul 08:15 WIB.
                                        </p>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                                            <CalendarIcon className="w-8 h-8 text-gray-200" />
                                        </div>
                                        <p className="text-sm text-muted-foreground">Pilih tanggal pada kalender untuk mengatur piket</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
