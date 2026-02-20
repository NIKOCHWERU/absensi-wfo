import { Building2 } from "lucide-react";

interface CompanyHeaderProps {
  name?: string;
  logoUrl?: string;
}

export function CompanyHeader({ name = "ABSENSI NH", logoUrl = "/logo.png" }: CompanyHeaderProps) {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg pb-12 pt-6 px-6 rounded-b-[2.5rem] relative overflow-hidden">
      {/* Decorative Shine */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>

      <div className="flex items-center justify-between max-w-4xl mx-auto relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold font-display tracking-tight text-shadow-sm uppercase">
            ABSENSI NH
          </h1>
          <p className="text-primary-foreground/90 text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mt-0.5 opacity-80">
            Professional Attendance System
          </p>
        </div>
        <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl flex items-center justify-center border-2 border-primary/20 shadow-xl p-1 overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full bg-primary/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
