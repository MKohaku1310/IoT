/**
 * HouseholdTab.tsx
 * Quản lý thành viên hộ gia đình:
 * - Owner: mời bằng email, tạo mã mời / QR, quản lý danh sách
 * - Member: xem household, xem quyền, rời household
 */
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  Users2,
  UserPlus,
  Home,
  QrCode,
  Copy,
  Check,
  Trash2,
  Shield,
  ShieldCheck,
  Eye,
  Crown,
  LogOut,
  RefreshCw,
  Mail,
  Key,
  Clock,
  ChevronDown,
  Plus,
  Link2,
  AlertTriangle,
  UserCheck,
  Loader2,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useHousehold } from "@/hooks/use-household";
import type { InviteCodeData } from "@/components/dashboard/shared/types";
import { toast } from "sonner";

type Permission = "full_control" | "view_only";

// ── QR Code renderer (SVG, no external lib needed) ───────────
// Dùng API qrserver.com (CDN, không cần npm)
function QRCodeImage({ value, size = 200 }: { value: string; size?: number }) {
  const encoded = encodeURIComponent(value);
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=ffffff&color=1e293b&margin=12`}
      alt="QR Code mã mời"
      className="rounded-xl border border-slate-200 shadow-lg"
      style={{ width: size, height: size }}
      loading="lazy"
    />
  );
}

// ── Permission badge ──────────────────────────────────────────
function PermBadge({ perm, role }: { perm: Permission; role: string }) {
  if (role === "owner") {
    return (
      <Badge className="gap-1 bg-amber-500/15 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30">
        <Crown className="h-3 w-3" /> Chủ hộ
      </Badge>
    );
  }
  if (perm === "full_control") {
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30">
        <ShieldCheck className="h-3 w-3" /> Điều khiển đầy đủ
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-sky-500/15 text-sky-700 border-sky-300 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30">
      <Eye className="h-3 w-3" /> Chỉ xem
    </Badge>
  );
}

// ── Avatar ────────────────────────────────────────────────────
function MemberAvatar({ name, avatar }: { name: string; avatar?: string | null }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        className="h-10 w-10 rounded-full object-cover ring-2 ring-indigo-400/30"
      />
    );
  }
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(-2)
    .join("")
    .toUpperCase();
  const colors = [
    "from-indigo-500 to-sky-500",
    "from-emerald-500 to-teal-400",
    "from-amber-500 to-orange-400",
    "from-rose-500 to-pink-400",
    "from-violet-500 to-purple-400",
  ];
  const colorIdx = name.charCodeAt(0) % colors.length;
  return (
    <div
      className={cn(
        "h-10 w-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/30 shrink-0",
        colors[colorIdx]
      )}
    >
      {initials || "?"}
    </div>
  );
}

// ── Countdown timer for invite code ──────────────────────────
function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function calc() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Hết hạn"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setRemaining(`${h}h ${m}m`);
    }
    calc();
    const t = setInterval(calc, 30_000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const isExpired = new Date(expiresAt).getTime() < Date.now();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        isExpired ? "text-rose-500" : "text-slate-500"
      )}
    >
      <Clock className="h-3 w-3" /> {remaining}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export function HouseholdTab({ currentUser }: { currentUser: any }) {
  const {
    household,
    members,
    householdRole,
    householdPermission,
    householdId,
    loading,
    refreshHousehold,
    inviteByEmail,
    generateInviteCode,
    joinByCode,
    removeMember,
    changeMemberPermission,
    createHousehold,
    leaveHousehold,
  } = useHousehold();

  // UI state
  const [activePanel, setActivePanel] = useState<"invite_email" | "invite_code" | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePerm, setInvitePerm] = useState<Permission>("full_control");
  const [inviting, setInviting] = useState(false);

  const [generatedCode, setGeneratedCode] = useState<InviteCodeData | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codePerm, setCodePerm] = useState<Permission>("full_control");

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("Nhà của tôi");
  const [createAddr, setCreateAddr] = useState("");
  const [creating, setCreating] = useState(false);

  const [copiedCode, setCopiedCode] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const [householdName, setHouseholdName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (household) setHouseholdName(household.ten_nha);
  }, [household]);

  // ── Copy invite code to clipboard ────────────────────────
  const copyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode.ma_moi).then(() => {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    });
  };

  // ── Handle invite email submit ───────────────────────────
  const handleInviteEmail = async () => {
    if (!inviteEmail.trim()) { toast.error("Nhập email cần mời!"); return; }
    setInviting(true);
    const ok = await inviteByEmail(inviteEmail.trim(), invitePerm);
    if (ok) {
      setInviteEmail("");
      setActivePanel(null);
    }
    setInviting(false);
  };

  // ── Generate invite code ─────────────────────────────────
  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    const code = await generateInviteCode(codePerm);
    setGeneratedCode(code);
    setGeneratingCode(false);
  };

  // ── Join by code ─────────────────────────────────────────
  const handleJoinCode = async () => {
    if (!joinCode.trim()) { toast.error("Nhập mã mời!"); return; }
    setJoining(true);
    await joinByCode(joinCode.trim());
    setJoining(false);
    setJoinDialogOpen(false);
    setJoinCode("");
  };

  // ── Create household ─────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true);
    const ok = await createHousehold(createName, createAddr);
    setCreating(false);
    if (ok) setCreateDialogOpen(false);
  };

  // ── Edit household name ───────────────────────────────────
  const handleSaveName = async () => {
    if (!householdId || !householdName.trim()) return;
    setSavingName(true);
    const { error } = await supabase
      .from("hogiadinh")
      .update({ ten_nha: householdName.trim() })
      .eq("id_hogiadinh", householdId);
    setSavingName(false);
    if (error) { toast.error("Lỗi cập nhật tên: " + error.message); return; }
    setEditingName(false);
    toast.success("Đã cập nhật tên hộ gia đình!");
    refreshHousehold();
  };

  // ════════════════════════════════════════════════════════════
  // LOADING STATE
  // ════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // NO HOUSEHOLD STATE — Chưa thuộc hộ nào
  // ════════════════════════════════════════════════════════════
  if (!household) {
    return (
      <div className="max-w-xl mx-auto py-12 flex flex-col items-center gap-6">
        {/* Icon */}
        <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <Home className="h-12 w-12 text-white" />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Bạn chưa thuộc hộ gia đình nào
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Tạo hộ gia đình mới để chia sẻ quyền truy cập thiết bị với các thành viên trong nhà,
            hoặc nhập mã mời từ chủ hộ để tham gia.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="flex-1 gap-2 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white shadow-lg shadow-indigo-500/30"
          >
            <Plus className="h-4 w-4" /> Tạo hộ gia đình mới
          </Button>
          <Button
            variant="outline"
            onClick={() => setJoinDialogOpen(true)}
            className="flex-1 gap-2"
          >
            <Key className="h-4 w-4" /> Nhập mã mời / QR
          </Button>
        </div>

        {/* Dialog tạo household */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-indigo-500" /> Tạo hộ gia đình mới
              </DialogTitle>
              <DialogDescription>
                Bạn sẽ là chủ hộ và có quyền mời thành viên khác.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-2">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Tên hộ gia đình
                </label>
                <Input
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="VD: Nhà mình, Gia đình Nguyễn..."
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">
                  Địa chỉ (tuỳ chọn)
                </label>
                <Input
                  value={createAddr}
                  onChange={(e) => setCreateAddr(e.target.value)}
                  placeholder="VD: 123 Đường ABC, Hà Nội"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={creating || !createName.trim()}
                className="w-full gap-2 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {creating ? "Đang tạo..." : "Tạo hộ gia đình"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog nhập mã mời */}
        <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-indigo-500" /> Tham gia bằng mã mời
              </DialogTitle>
              <DialogDescription>
                Nhập mã mời (UUID) do chủ hộ cung cấp để tham gia hộ gia đình.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 pt-2">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Dán mã mời vào đây..."
                className="font-mono text-sm"
                autoFocus
              />
              <Button
                onClick={handleJoinCode}
                disabled={joining || !joinCode.trim()}
                className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
              >
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                {joining ? "Đang tham gia..." : "Tham gia"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // HAS HOUSEHOLD — Hiển thị theo role
  // ════════════════════════════════════════════════════════════
  const isOwner = householdRole === "owner";
  const isViewOnly = !isOwner && householdPermission === "view_only";

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* ── HEADER CARD ──────────────────────────────────────── */}
      <GlassCard className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
              <Home className="h-7 w-7 text-white" />
            </div>
            <div>
              {isOwner && editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    className="text-lg font-bold h-9 w-56"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                  />
                  <Button size="sm" onClick={handleSaveName} disabled={savingName} className="h-9 px-3 gap-1">
                    {savingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1
                    className={cn(
                      "text-xl font-bold text-slate-800 dark:text-slate-100",
                      isOwner && "cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                    )}
                    onClick={() => isOwner && setEditingName(true)}
                    title={isOwner ? "Nhấn để đổi tên" : undefined}
                  >
                    {household.ten_nha}
                  </h1>
                  {isOwner && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      (nhấn để sửa)
                    </span>
                  )}
                </div>
              )}
              {household.dia_chi && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{household.dia_chi}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <PermBadge perm={householdPermission} role={householdRole || "member"} />
                <span className="text-xs text-slate-400">{members.length} thành viên</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refreshHousehold} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Làm mới
            </Button>
            {!isOwner && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs"
                onClick={() => setConfirmLeave(true)}
              >
                <LogOut className="h-3.5 w-3.5" /> Rời hộ
              </Button>
            )}
          </div>
        </div>

        {/* View-only warning */}
        {isViewOnly && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 px-4 py-3">
            <Eye className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Chỉ xem — không điều khiển thiết bị</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">Liên hệ chủ hộ để được cấp quyền điều khiển đầy đủ.</p>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── OWNER — INVITE PANEL ─────────────────────────────── */}
      {isOwner && (
        <GlassCard className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <UserPlus className="h-5 w-5 text-indigo-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Mời thành viên</h2>
          </div>

          {/* Toggle panels */}
          <div className="flex gap-3 mb-5">
            <button
              onClick={() => setActivePanel(activePanel === "invite_email" ? null : "invite_email")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border transition-all",
                activePanel === "invite_email"
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/25"
                  : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700/60"
              )}
            >
              <Mail className="h-4 w-4" /> Mời qua Email
            </button>
            <button
              onClick={() => setActivePanel(activePanel === "invite_code" ? null : "invite_code")}
              className={cn(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium border transition-all",
                activePanel === "invite_code"
                  ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/25"
                  : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700/60"
              )}
            >
              <QrCode className="h-4 w-4" /> Mã mời / QR
            </button>
          </div>

          {/* Panel: Invite by Email */}
          {activePanel === "invite_email" && (
            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/10 p-5 flex flex-col gap-4">
              <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="nhap@email.com"
                  className="flex-1 min-w-0"
                  onKeyDown={(e) => e.key === "Enter" && handleInviteEmail()}
                />
                <Select value={invitePerm} onValueChange={(v) => setInvitePerm(v as Permission)}>
                  <SelectTrigger className="w-48 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_control">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Điều khiển đầy đủ
                      </span>
                    </SelectItem>
                    <SelectItem value="view_only">
                      <span className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5 text-sky-500" /> Chỉ xem
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleInviteEmail}
                disabled={inviting || !inviteEmail.trim()}
                className="self-start gap-2 bg-indigo-500 hover:bg-indigo-600 text-white"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {inviting ? "Đang mời..." : "Gửi lời mời"}
              </Button>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Người dùng phải đã có tài khoản trên hệ thống. Họ sẽ thấy thiết bị ngay khi đăng nhập.
              </p>
            </div>
          )}

          {/* Panel: Invite by Code / QR */}
          {activePanel === "invite_code" && (
            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-900/10 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={codePerm} onValueChange={(v) => setCodePerm(v as Permission)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_control">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Điều khiển đầy đủ
                      </span>
                    </SelectItem>
                    <SelectItem value="view_only">
                      <span className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5 text-sky-500" /> Chỉ xem
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleGenerateCode}
                  disabled={generatingCode}
                  className="gap-2 bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  {generatingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Tạo mã mời mới
                </Button>
              </div>

              {/* Generated code display */}
              {generatedCode && !generatedCode.is_used && (
                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start p-4 bg-white/80 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-2">
                    <QRCodeImage value={generatedCode.ma_moi} size={160} />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Quét để tham gia</span>
                  </div>

                  {/* Code text + actions */}
                  <div className="flex flex-col gap-3 flex-1 min-w-0">
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">Mã mời</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs font-mono bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-slate-700 dark:text-slate-300 break-all border border-slate-200 dark:border-slate-700">
                          {generatedCode.ma_moi}
                        </code>
                        <button
                          onClick={copyCode}
                          className="p-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors shrink-0"
                          title="Sao chép"
                        >
                          {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs flex-wrap">
                      <PermBadge perm={generatedCode.quyen_dieu_khien as Permission} role="member" />
                      <CountdownBadge expiresAt={generatedCode.expires_at} />
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Chia sẻ mã hoặc QR code này cho thành viên. Mã chỉ dùng được 1 lần.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      )}

      {/* ── MEMBER LIST ──────────────────────────────────────── */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users2 className="h-5 w-5 text-indigo-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Thành viên ({members.length})
            </h2>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3 text-slate-400">
            <Users2 className="h-12 w-12 opacity-30" />
            <p className="text-sm">Chưa có thành viên nào</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {members.map((m) => {
              const name = m.nguoidung?.hoten || `User #${m.idnguoidung}`;
              const email = m.nguoidung?.email || "";
              const isMe = m.idnguoidung === currentUser?.idnguoidung;
              return (
                <div
                  key={m.id_thanhvien}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl px-4 py-3.5 border transition-all",
                    isMe
                      ? "bg-indigo-50/60 dark:bg-indigo-900/15 border-indigo-200 dark:border-indigo-500/25"
                      : "bg-white/50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60 hover:border-indigo-300/60 dark:hover:border-indigo-500/30"
                  )}
                >
                  {/* Avatar */}
                  <MemberAvatar name={name} avatar={m.nguoidung?.anhdaidien} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {name}
                      </span>
                      {isMe && (
                        <Badge className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-300/50">
                          Bạn
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{email}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <PermBadge perm={m.quyen_dieu_khien} role={m.vaitro} />
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Tham gia {new Date(m.thoigian_thamgia).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                  </div>

                  {/* Owner controls */}
                  {isOwner && !isMe && m.vaitro !== "owner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1 text-xs text-slate-500 h-8 px-2">
                          <Shield className="h-3.5 w-3.5" />
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="text-xs">Thay đổi quyền</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => changeMemberPermission(m.id_thanhvien, "full_control")}
                          className={cn(m.quyen_dieu_khien === "full_control" && "bg-emerald-50 dark:bg-emerald-900/20")}
                        >
                          <ShieldCheck className="h-4 w-4 mr-2 text-emerald-500" />
                          Điều khiển đầy đủ
                          {m.quyen_dieu_khien === "full_control" && <Check className="h-3.5 w-3.5 ml-auto text-emerald-500" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => changeMemberPermission(m.id_thanhvien, "view_only")}
                          className={cn(m.quyen_dieu_khien === "view_only" && "bg-sky-50 dark:bg-sky-900/20")}
                        >
                          <Eye className="h-4 w-4 mr-2 text-sky-500" />
                          Chỉ xem
                          {m.quyen_dieu_khien === "view_only" && <Check className="h-3.5 w-3.5 ml-auto text-sky-500" />}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setConfirmRemoveId(m.id_thanhvien)}
                          className="text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Xóa khỏi hộ gia đình
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* ── CONFIRM LEAVE DIALOG ─────────────────────────────── */}
      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <LogOut className="h-5 w-5" /> Rời khỏi hộ gia đình?
            </DialogTitle>
            <DialogDescription>
              Bạn sẽ không còn thấy thiết bị của hộ gia đình này sau khi rời. Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmLeave(false)}>
              Hủy
            </Button>
            <Button
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white gap-2"
              onClick={async () => {
                const ok = await leaveHousehold();
                if (ok) setConfirmLeave(false);
              }}
            >
              <LogOut className="h-4 w-4" /> Rời hộ
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRM REMOVE MEMBER DIALOG ─────────────────────── */}
      <Dialog open={confirmRemoveId !== null} onOpenChange={(o) => !o && setConfirmRemoveId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" /> Xóa thành viên?
            </DialogTitle>
            <DialogDescription>
              {(() => {
                const m = members.find((x) => x.id_thanhvien === confirmRemoveId);
                return m
                  ? `Bạn có chắc muốn xóa "${m.nguoidung?.hoten}" khỏi hộ gia đình? Họ sẽ không còn thấy thiết bị của hộ.`
                  : "Bạn có chắc muốn xóa thành viên này?";
              })()}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setConfirmRemoveId(null)}>
              Hủy
            </Button>
            <Button
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white gap-2"
              onClick={async () => {
                if (confirmRemoveId !== null) {
                  await removeMember(confirmRemoveId);
                  setConfirmRemoveId(null);
                }
              }}
            >
              <Trash2 className="h-4 w-4" /> Xóa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── JOIN BY CODE DIALOG (fallback for members) ───────── */}
      <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-indigo-500" /> Tham gia bằng mã mời
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Dán mã mời (UUID) vào đây..."
              className="font-mono text-sm"
              autoFocus
            />
            <Button
              onClick={handleJoinCode}
              disabled={joining || !joinCode.trim()}
              className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              {joining ? "Đang tham gia..." : "Tham gia"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
