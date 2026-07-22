import { useState } from "react";
import { cn } from "@/lib/utils";
import { Cpu, Pencil, MoreVertical, Check } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useNode } from "@/hooks/use-node-context";
import { getRoomTypeConfig } from "@/components/dashboard/shared/constants";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function NodeSwitcher({
  dark = false,
  collapsed = false,
  className,
}: {
  dark?: boolean;
  collapsed?: boolean;
  className?: string;
}) {
  const { currentNode, currentNodeId, setCurrentNodeId, nodesList, nodesLoading, refreshNodes } = useNode();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleEditName = async () => {
    if (!editingName.trim() || !currentNode) return;
    setSaving(true);

    try {
      const { data: updateData, error } = await supabase
        .from('esp32_nodes')
        .update({ ten_phong: editingName.trim() })
        .eq('idnode', currentNode.id)
        .select();

      if (error) throw error;

      if (!updateData || updateData.length === 0) {
        toast.error(`Không tìm thấy node "${currentNode.id}" để cập nhật`);
        return;
      }

      const { data: verifyData, error: verifyError } = await supabase
        .from('esp32_nodes')
        .select('ten_phong')
        .eq('idnode', currentNode.id)
        .single();

      if (verifyError || !verifyData) {
        toast.error('Tên có thể không được lưu');
      } else if (verifyData.ten_phong !== editingName.trim()) {
        toast.error('Tên không được cập nhật đúng');
      } else {
        toast.success('Đã cập nhật tên phòng!');
      }

      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.user) {
        const { data: profile } = await supabase
          .from('nguoidung')
          .select('idnguoidung, hoten')
          .eq('auth_uid', authSession.user.id)
          .single();
        if (profile) {
          await supabase.from('audit_log').insert([{
            idnguoidung: profile.idnguoidung,
            hoten: profile.hoten,
            hanhdong: 'Cập nhật tên node',
            chi_tiet: `Đã đổi tên node ${currentNode.id} từ "${currentNode.name}" thành "${editingName.trim()}"`
          }]);
        }
      }

      setEditDialogOpen(false);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('nguoidung')
          .select('idnguoidung, vaitro')
          .eq('auth_uid', user.id)
          .single();
        if (profile) {
          await refreshNodes(profile.idnguoidung, profile.vaitro);
        }
      }
    } catch (err: any) {
      toast.error('Lỗi cập nhật tên phòng: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = () => {
    if (currentNode) {
      setEditingName(currentNode.name);
      setEditDialogOpen(true);
    }
  };

  if (nodesLoading && nodesList.length === 0) {
    return (
      <div className={cn(
        "rounded-xl border p-2 animate-pulse",
        dark ? "border-white/10 bg-white/5" : "border-slate-200/80 bg-white/70",
        collapsed && "p-1.5",
        className,
      )}>
        <div className={cn("h-8 rounded-lg", dark ? "bg-white/10" : "bg-slate-200/60")} />
      </div>
    );
  }

  if (nodesList.length === 0) {
    return (
      <div className={cn(
        "rounded-xl border p-2",
        dark ? "border-white/10 bg-white/5" : "border-slate-200/80 bg-white/70",
        collapsed && "hidden",
        className,
      )}>
        <div className={cn("text-[11px] font-medium text-center", dark ? "text-slate-500" : "text-slate-400")}>
          Chưa có Node
        </div>
      </div>
    );
  }

  if (collapsed) {
    const roomConfig = getRoomTypeConfig(currentNode.loai_phong || "phong_khac");
    const NodeIcon = roomConfig.icon || Cpu;
    return (
      <div className={cn("flex justify-center py-1.5", className)} title={`${currentNode.name} · ${currentNode.chip}`}>
        <div className={cn(
          "grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-white shadow-md cursor-pointer transition-transform hover:scale-105",
          roomConfig.gradient,
        )}>
          <NodeIcon className="h-4 w-4" />
        </div>
      </div>
    );
  }

  const roomConfig = getRoomTypeConfig(currentNode.loai_phong || "phong_khac");
  const RoomIcon = roomConfig.icon || Cpu;

  return (
    <div className={cn(
      "rounded-xl border p-2",
      dark ? "border-white/10 bg-white/5" : "border-slate-200/80 bg-white/70",
      className,
    )}>
      <div className="flex items-center gap-2">
        <Select value={currentNodeId} onValueChange={setCurrentNodeId}>
          <SelectTrigger className={cn(
            "h-8 flex-1 text-xs border-0 bg-transparent shadow-none focus:ring-0 focus:ring-offset-0 cursor-pointer px-1.5",
            dark ? "text-white hover:bg-white/5" : "text-slate-700 hover:bg-slate-100/60",
          )}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br text-white",
                roomConfig.gradient,
              )}>
                <RoomIcon className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn("truncate text-xs font-semibold leading-tight", dark ? "text-white" : "text-slate-800")}>
                  {currentNode.name}
                </div>
                <div className={cn("truncate text-[10px] leading-tight", dark ? "text-slate-500" : "text-slate-400")}>
                  {currentNode.chip}
                </div>
              </div>
            </div>
          </SelectTrigger>
          <SelectContent>
            {nodesList.map((n) => {
              const rc = getRoomTypeConfig(n.loai_phong || "phong_khac");
              const Ic = rc.icon || Cpu;
              return (
                <SelectItem key={n.id} value={n.id}>
                  <span className="inline-flex items-center gap-2">
                    <Ic className="h-3.5 w-3.5 text-indigo-500" />
                    {n.name}
                    <span className="text-[10px] text-slate-400">· {n.chip}</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors cursor-pointer",
                dark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
              )}
              title="Tùy chọn"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={openEditDialog} className="cursor-pointer text-xs">
              <Pencil className="mr-2 h-3.5 w-3.5" /> Đổi tên phòng
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-xs">
              <Check className="mr-2 h-3.5 w-3.5" /> {nodesList.length} node
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-indigo-600 flex items-center gap-1.5 font-bold">
              <Pencil className="h-5 w-5 text-indigo-500" />
              Đổi tên phòng
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Cập nhật tên phòng cho thiết bị {currentNode?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tên phòng mới:</label>
              <Input
                placeholder="Ví dụ: Phòng ngủ, Phòng khách..."
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-slate-200 dark:border-slate-800 cursor-pointer">
              Hủy
            </Button>
            <Button onClick={handleEditName} disabled={saving || !editingName.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
