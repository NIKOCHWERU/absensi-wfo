import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { useState } from "react";
import { format, addDays } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, ArrowLeftRight, Calendar, User, MessageCircle, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User as DbUser, ShiftSwap, PiketSchedule } from "@shared/schema";

export default function ShiftSwapPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [targetUserId, setTargetUserId] = useState<string>("");
    const [swapDate, setSwapDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [targetDate, setTargetDate] = useState<string>(format(addDays(new Date(), 1), "yyyy-MM-dd"));
    const [reason, setReason] = useState<string>("");

    const { data: users } = useQuery<DbUser[]>({
        queryKey: ["/api/admin/users"],
    });

    const { data: schedules } = useQuery<PiketSchedule[]>({
        queryKey: ["/api/piket-schedules", format(new Date(), "yyyy-MM")],
    });

    const { data: swaps, isLoading: isSwapsLoading } = useQuery<ShiftSwap[]>({
        queryKey: ["/api/shift-swaps"],
    });

    const createSwapMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/shift-swaps", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps"] });
            toast({ title: "Berhasil", description: "Pengajuan tukar piket telah dikirim" });
            setReason("");
            setTargetUserId("");
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    const respondSwapMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number, status: string }) => {
            const res = await apiRequest("PATCH", `/api/shift-swaps/${id}`, { status });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps"] });
            toast({ title: "Berhasil", description: "Status pengajuan diperbarui" });
        }
    });

    const employees = users?.filter(u => u.role === 'employee' && u.id !== user?.id) || [];

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="bg-primary pt-10 pb-20 px-6 rounded-b-[2.5rem] shadow-lg mb-[-3rem]">
                <h1 className="text-2xl font-bold text-white mb-1">Tukar Jadwal Piket</h1>
                <p className="text-white/80 text-sm">Ajukan pertukaran jadwal piket dengan rekan</p>
            </div>

            <main className="px-4 max-w-lg mx-auto space-y-6">

                {/* Form Card */}
                <Card className="relative z-10 border-none shadow-xl rounded-3xl overflow-hidden">
                    <CardHeader className="bg-white pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ArrowLeftRight className="w-5 h-5 text-primary" />
                            Ajukan Tukar Baru
                        </CardTitle>
                        <CardDescription>Pilih tanggal dan rekan yang ingin ditukar</CardDescription>
                    </CardHeader>
                    <CardContent className="bg-white space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Tanggal Piket Saya</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-primary" />
                                <Input
                                    type="date"
                                    className="pl-10 h-11 rounded-xl bg-secondary/50 border-none"
                                    value={swapDate}
                                    onChange={(e) => setSwapDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Rekan Yang Ditukar</label>
                            <Select value={targetUserId} onValueChange={setTargetUserId}>
                                <SelectTrigger className="h-11 rounded-xl bg-secondary/50 border-none">
                                    <SelectValue placeholder="Pilih Rekan Karyawan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id.toString()}>{emp.fullName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Tanggal Piket Rekan</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-primary" />
                                <Input
                                    type="date"
                                    className="pl-10 h-11 rounded-xl bg-secondary/50 border-none"
                                    value={targetDate}
                                    onChange={(e) => setTargetDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Alasan Tukar</label>
                            <Textarea
                                placeholder="Contoh: Ada keperluan keluarga mendesak..."
                                className="min-h-[80px] rounded-xl bg-secondary/50 border-none resize-none"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full h-12 rounded-2xl font-bold mt-2 shadow-lg shadow-primary/20"
                            disabled={!targetUserId || !reason || createSwapMutation.isPending}
                            onClick={() => createSwapMutation.mutate({ targetUserId, date: swapDate, targetDate, reason })}
                        >
                            {createSwapMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : "Kirim Pengajuan"}
                        </Button>
                    </CardContent>
                </Card>

                {/* List Section */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 px-1">
                        <Clock className="w-4 h-4 text-primary" />
                        Riwayat Pengajuan
                    </h3>

                    {isSwapsLoading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                    ) : swaps?.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl text-center border border-dashed text-muted-foreground text-sm">
                            Belum ada pengajuan tukar piket.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {swaps?.map((swap) => {
                                const isRequester = swap.requesterId === user?.id;
                                const partner = users?.find(u => u.id === (isRequester ? swap.targetUserId : swap.requesterId));

                                return (
                                    <Card key={swap.id} className="border-none shadow-sm rounded-2xl overflow-hidden">
                                        <CardContent className="p-4 flex items-start gap-3">
                                            <div className={`p-3 rounded-xl ${isRequester ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                                <ArrowLeftRight className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">
                                                        {isRequester ? 'Permintaan Saya' : 'Permintaan Masuk'}
                                                    </p>
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${swap.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                            swap.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                                                'bg-red-100 text-red-700'
                                                        }`}>
                                                        {swap.status}
                                                    </span>
                                                </div>
                                                <p className="font-bold text-sm text-gray-800">
                                                    {isRequester ? `Tukar dengan ${partner?.fullName}` : `${partner?.fullName} mengajak tukar`}
                                                </p>
                                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" /> {format(new Date(swap.date), "dd MMM")}
                                                    </span>
                                                    <ArrowLeftRight className="w-2 h-2" />
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" /> {format(new Date(swap.targetDate), "dd MMM")}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 mt-1 line-clamp-1 italic">"{swap.reason}"</p>

                                                {!isRequester && swap.status === 'pending' && (
                                                    <div className="flex gap-2 mt-3">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 rounded-lg flex-1 text-[10px] font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                                            onClick={() => respondSwapMutation.mutate({ id: swap.id, status: 'approved' })}
                                                        >
                                                            <CheckCircle2 className="w-3 h-3 mr-1" /> SETUJU
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8 rounded-lg flex-1 text-[10px] font-bold border-red-200 text-red-600 hover:bg-red-50"
                                                            onClick={() => respondSwapMutation.mutate({ id: swap.id, status: 'rejected' })}
                                                        >
                                                            <XCircle className="w-3 h-3 mr-1" /> TOLAK
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>

            </main>
            <BottomNav />
        </div>
    );
}
