import { useQuery, useMutation } from "@tanstack/react-query";
import { User, ShiftSwap } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, ArrowLeftRight, CheckCircle2, XCircle, Clock, Calendar, User as UserIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ShiftSwapApprovalPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const { data: users } = useQuery<User[]>({
        queryKey: ["/api/admin/users"],
    });

    const { data: swaps, isLoading } = useQuery<ShiftSwap[]>({
        queryKey: ["/api/shift-swaps"],
    });

    const respondMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number, status: string }) => {
            const res = await apiRequest("PATCH", `/api/shift-swaps/${id}`, { status });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/shift-swaps"] });
            toast({ title: "Berhasil", description: "Status pengajuan diperbarui" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    const pendingSwaps = swaps?.filter(s => s.status === 'pending') || [];
    const processedSwaps = swaps?.filter(s => s.status !== 'pending') || [];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
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
                    <Button variant="ghost" className="w-full justify-start" onClick={() => setLocation("/admin/piket")}>
                        Jadwal Piket
                    </Button>
                    <Button variant="ghost" className="w-full justify-start font-bold bg-primary/10 text-primary">
                        Persetujuan Tukar
                    </Button>
                </nav>
            </aside>

            <main className="flex-1 p-8 overflow-auto">
                <header className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800">Persetujuan Tukar Piket</h2>
                    <p className="text-muted-foreground text-sm uppercase font-bold">Tinjau dan setujui permintaan tukar jadwal antar karyawan</p>
                </header>

                <div className="grid grid-cols-1 gap-8">

                    {/* Pending Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" />
                            Menunggu Persetujuan
                            <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{pendingSwaps.length}</span>
                        </h3>

                        {isLoading ? (
                            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" /></div>
                        ) : pendingSwaps.length === 0 ? (
                            <Card className="border-none shadow-sm bg-white p-12 text-center text-muted-foreground italic rounded-3xl">
                                Tidak ada pengajuan tukar piket yang menunggu.
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {pendingSwaps.map((swap) => {
                                    const req = users?.find(u => u.id === swap.requesterId);
                                    const target = users?.find(u => u.id === swap.targetUserId);

                                    return (
                                        <Card key={swap.id} className="border-none shadow-md rounded-3xl overflow-hidden bg-white">
                                            <CardContent className="p-6">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                            <ArrowLeftRight className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pengajuan Baru</p>
                                                            <p className="text-xs text-muted-foreground">{format(new Date(swap.createdAt || new Date()), "d MMM yyyy, HH:mm", { locale: id })}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <div className="flex-1 text-center">
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Dari</p>
                                                        <p className="font-bold text-gray-800 text-sm">{req?.fullName}</p>
                                                        <p className="text-[10px] text-primary font-mono">{format(new Date(swap.date), "dd/MM/yyyy")}</p>
                                                    </div>
                                                    <ArrowLeftRight className="w-5 h-5 text-gray-300" />
                                                    <div className="flex-1 text-center">
                                                        <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Kepada</p>
                                                        <p className="font-bold text-gray-800 text-sm">{target?.fullName}</p>
                                                        <p className="text-[10px] text-primary font-mono">{format(new Date(swap.targetDate), "dd/MM/yyyy")}</p>
                                                    </div>
                                                </div>

                                                <div className="mb-6">
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase mb-1">Alasan</p>
                                                    <p className="text-sm text-gray-600 bg-gray-50/50 p-3 rounded-xl italic">"{swap.reason}"</p>
                                                </div>

                                                <div className="flex gap-3">
                                                    <Button
                                                        className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold"
                                                        onClick={() => respondMutation.mutate({ id: swap.id, status: 'approved' })}
                                                        disabled={respondMutation.isPending}
                                                    >
                                                        <CheckCircle2 className="w-4 h-4 mr-2" /> SETUJU (ACC)
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1 h-11 rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
                                                        onClick={() => respondMutation.mutate({ id: swap.id, status: 'rejected' })}
                                                        disabled={respondMutation.isPending}
                                                    >
                                                        <XCircle className="w-4 h-4 mr-2" /> TOLAK
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* History Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-gray-400 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            Riwayat Keputusan
                        </h3>

                        <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
                            <CardContent className="p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                                        <tr>
                                            <th className="px-6 py-4">Tgl Pengajuan</th>
                                            <th className="px-6 py-4">Karyawan 1</th>
                                            <th className="px-6 py-4 text-center"><ArrowLeftRight className="w-4 h-4 mx-auto" /></th>
                                            <th className="px-6 py-4">Karyawan 2</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {processedSwaps.map((swap) => {
                                            const req = users?.find(u => u.id === swap.requesterId);
                                            const target = users?.find(u => u.id === swap.targetUserId);
                                            return (
                                                <tr key={swap.id} className="hover:bg-gray-50/50">
                                                    <td className="px-6 py-4 text-gray-500">{format(new Date(swap.createdAt || new Date()), "dd/MM/yy HH:mm")}</td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-gray-800">{req?.fullName}</p>
                                                        <p className="text-[10px] text-muted-foreground">{format(new Date(swap.date), "dd MMM yyyy")}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <ArrowLeftRight className="w-3 h-3 text-gray-300 mx-auto" />
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-gray-800">{target?.fullName}</p>
                                                        <p className="text-[10px] text-muted-foreground">{format(new Date(swap.targetDate), "dd MMM yyyy")}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${swap.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {swap.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                        {processedSwaps.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 italic">Belum ada riwayat.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
