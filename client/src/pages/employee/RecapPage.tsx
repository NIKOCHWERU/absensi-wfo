import { useAuth } from "@/hooks/use-auth";
import { useAttendance } from "@/hooks/use-attendance";
import { BottomNav } from "@/components/BottomNav";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { useState } from "react";
import { format, subMonths, addMonths, startOfWeek, endOfWeek, isWithinInterval, subWeeks, addWeeks } from "date-fns";
import { id } from "date-fns/locale";
import { Loader2, Calendar, Clock, MapPin, Coffee, LogOut, X, LayoutGrid, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Attendance } from "@shared/schema";

export default function RecapPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date()); // Tracks the "display month"
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [weekDate, setWeekDate] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch for current display month (format YYYY-MM)
  const monthStr = format(currentDate, 'yyyy-MM');
  const { data: attendanceData, isLoading } = useAttendance().useMonthlyAttendance(monthStr, user?.id);

  const handlePrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else setWeekDate(subWeeks(weekDate, 1));
  };

  const handleNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else setWeekDate(addWeeks(weekDate, 1));
  };

  const handleDateSelect = (_date: Date, record?: Attendance) => {
    if (record) {
      setSelectedRecord(record);
      setIsModalOpen(true);
    }
  };

  // Get filtered data based on view mode
  const filteredData = attendanceData?.filter(record => {
    if (viewMode === 'month') return true; // useMonthlyAttendance already gives 26th-25th

    // For week view, filter current month's data by week boundary
    const date = new Date(record.date);
    const wStart = startOfWeek(weekDate, { weekStartsOn: 1 });
    const wEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
    return isWithinInterval(date, { start: wStart, end: wEnd });
  }) || [];

  // Stats calculation based on filtered data
  const stats = {
    present: filteredData.filter(a => a.status === 'present').length,
    late: filteredData.filter(a => a.status === 'late').length,
    sick: filteredData.filter(a => a.status === 'sick').length,
    permission: filteredData.filter(a => a.status === 'permission').length,
    absent: filteredData.filter(a => a.status === 'absent').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-primary pt-10 pb-20 px-6 rounded-b-[2.5rem] shadow-lg mb-[-3rem]">
        <h1 className="text-2xl font-bold text-white mb-1">Rekap Absensi PT ELOK JAYA ABADHI</h1>
        <p className="text-white/80 text-sm">Pantau kehadiran bulanan Anda</p>
      </div>

      <main className="px-4 max-w-lg mx-auto space-y-6">

        {/* Calendar Card */}
        <div className="relative z-10">
          {isLoading ? (
            <div className="bg-white rounded-2xl h-80 flex items-center justify-center shadow-sm border border-border">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
            <AttendanceCalendar
              currentDate={currentDate}
              onPrevMonth={handlePrev}
              onNextMonth={handleNext}
              attendanceData={attendanceData || []}
              onDateSelect={handleDateSelect}
              viewMode={viewMode}
              setViewMode={setViewMode}
              weekDate={weekDate}
            />
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="text-2xl font-bold text-foreground">{stats.present}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hadir</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="text-2xl font-bold text-amber-500">{stats.late}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Telat</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="text-2xl font-bold text-blue-500">{stats.sick}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sakit</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-border shadow-sm">
            <div className="text-2xl font-bold text-purple-500">{stats.permission}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Izin</div>
          </div>
        </div>

        {/* Detailed List */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-gray-50 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-sm text-foreground">Detail Riwayat</h3>
          </div>
          <div className="divide-y divide-border">
            {filteredData.map((record) => (
              <div
                key={record.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => handleDateSelect(new Date(record.date), record)}
              >
                <div>
                  <div className="font-semibold text-sm">
                    {format(new Date(record.date), 'EEEE, dd MMM yyyy', { locale: id })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {record.checkIn ? format(new Date(record.checkIn), 'HH:mm') : '-'}
                    {' - '}
                    {record.checkOut ? format(new Date(record.checkOut), 'HH:mm') : '-'}
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${record.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                    record.status === 'late' ? 'bg-amber-100 text-amber-700' :
                      record.status === 'absent' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                  }`}>
                  {record.status === 'present' ? 'Hadir' :
                    record.status === 'late' ? 'Telat' :
                      record.status === 'sick' ? 'Sakit' :
                        record.status === 'permission' ? 'Izin' :
                          record.status === 'absent' ? 'Alpa' : record.status}
                </div>
              </div>
            ))}
            {(!filteredData || filteredData.length === 0) && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Belum ada data absensi untuk periode ini.
              </div>
            )}
          </div>
        </div>

      </main>
      <BottomNav />

      {/* Detail Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-3xl max-w-sm md:max-w-md mx-auto p-0 overflow-hidden border-none shadow-2xl">
          {selectedRecord && (
            <div className="flex flex-col h-full max-h-[90vh]">
              {/* Modal Header */}
              <div className="bg-primary p-6 text-white relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsModalOpen(false)}
                  className="absolute right-4 top-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Detail Kehadiran</p>
                  <h3 className="text-xl font-bold">
                    {format(new Date(selectedRecord.date), 'EEEE, dd MMM yyyy', { locale: id })}
                  </h3>
                  <div className="flex gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${selectedRecord.status === 'present' ? 'bg-white/20 text-white' :
                        selectedRecord.status === 'late' ? 'bg-red-500 text-white' :
                          selectedRecord.status === 'overtime' ? 'bg-amber-400 text-white' :
                            'bg-white/10 text-white/80'
                      }`}>
                      {selectedRecord.status === 'overtime' ? 'Overtime' :
                        selectedRecord.status === 'present' ? 'Hadir' :
                          selectedRecord.status === 'late' ? 'Telat' : selectedRecord.status}
                    </span>
                    {selectedRecord.sessionNumber > 1 && (
                      <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase text-white/80">
                        Sesi {selectedRecord.sessionNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Photo Grid (Max 4 photos per session) */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Masuk', photo: selectedRecord.checkInPhoto },
                    { label: 'Mulai Istirahat', photo: selectedRecord.breakStartPhoto },
                    { label: 'Selesai Istirahat', photo: selectedRecord.breakEndPhoto },
                    { label: 'Pulang', photo: selectedRecord.checkOutPhoto }
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</p>
                      <div className="aspect-[3/4] rounded-xl bg-secondary border border-primary/10 overflow-hidden flex items-center justify-center relative">
                        {item.photo ? (
                          <img
                            src={item.photo.startsWith('http') || item.photo.startsWith('/') ? item.photo : `/api/files/${item.photo}`}
                            alt={item.label}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Camera className="w-6 h-6 text-primary/20" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Info List */}
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Waktu Masuk</p>
                      <p className="font-mono font-bold text-lg text-foreground">
                        {selectedRecord.checkIn ? format(new Date(selectedRecord.checkIn), 'HH:mm:ss') : '--:--'}
                      </p>
                    </div>
                    <div className="space-y-1 text-right">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Waktu Pulang</p>
                      <p className="font-mono font-bold text-lg text-foreground">
                        {selectedRecord.checkOut ? format(new Date(selectedRecord.checkOut), 'HH:mm:ss') : '--:--'}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-secondary/50 rounded-2xl border border-primary/5 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Lokasi Masuk:</span>
                      <span className="font-medium text-right truncate max-w-[150px]">{selectedRecord.checkInLocation || '-'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Catatan:</span>
                      <span className="font-medium text-right italic">{selectedRecord.notes || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-2">
                <Button className="w-full h-12 rounded-2xl font-bold" onClick={() => setIsModalOpen(false)}>
                  Selesai
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
