import { useQuery, useMutation } from "@tanstack/react-query";
import { Permit, User } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, FileText, Calendar, User as UserIcon, Clock } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useLocation } from "wouter";

export default function PermitManagementPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();

    const { data: users } = useQuery<User[]>({
        queryKey: ["/api/admin/users"],
    });

    const { data: permits, isLoading } = useQuery<Permit[]>({
        queryKey: ["/api/admin/permits"],
    });

    const statusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number, status: string }) => {
            await apiRequest("PATCH", `/api/admin/permits/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/permits"] });
            toast({ title: "Berhasil", description: "Status izin diperbarui" });
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        }
    });

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                    <div>
                        <h1 className="text-xl font-bold text-primary uppercase leading-tight">Admin NH</h1>
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
                        Persetujuan Izin
                    </Button>
                </nav>
            </aside>

            <main className="flex-1 p-8 overflow-auto">
                <header className="mb-8">
                    <h2 className="text-2xl font-black text-gray-800 tracking-tight">Persetujuan Izin</h2>
                    <p className="text-muted-foreground text-sm uppercase font-bold tracking-wide">Review pengajuan Sakit, Izin, & Cuti karyawan</p>
                </header>

                <div className="grid grid-cols-1 gap-6">
                    {isLoading ? (
                        <div className="flex justify-center py-24">
                            <Loader2 className="h-12 w-12 animate-spin text-primary/20" />
                        </div>
                    ) : permits?.length === 0 ? (
                        <Card className="border-none shadow-sm rounded-3xl p-12 text-center">
                            <p className="text-muted-foreground italic">Belum ada pengajuan izin yang masuk.</p>
                        </Card>
                    ) : (
                        permits?.map((permit) => {
                            const user = users?.find(u => u.id === permit.userId);
                            return (
                                <Card key={permit.id} className="border-none shadow-xl rounded-3xl overflow-hidden bg-white hover:shadow-2xl transition-shadow duration-300">
                                    <CardContent className="p-0">
                                        <div className="flex flex-col md:flex-row">
                                            <div className="p-6 md:w-1/3 bg-gray-50/50 border-r border-gray-100 flex flex-col justify-center">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20">
                                                        {user?.fullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-black text-gray-800 leading-tight">{user?.fullName}</h4>
                                                        <p className="text-[10px] text-muted-foreground font-mono">{user?.nik}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                        <Calendar className="w-3 h-3" />
                                                        {format(new Date(permit.startDate), "d MMM", { locale: id })} - {format(new Date(permit.endDate), "d MMM yyyy", { locale: id })}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-wider bg-primary/5 px-3 py-1 rounded-full w-fit">
                                                        <Clock className="w-3 h-3" />
                                                        {permit.type}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-6 flex-1 flex flex-col justify-between">
                                                <div className="mb-6">
                                                    <h5 className="text-[8px] font-black uppercase text-muted-foreground tracking-widest mb-2">Alasan Pengajuan:</h5>
                                                    <p className="text-gray-700 text-sm leading-relaxed bg-secondary/30 p-4 rounded-2xl border border-secondary/50 italic">
                                                        "{permit.reason}"
                                                    </p>
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full ${permit.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                                permit.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                    'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            Status: {permit.status}
                                                        </span>
                                                        <span className="text-[8px] text-muted-foreground font-medium">Diajukan pada {format(new Date(permit.createdAt!), "d MMMM HH:mm", { locale: id })}</span>
                                                    </div>

                                                    {permit.status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="rounded-xl border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold px-4"
                                                                onClick={() => statusMutation.mutate({ id: permit.id, status: 'rejected' })}
                                                                disabled={statusMutation.isPending}
                                                            >
                                                                <X className="w-4 h-4 mr-1" />
                                                                Tolak
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="rounded-xl bg-green-600 hover:bg-green-700 font-bold px-4 shadow-lg shadow-green-100"
                                                                onClick={() => statusMutation.mutate({ id: permit.id, status: 'approved' })}
                                                                disabled={statusMutation.isPending}
                                                            >
                                                                <Check className="w-4 h-4 mr-1" />
                                                                Setujui
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    )}
                </div>
            </main>
        </div>
    );
}
