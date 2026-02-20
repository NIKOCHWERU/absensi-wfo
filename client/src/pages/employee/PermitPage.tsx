import { useQuery, useMutation } from "@tanstack/react-query";
import { Permit, insertPermitSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { BottomNav } from "@/components/BottomNav";

export default function PermitPage() {
    const { toast } = useToast();
    const { data: permits, isLoading } = useQuery<Permit[]>({
        queryKey: ["/api/permits"],
    });

    const form = useForm({
        resolver: zodResolver(insertPermitSchema),
        defaultValues: {
            type: "Izin",
            startDate: format(new Date(), "yyyy-MM-dd"),
            endDate: format(new Date(), "yyyy-MM-dd"),
            reason: "",
            attachmentUrl: "",
        },
    });

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/permits", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/permits"] });
            toast({ title: "Berhasil", description: "Permohonan izin telah dikirim" });
            form.reset();
        },
        onError: (err: any) => {
            toast({ title: "Gagal", description: err.message, variant: "destructive" });
        },
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <header className="bg-white border-b border-gray-100 px-6 py-8 rounded-b-[40px] shadow-sm">
                <div className="max-w-lg mx-auto">
                    <h1 className="text-2xl font-black text-gray-800 tracking-tight">Surat Izin</h1>
                    <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">Pengajuan Ketidakhadiran</p>
                </div>
            </header>

            <main className="max-w-lg mx-auto px-6 mt-8 space-y-8">
                <Card className="border-none shadow-xl rounded-3xl overflow-hidden bg-white">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Form Pengajuan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">Jenis Izin</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-12 rounded-2xl border-gray-100">
                                                        <SelectValue placeholder="Pilih jenis" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-2xl">
                                                    <SelectItem value="Sakit">Sakit</SelectItem>
                                                    <SelectItem value="Izin">Izin (Keperluan Pribadi)</SelectItem>
                                                    <SelectItem value="Cuti">Cuti</SelectItem>
                                                    <SelectItem value="Lainnya">Lainnya</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="startDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">Dari Tanggal</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} className="h-12 rounded-2xl border-gray-100" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="endDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">Sampai Tanggal</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} className="h-12 rounded-2xl border-gray-100" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="reason"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1">Alasan / Keterangan</FormLabel>
                                            <FormControl>
                                                <Textarea {...field} placeholder="Tuliskan alasan pengajuan izin..." className="rounded-2xl border-gray-100 min-h-[100px]" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button type="submit" className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20" disabled={mutation.isPending}>
                                    {mutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                    Kirim Pengajuan
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground ml-2">Riwayat Pengajuan</h3>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
                        </div>
                    ) : permits?.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                            <p className="text-xs text-muted-foreground italic">Belum ada riwayat pengajuan</p>
                        </div>
                    ) : (
                        permits?.map((permit) => (
                            <Card key={permit.id} className="border-none shadow-md rounded-3xl overflow-hidden bg-white">
                                <CardContent className="p-5 flex items-start gap-4">
                                    <div className={`p-3 rounded-2xl shrink-0 ${permit.status === 'approved' ? 'bg-green-50 text-green-600' :
                                            permit.status === 'rejected' ? 'bg-red-50 text-red-600' :
                                                'bg-blue-50 text-blue-600'
                                        }`}>
                                        {permit.status === 'approved' ? <CheckCircle2 className="w-5 h-5" /> :
                                            permit.status === 'rejected' ? <XCircle className="w-5 h-5" /> :
                                                <Clock className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-gray-800">{permit.type}</h4>
                                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${permit.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                    permit.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>
                                                {permit.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-2">
                                            <Calendar className="w-3 h-3" />
                                            <span>{format(new Date(permit.startDate), "d MMM", { locale: id })} - {format(new Date(permit.endDate), "d MMM yyyy", { locale: id })}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 line-clamp-2">{permit.reason}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    );
}
