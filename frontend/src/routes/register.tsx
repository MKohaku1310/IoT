import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { User, Mail, KeyRound, Cpu, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Đăng ký | Smart Home IoT" },
      { name: "description", content: "Đăng ký tài khoản Smart Home." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Kiểm tra nếu đã đăng nhập thì về trang chủ
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate({ to: "/" });
      }
    };
    checkSession();
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate({ to: "/login" });
    } catch (err: any) {
      toast.error(err.message || "Không thể đăng ký tài khoản. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_600px_at_-10%_-10%,#dbe7ff_0%,transparent_60%),radial-gradient(900px_500px_at_110%_10%,#ffe4f0_0%,transparent_55%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)] p-6 flex flex-col items-center justify-center text-slate-800">
      <Link
        to="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
      >
        <ArrowLeft className="h-4 w-4" /> Về Bảng điều khiển
      </Link>

      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/70 p-8 shadow-[0_10px_40px_-20px_rgba(30,41,59,0.25)] backdrop-blur-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-500/30 mb-3">
            <Cpu className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Đăng ký tài khoản</h1>
          <p className="text-sm text-slate-500 mt-1">Đăng ký để bắt đầu sử dụng hệ thống</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullname" className="text-xs font-semibold text-slate-500">Họ và tên</Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="fullname"
                type="text"
                required
                placeholder="Nguyễn Văn A"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-10 bg-white/80 h-10 text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-slate-500">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                required
                placeholder="admin@smarthome.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-white/80 h-10 text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-slate-500">Mật khẩu</Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="password"
                type="password"
                required
                placeholder="Ít nhất 6 ký tự"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-white/80 h-10 text-slate-900"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30 hover:opacity-90 cursor-pointer mt-4"
          >
            {loading ? "Đang xử lý..." : "Đăng ký"}
          </Button>
        </form>

        <div className="text-center text-xs text-slate-500 mt-6 border-t border-slate-200/50 pt-4">
          Đã có tài khoản?{" "}
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
