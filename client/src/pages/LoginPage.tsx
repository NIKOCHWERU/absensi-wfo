import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Redirect } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Wajib diisi"),
  password: z.string().min(1, "Wajib diisi"),
});

export default function LoginPage() {
  const { login, isLoggingIn, user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    try {
      await login(values);
    } catch (error: any) {
      if (error.response?.status === 403) {
        console.error("Role mismatch:", error.response.data.message);
      }
    }
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Gold Accents */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>

      <div className="w-full max-w-md z-10">

        <div className="text-center mb-8 space-y-4">
          <div className="inline-flex p-1 bg-white rounded-full shadow-2xl shadow-primary/20 mb-2 border-2 border-primary/20">
            <img src="/logo.png" alt="NH Logo" className="w-24 h-24 object-contain" />
          </div>
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tighter lg:text-5xl text-foreground drop-shadow-sm uppercase">
              ABSENSI NH
            </h1>
            <p className="text-muted-foreground font-medium text-sm tracking-[0.2em] uppercase">Legal Excellence & Integrity</p>
          </div>
        </div>

        <LoginCard
          onSubmit={(v: any) => onSubmit(v)}
          isLoading={isLoggingIn}
          form={form}
          icon={<User className="w-4 h-4" />}
          placeholder="Masukkan NIK atau Username"
          showPassword={showPassword}
          setShowPassword={setShowPassword}
        />

        <p className="text-center text-xs text-muted-foreground mt-8 opacity-60">
          &copy; {new Date().getFullYear()} ABSENSI NH. Seluruh hak cipta dilindungi.
        </p>
      </div>
    </div>
  );
}

function LoginCard({ onSubmit, isLoading, form, icon, placeholder, showPassword, setShowPassword }: any) {
  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>Silakan masuk ke akun Anda</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username / NIK</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute left-3 top-3 text-muted-foreground">
                        {icon}
                      </div>
                      <Input placeholder={placeholder} className="pl-9 h-11" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute left-3 top-3 text-muted-foreground">
                        <Lock className="w-4 h-4" />
                      </div>
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-9 pr-10 h-11" {...field} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full h-11 text-base font-semibold mt-2 shadow-lg shadow-primary/20">
              {isLoading ? <Loader2 className="animate-spin" /> : "Masuk"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
