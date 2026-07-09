import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { i as supabase, n as Input, r as cn, t as Button } from "./button-BSEu71bB.mjs";
import { t as Label } from "./label-CH_-onvm.mjs";
import { h as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { C as KeyRound, G as Camera, J as Bell, K as Calendar, N as Cpu, O as FileText, X as ArrowLeft, Z as Activity, b as LogOut, d as Shield, y as Mail, z as CircleCheck } from "../_libs/lucide-react.mjs";
import { n as Slider, r as Switch, t as Badge } from "./badge-DT2F_AiF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/profile-DUPtpbxr.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function GlassCard({ className, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_10px_40px_-20px_rgba(30,41,59,0.25)] backdrop-blur-xl", className),
		children
	});
}
function ProfilePage() {
	const [emailAlerts, setEmailAlerts] = (0, import_react.useState)(true);
	const [pushAlerts, setPushAlerts] = (0, import_react.useState)(true);
	const [criticalOnly, setCriticalOnly] = (0, import_react.useState)(false);
	const [threshold, setThreshold] = (0, import_react.useState)(30);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [isEditing, setIsEditing] = (0, import_react.useState)(false);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [user, setUser] = (0, import_react.useState)(null);
	const [profile, setProfile] = (0, import_react.useState)({
		idnguoidung: 1,
		hoten: "",
		email: "",
		sodienthoai: "",
		github: "",
		figma: "",
		ngaysinh: "",
		anhdaidien: "",
		linkpdf: "",
		thoigian: (/* @__PURE__ */ new Date()).toISOString()
	});
	const loadProfileById = async (id) => {
		setLoading(true);
		try {
			const { data, error } = await supabase.from("nguoidung").select("*").eq("idnguoidung", id).single();
			if (error) {
				console.error("Lỗi khi tải thông tin hồ sơ theo ID:", error);
				toast.error("Không thể tải hồ sơ người dùng: " + error.message);
			} else if (data) setProfile({
				idnguoidung: data.idnguoidung,
				hoten: data.hoten || "",
				email: data.email || "",
				sodienthoai: data.sodienthoai || "",
				github: data.github || "",
				figma: data.figma || "",
				ngaysinh: data.ngaysinh || "",
				anhdaidien: data.anhdaidien || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
				linkpdf: data.linkpdf || "",
				thoigian: data.thoigian || (/* @__PURE__ */ new Date()).toISOString()
			});
		} catch (err) {
			console.error("Lỗi khi tải thông tin hồ sơ theo ID:", err);
			toast.error("Lỗi hệ thống khi tải hồ sơ: " + err.message);
		}
		setLoading(false);
	};
	const loadOrCreateProfile = async (authUser) => {
		setLoading(true);
		try {
			const { data, error } = await supabase.from("nguoidung").select("*").eq("email", authUser.email).maybeSingle();
			if (error) throw error;
			if (data) setProfile({
				idnguoidung: data.idnguoidung,
				hoten: data.hoten || "",
				email: data.email || "",
				sodienthoai: data.sodienthoai || "",
				github: data.github || "",
				figma: data.figma || "",
				ngaysinh: data.ngaysinh || "",
				anhdaidien: data.anhdaidien || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
				linkpdf: data.linkpdf || "",
				thoigian: data.thoigian || (/* @__PURE__ */ new Date()).toISOString()
			});
			else {
				const newProfileData = {
					hoten: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Người dùng",
					email: authUser.email,
					sodienthoai: "",
					github: "",
					figma: "",
					ngaysinh: null,
					anhdaidien: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
					linkpdf: ""
				};
				const { data: insertedData, error: insertError } = await supabase.from("nguoidung").insert([newProfileData]).select().single();
				if (insertError) {
					console.warn("Không thể tạo hồ sơ trong database:", insertError);
					setProfile({
						idnguoidung: 0,
						...newProfileData,
						ngaysinh: "",
						thoigian: (/* @__PURE__ */ new Date()).toISOString()
					});
					toast.warning(`Không thể lưu hồ sơ: ${insertError.message}. Nếu do RLS, vui lòng kiểm tra policy; nếu do Primary Key, vui lòng bật tự động tăng ID (Serial).`, { duration: 8e3 });
				} else if (insertedData) {
					setProfile({
						idnguoidung: insertedData.idnguoidung,
						hoten: insertedData.hoten || "",
						email: insertedData.email || "",
						sodienthoai: insertedData.sodienthoai || "",
						github: insertedData.github || "",
						figma: insertedData.figma || "",
						ngaysinh: insertedData.ngaysinh || "",
						anhdaidien: insertedData.anhdaidien || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop",
						linkpdf: insertedData.linkpdf || "",
						thoigian: insertedData.thoigian || (/* @__PURE__ */ new Date()).toISOString()
					});
					toast.info("Đã tự động khởi tạo hồ sơ cá nhân mới!");
				}
			}
		} catch (err) {
			console.error("Lỗi khi tải/tạo hồ sơ:", err);
			toast.error("Không thể tải thông tin hồ sơ: " + err.message);
		}
		setLoading(false);
	};
	(0, import_react.useEffect)(() => {
		const getSessionUser = async () => {
			const { data: { session } } = await supabase.auth.getSession();
			if (session?.user) {
				setUser(session.user);
				await loadOrCreateProfile(session.user);
			} else await loadProfileById(1);
		};
		getSessionUser();
		const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
			if (session?.user) {
				setUser(session.user);
				await loadOrCreateProfile(session.user);
			} else {
				setUser(null);
				await loadProfileById(1);
			}
		});
		return () => subscription.unsubscribe();
	}, []);
	const handleSaveProfile = async () => {
		setSaving(true);
		try {
			const { data, error } = await supabase.from("nguoidung").update({
				hoten: profile.hoten,
				email: profile.email,
				sodienthoai: profile.sodienthoai,
				github: profile.github,
				figma: profile.figma,
				ngaysinh: profile.ngaysinh || null,
				anhdaidien: profile.anhdaidien,
				linkpdf: profile.linkpdf
			}).eq("idnguoidung", profile.idnguoidung).select();
			if (error) throw error;
			if (!data || data.length === 0) throw new Error("Không có hàng nào được cập nhật. Vui lòng tắt Row Level Security (RLS) cho bảng 'nguoidung' trên Supabase Dashboard!");
			await supabase.from("nhatkyhoatdong").insert([{
				idnguoidung: profile.idnguoidung,
				hanhdong: `Cấu hình: Cập nhật thông tin cá nhân của người dùng (${profile.hoten})`
			}]);
			toast.success("Cập nhật thông tin hồ sơ thành công!");
			setIsEditing(false);
		} catch (err) {
			toast.error("Lỗi khi cập nhật hồ sơ: " + err.message);
		}
		setSaving(false);
	};
	const handleLogout = async () => {
		try {
			await supabase.auth.signOut();
			toast.success("Đã đăng xuất thành công!");
			window.location.href = "/";
		} catch (err) {
			toast.error("Lỗi khi đăng xuất: " + err.message);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen bg-[radial-gradient(1200px_600px_at_-10%_-10%,#dbe7ff_0%,transparent_60%),radial-gradient(900px_500px_at_110%_10%,#ffe4f0_0%,transparent_55%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)] p-6 lg:p-10 text-slate-800",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-6xl space-y-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/",
							className: "inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:bg-white",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-4 w-4" }), " Về Bảng điều khiển"]
						}),
						!user && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 min-w-[280px] flex items-center justify-between gap-4 rounded-full border border-amber-200 bg-amber-50/80 px-4 py-2 text-xs text-amber-800 shadow-sm backdrop-blur-lg",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-bold",
								children: "Chế độ khách:"
							}), " Bạn đang xem tài khoản mẫu. Đăng nhập để chỉnh sửa thông tin!"] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/login",
								className: "font-bold text-indigo-600 hover:underline",
								children: "Đăng nhập"
							})]
						}),
						user && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: handleLogout,
							variant: "outline",
							className: "border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4 mr-2" }), " Đăng xuất"]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GlassCard, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-start gap-6 md:flex-row md:items-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "overflow-hidden rounded-3xl h-24 w-24 shadow-xl shadow-indigo-500/40",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: profile.anhdaidien,
									alt: "Avatar",
									className: "h-full w-full object-cover"
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setIsEditing(true),
								className: "absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-slate-900 text-white shadow-md transition hover:scale-110",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "h-3.5 w-3.5" })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "min-w-0 flex-1",
							children: isEditing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid gap-3 sm:grid-cols-2 max-w-xl",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "fullname",
											className: "text-xs font-semibold text-slate-500",
											children: "Họ và tên"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "fullname",
											value: profile.hoten,
											onChange: (e) => setProfile((p) => ({
												...p,
												hoten: e.target.value
											})),
											className: "bg-white/80 h-9 text-slate-900"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "email",
											className: "text-xs font-semibold text-slate-500",
											children: "Email"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "email",
											value: profile.email,
											onChange: (e) => setProfile((p) => ({
												...p,
												email: e.target.value
											})),
											className: "bg-white/80 h-9 text-slate-900"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "phone",
											className: "text-xs font-semibold text-slate-500",
											children: "Số điện thoại"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "phone",
											value: profile.sodienthoai,
											onChange: (e) => setProfile((p) => ({
												...p,
												sodienthoai: e.target.value
											})),
											className: "bg-white/80 h-9 text-slate-900"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "dob",
											className: "text-xs font-semibold text-slate-500",
											children: "Ngày sinh"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "dob",
											type: "date",
											value: profile.ngaysinh,
											onChange: (e) => setProfile((p) => ({
												...p,
												ngaysinh: e.target.value
											})),
											className: "bg-white/80 h-9 text-slate-900"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "github",
											className: "text-xs font-semibold text-slate-500",
											children: "Github"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "github",
											value: profile.github,
											onChange: (e) => setProfile((p) => ({
												...p,
												github: e.target.value
											})),
											className: "bg-white/80 h-9 text-slate-900"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "figma",
											className: "text-xs font-semibold text-slate-500",
											children: "Figma"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "figma",
											value: profile.figma,
											onChange: (e) => setProfile((p) => ({
												...p,
												figma: e.target.value
											})),
											className: "bg-white/80 h-9 text-slate-900"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "avatar",
											className: "text-xs font-semibold text-slate-500",
											children: "Ảnh đại diện URL"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "avatar",
											value: profile.anhdaidien,
											onChange: (e) => setProfile((p) => ({
												...p,
												anhdaidien: e.target.value
											})),
											className: "bg-white/80 h-9 text-slate-900"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1 sm:col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
											htmlFor: "linkpdf",
											className: "text-xs font-semibold text-slate-500",
											children: "Đường dẫn PDF tài liệu"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "linkpdf",
											value: profile.linkpdf,
											onChange: (e) => setProfile((p) => ({
												...p,
												linkpdf: e.target.value
											})),
											className: "bg-white/80 h-9 text-slate-900",
											placeholder: "https://example.com/tai-lieu.pdf"
										})]
									})
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "text-2xl font-bold text-slate-900",
									children: profile.hoten || "Chưa thiết lập tên"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 flex flex-wrap items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
											className: "rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "mr-1 h-3 w-3" }), " Quản trị viên"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "inline-flex items-center gap-1.5 text-sm text-slate-600",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-3.5 w-3.5" }),
												" ",
												profile.email
											]
										}),
										profile.sodienthoai && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "inline-flex items-center gap-1.5 text-sm text-slate-600",
											children: ["SĐT: ", profile.sodienthoai]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "inline-flex items-center gap-1.5 text-sm text-slate-600",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "h-3.5 w-3.5" }),
												" Tham gia: ",
												new Date(profile.thoigian).toLocaleDateString("vi-VN")
											]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 flex flex-wrap gap-3 text-xs text-slate-500",
									children: [
										profile.github && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Github: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
											href: `https://github.com/${profile.github}`,
											target: "_blank",
											rel: "noreferrer",
											className: "text-indigo-600 hover:underline",
											children: profile.github
										})] }),
										profile.figma && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Figma: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium text-slate-700",
											children: profile.figma
										})] }),
										profile.ngaysinh && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Sinh nhật: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-medium text-slate-700",
											children: new Date(profile.ngaysinh).toLocaleDateString("vi-VN")
										})] }),
										profile.linkpdf && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Tài liệu: ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: profile.linkpdf,
											target: "_blank",
											rel: "noreferrer",
											className: "inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-3 w-3" }), " Xem PDF"]
										})] })
									]
								})
							] })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex gap-2",
							children: isEditing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								disabled: saving,
								onClick: handleSaveProfile,
								className: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20",
								children: saving ? "Đang lưu..." : "Lưu"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								disabled: saving,
								onClick: () => setIsEditing(false),
								children: "Hủy"
							})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								onClick: () => setIsEditing(true),
								className: "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30 hover:opacity-90",
								children: "Chỉnh sửa"
							})
						})
					]
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-2 gap-4 md:grid-cols-4",
					children: [
						{
							label: "Thao tác thiết bị",
							value: "1,284",
							icon: Activity,
							color: "from-indigo-500 to-sky-400"
						},
						{
							label: "Cảnh báo đã xử lý",
							value: "42",
							icon: Bell,
							color: "from-rose-500 to-orange-400"
						},
						{
							label: "Node đang quản lý",
							value: "3",
							icon: Cpu,
							color: "from-emerald-500 to-teal-400"
						},
						{
							label: "Uptime hoạt động",
							value: "27 ngày",
							icon: CircleCheck,
							color: "from-amber-400 to-yellow-300"
						}
					].map((s) => {
						const Icon = s.icon;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, {
							className: "p-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: cn("grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", s.color),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-3 text-2xl font-bold text-slate-900",
									children: s.value
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-slate-500",
									children: s.label
								})
							]
						}, s.label);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 gap-6 lg:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-base font-semibold text-slate-900",
							children: "Node/Thiết bị đang quản lý"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-slate-500",
							children: "Danh sách node ESP32 gắn với tài khoản"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-4 space-y-2",
							children: [
								{
									name: "ESP32-S3 · Phòng khách",
									status: "Online",
									devices: "AC, Fan, Light"
								},
								{
									name: "ESP32-S3 · Phòng ngủ",
									status: "Online",
									devices: "AC, Light"
								},
								{
									name: "ESP32-C3 · Nhà bếp",
									status: "Offline",
									devices: "Fan, Sensor"
								}
							].map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 p-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-sm font-medium text-slate-900",
										children: d.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-slate-500",
										children: d.devices
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
									className: cn("rounded-full", d.status === "Online" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-rose-100 text-rose-700 hover:bg-rose-100"),
									children: ["● ", d.status]
								})]
							}, d.name))
						})
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4 text-slate-500" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-base font-semibold text-slate-900",
							children: "Đổi mật khẩu"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-4 space-y-3",
						onSubmit: (e) => {
							e.preventDefault();
							toast.success("Đã đổi mật khẩu thành công");
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "old",
									children: "Mật khẩu hiện tại"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "old",
									type: "password",
									className: "bg-white/80",
									placeholder: "••••••••"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "new",
									children: "Mật khẩu mới"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "new",
									type: "password",
									className: "bg-white/80",
									placeholder: "Ít nhất 8 ký tự"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "confirm",
									children: "Xác nhận mật khẩu"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "confirm",
									type: "password",
									className: "bg-white/80"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								className: "w-full bg-slate-900 text-white hover:bg-slate-800",
								children: "Cập nhật mật khẩu"
							})
						]
					})] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4 text-slate-500" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-base font-semibold text-slate-900",
							children: "Cài đặt thông báo cá nhân"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, {
								label: "Nhận cảnh báo qua email",
								hint: "Gửi tới admin@smarthome.io khi thiết bị vượt ngưỡng",
								value: emailAlerts,
								onChange: setEmailAlerts
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, {
								label: "Thông báo đẩy trong ứng dụng",
								hint: "Toast góc phải màn hình khi có sự kiện mới",
								value: pushAlerts,
								onChange: setPushAlerts
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRow, {
								label: "Chỉ báo cảnh báo nghiêm trọng",
								hint: "Bỏ qua cảnh báo mức thấp/thông tin",
								value: criticalOnly,
								onChange: setCriticalOnly
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-white/70 bg-white/60 p-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-sm font-medium text-slate-900",
										children: "Ngưỡng nhiệt độ báo riêng"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-slate-500",
										children: "Gửi email khi nhiệt độ vượt giá trị này"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-lg font-semibold text-slate-900 tabular-nums",
										children: [threshold, "°C"]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
									value: [threshold],
									min: 20,
									max: 40,
									step: 1,
									onValueChange: (v) => setThreshold(v[0]),
									className: "mt-4"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 flex justify-end",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: () => toast.success("Đã lưu cài đặt thông báo"),
							className: "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30 hover:opacity-90",
							children: "Lưu cài đặt"
						})
					})
				] })
			]
		})
	});
}
function ToggleRow({ label, hint, value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between rounded-2xl border border-white/70 bg-white/60 p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "min-w-0 pr-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm font-medium text-slate-900",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs text-slate-500",
				children: hint
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
			checked: value,
			onCheckedChange: onChange
		})]
	});
}
//#endregion
export { ProfilePage as component };
