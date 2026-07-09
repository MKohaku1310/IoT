import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { i as supabase, n as Input, r as cn, t as Button } from "./button-BSEu71bB.mjs";
import { h as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { A as Droplets, B as ChevronUp, D as Funnel, E as HeartPulse, F as Circle, H as ChevronDown, I as CircleX, J as Bell, L as CircleUser, M as Database, N as Cpu, P as Clock, R as CircleDot, S as LayoutDashboard, T as History, U as Check, V as ChevronRight, W as ChartLine, Y as ArrowRight, _ as Moon, a as TriangleAlert, b as LogOut, c as Thermometer, f as ShieldAlert, g as Pencil, h as Plus, i as User, j as Download, k as Fan, l as Sunrise, m as Search, n as Wind, o as TrendingUp, p as Settings, q as CalendarClock, r as Wifi, s as Trash2, t as Zap, u as Sun, v as Menu, w as House, x as Lightbulb, z as CircleCheck } from "../_libs/lucide-react.mjs";
import { a as Label2, c as Root2, d as SubTrigger2, f as Trigger, i as ItemIndicator2, l as Separator2, n as Content2, o as Portal2, r as Item2, s as RadioItem2, t as CheckboxItem2, u as SubContent2 } from "../_libs/@radix-ui/react-dropdown-menu+[...].mjs";
import { a as SelectItemIndicator, c as SelectPortal, d as SelectSeparator$1, f as SelectTrigger$1, i as SelectItem$1, l as SelectScrollDownButton$1, m as SelectViewport, n as SelectContent$1, o as SelectItemText, p as SelectValue$1, r as SelectIcon, s as SelectLabel$1, t as Select$1, u as SelectScrollUpButton$1 } from "../_libs/@radix-ui/react-select+[...].mjs";
import { n as Slider, r as Switch, t as Badge } from "./badge-DT2F_AiF.mjs";
import { a as XAxis, c as CartesianGrid, d as ResponsiveContainer, f as Tooltip, i as YAxis, l as ReferenceLine, n as AreaChart, o as Area, p as Legend, r as LineChart, s as Line, t as ComposedChart, u as Bar } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/smart-home-U1pgKRz0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
function useNow(intervalMs = 1e3) {
	const [now, setNow] = (0, import_react.useState)(() => Date.now());
	(0, import_react.useEffect)(() => {
		const id = setInterval(() => setNow(Date.now()), intervalMs);
		return () => clearInterval(id);
	}, [intervalMs]);
	return now;
}
function useRelativeTime(timestamp) {
	const now = useNow(15e3);
	const diff = Math.max(0, Math.floor((now - timestamp) / 1e3));
	if (diff < 10) return "vừa xong";
	if (diff < 60) return `${diff} giây trước`;
	const m = Math.floor(diff / 60);
	if (m < 60) return `${m} phút trước`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h} giờ trước`;
	return `${Math.floor(h / 24)} ngày trước`;
}
function useTimeOfDay() {
	const [mounted, setMounted] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setMounted(true), []);
	const now = useNow(6e4);
	const h = mounted ? new Date(now).getHours() : 10;
	const dark = "radial-gradient(1200px 600px at -10% -10%,#1e293b 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#312e81 0%,transparent 55%),linear-gradient(180deg,#0b1020 0%,#1a1836 100%)";
	if (h >= 5 && h < 9) return {
		period: "dawn",
		label: "Sáng sớm",
		darkGradient: dark,
		gradient: "radial-gradient(1200px 600px at -10% -10%,#ffe4c4 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#ffd6e0 0%,transparent 55%),linear-gradient(180deg,#fff5eb 0%,#ffe9d6 100%)"
	};
	if (h >= 9 && h < 14) return {
		period: "morning",
		label: "Buổi sáng",
		darkGradient: dark,
		gradient: "radial-gradient(1200px 600px at -10% -10%,#dbe7ff 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#e0f7ff 0%,transparent 55%),linear-gradient(180deg,#f6f9ff 0%,#eaf2fb 100%)"
	};
	if (h >= 14 && h < 17) return {
		period: "afternoon",
		label: "Buổi trưa",
		darkGradient: dark,
		gradient: "radial-gradient(1200px 600px at -10% -10%,#fff2c4 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#ffe4b0 0%,transparent 55%),linear-gradient(180deg,#fffaf0 0%,#fff3e0 100%)"
	};
	if (h >= 17 && h < 20) return {
		period: "evening",
		label: "Chiều tối",
		darkGradient: dark,
		gradient: "radial-gradient(1200px 600px at -10% -10%,#ffb8a8 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#c7a8ff 0%,transparent 55%),linear-gradient(180deg,#fde4d8 0%,#e8d8ff 100%)"
	};
	return {
		period: "night",
		label: "Ban đêm",
		darkGradient: dark,
		gradient: "radial-gradient(1200px 600px at -10% -10%,#334166 0%,transparent 60%),radial-gradient(900px 500px at 110% 10%,#3d2a5c 0%,transparent 55%),linear-gradient(180deg,#1e2440 0%,#2a2148 100%)"
	};
}
function useDarkMode() {
	const [dark, setDark] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const init = (typeof window !== "undefined" ? window.localStorage.getItem("sh-theme") : null) === "dark";
		setDark(init);
		document.documentElement.classList.toggle("dark", init);
	}, []);
	const toggle = () => {
		setDark((d) => {
			const nd = !d;
			document.documentElement.classList.toggle("dark", nd);
			try {
				window.localStorage.setItem("sh-theme", nd ? "dark" : "light");
			} catch {}
			return nd;
		});
	};
	return {
		dark,
		toggle
	};
}
function useAnimatedNumber(target, duration = 700) {
	const [value, setValue] = (0, import_react.useState)(target);
	const rafRef = (0, import_react.useRef)(0);
	(0, import_react.useEffect)(() => {
		const from = value;
		const to = target;
		if (from === to) return;
		let start = null;
		const step = (t) => {
			if (start === null) start = t;
			const p = Math.min(1, (t - start) / duration);
			const eased = 1 - Math.pow(1 - p, 3);
			setValue(from + (to - from) * eased);
			if (p < 1) rafRef.current = requestAnimationFrame(step);
		};
		rafRef.current = requestAnimationFrame(step);
		return () => cancelAnimationFrame(rafRef.current);
	}, [target, duration]);
	return value;
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/routes-CscbjL8a.js
var import_jsx_runtime = require_jsx_runtime();
var DropdownMenu = Root2;
var DropdownMenuTrigger = Trigger;
var DropdownMenuSubTrigger = import_react.forwardRef(({ className, inset, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SubTrigger2, {
	ref,
	className: cn("flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", inset && "pl-8", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "ml-auto" })]
}));
DropdownMenuSubTrigger.displayName = SubTrigger2.displayName;
var DropdownMenuSubContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SubContent2, {
	ref,
	className: cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)", className),
	...props
}));
DropdownMenuSubContent.displayName = SubContent2.displayName;
var DropdownMenuContent = import_react.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	sideOffset,
	className: cn("z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md", "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-dropdown-menu-content-transform-origin)", className),
	...props
}) }));
DropdownMenuContent.displayName = Content2.displayName;
var DropdownMenuItem = import_react.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0", inset && "pl-8", className),
	...props
}));
DropdownMenuItem.displayName = Item2.displayName;
var DropdownMenuCheckboxItem = import_react.forwardRef(({ className, children, checked, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CheckboxItem2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	checked,
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) })
	}), children]
}));
DropdownMenuCheckboxItem.displayName = CheckboxItem2.displayName;
var DropdownMenuRadioItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(RadioItem2, {
	ref,
	className: cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute left-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ItemIndicator2, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Circle, { className: "h-2 w-2 fill-current" }) })
	}), children]
}));
DropdownMenuRadioItem.displayName = RadioItem2.displayName;
var DropdownMenuLabel = import_react.forwardRef(({ className, inset, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label2, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", inset && "pl-8", className),
	...props
}));
DropdownMenuLabel.displayName = Label2.displayName;
var DropdownMenuSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator2, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
DropdownMenuSeparator.displayName = Separator2.displayName;
var DropdownMenuShortcut = ({ className, ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn("ml-auto text-xs tracking-widest opacity-60", className),
		...props
	});
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";
var Select = Select$1;
var SelectValue = SelectValue$1;
var SelectTrigger = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectTrigger$1, {
	ref,
	className: cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectIcon, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 opacity-50" })
	})]
}));
SelectTrigger.displayName = SelectTrigger$1.displayName;
var SelectScrollUpButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-4 w-4" })
}));
SelectScrollUpButton.displayName = SelectScrollUpButton$1.displayName;
var SelectScrollDownButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4" })
}));
SelectScrollDownButton.displayName = SelectScrollDownButton$1.displayName;
var SelectContent = import_react.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectPortal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent$1, {
	ref,
	className: cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
	position,
	...props,
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectViewport, {
			className: cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"),
			children
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton, {})
	]
}) }));
SelectContent.displayName = SelectContent$1.displayName;
var SelectLabel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectLabel$1, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", className),
	...props
}));
SelectLabel.displayName = SelectLabel$1.displayName;
var SelectItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem$1, {
	ref,
	className: cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemIndicator, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemText, { children })]
}));
SelectItem.displayName = SelectItem$1.displayName;
var SelectSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectSeparator$1, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
SelectSeparator.displayName = SelectSeparator$1.displayName;
function ParticleCanvas({ modes }) {
	const ref = (0, import_react.useRef)(null);
	const modesRef = (0, import_react.useRef)(modes);
	modesRef.current = modes;
	(0, import_react.useEffect)(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		let w = 0;
		let h = 0;
		let raf = 0;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		const resize = () => {
			w = canvas.width = canvas.offsetWidth * dpr;
			h = canvas.height = canvas.offsetHeight * dpr;
		};
		resize();
		window.addEventListener("resize", resize);
		const particles = [];
		const MAX_PARTICLES = 80;
		const spawn = () => {
			const active = new Set(modesRef.current);
			if (particles.length >= MAX_PARTICLES) return;
			if (active.has("snow")) {
				if (Math.random() < .08) particles.push({
					x: Math.random() * w,
					y: -20,
					vx: (Math.random() - .5) * 1 * dpr,
					vy: (.4 + Math.random() * 1) * dpr,
					r: (3 + Math.random() * 5) * dpr,
					a: .6 + Math.random() * .4,
					kind: "snow",
					seed: Math.random() * 1e3,
					rot: Math.random() * Math.PI * 2,
					rotV: (Math.random() - .5) * .015
				});
			}
			if (active.has("wind")) {
				if (Math.random() < .4) particles.push({
					x: -80 * dpr,
					y: Math.random() * h,
					vx: (6 + Math.random() * 9) * dpr,
					vy: (Math.random() - .5) * .6 * dpr,
					r: (60 + Math.random() * 140) * dpr,
					a: .18 + Math.random() * .2,
					kind: "wind"
				});
				if (Math.random() < .2) particles.push({
					x: -20 * dpr,
					y: Math.random() * h,
					vx: (8 + Math.random() * 6) * dpr,
					vy: (Math.random() - .5) * 1.2 * dpr,
					r: (2 + Math.random() * 3) * dpr,
					a: .5,
					kind: "leaf",
					seed: Math.random() * 1e3
				});
			}
			if (active.has("stars")) {
				if (particles.filter((p) => p.kind === "star").length < 50) particles.push({
					x: Math.random() * w,
					y: Math.random() * h,
					vx: 0,
					vy: 0,
					r: (.5 + Math.random() * 1.8) * dpr,
					a: .3,
					kind: "star",
					seed: Math.random() * 1e3
				});
			}
			if (active.has("mist") && Math.random() < .15) particles.push({
				x: Math.random() * w,
				y: h + 10,
				vx: (Math.random() - .5) * .3 * dpr,
				vy: -(.2 + Math.random() * .4) * dpr,
				r: (3 + Math.random() * 6) * dpr,
				a: .25 + Math.random() * .2,
				kind: "mist"
			});
			if (active.has("shimmer") && Math.random() < .1) particles.push({
				x: Math.random() * w,
				y: h * (.1 + Math.random() * .5),
				vx: (Math.random() - .5) * .3 * dpr,
				vy: -.6 * dpr,
				r: (14 + Math.random() * 32) * dpr,
				a: .18,
				kind: "shimmer"
			});
		};
		const pruneInactive = () => {
			const active = new Set(modesRef.current);
			for (let i = particles.length - 1; i >= 0; i--) {
				const kind = particles[i].kind;
				if (!(kind === "snow" && active.has("snow") || kind === "wind" && active.has("wind") || kind === "star" && active.has("stars") || kind === "mist" && active.has("mist") || kind === "shimmer" && active.has("shimmer"))) particles[i].a *= .9;
			}
		};
		const tick = () => {
			ctx.clearRect(0, 0, w, h);
			spawn();
			pruneInactive();
			const t = performance.now();
			for (let i = particles.length - 1; i >= 0; i--) {
				const p = particles[i];
				if (p.kind === "snow") {
					p.x += Math.sin(t / 700 + (p.seed ?? 0)) * .4 * dpr;
					if (p.rot !== void 0 && p.rotV !== void 0) p.rot += p.rotV;
				}
				p.x += p.vx;
				p.y += p.vy;
				if (p.kind === "star") p.a = .25 + (Math.sin(t / 500 + (p.seed ?? 0)) * .5 + .5) * .6;
				if (p.kind === "shimmer") p.a *= .985;
				if (p.kind === "mist") p.a *= .997;
				if (p.x > w + 200 * dpr || p.y > h + 20 * dpr || p.y < -80 * dpr || p.a < .02) {
					particles.splice(i, 1);
					continue;
				}
				ctx.globalAlpha = Math.min(1, p.a);
				if (p.kind === "snow") {
					const r = p.r;
					ctx.save();
					ctx.translate(p.x, p.y);
					if (p.rot !== void 0) ctx.rotate(p.rot);
					ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
					ctx.lineWidth = Math.max(1, r * .18);
					ctx.lineCap = "round";
					for (let j = 0; j < 6; j++) {
						ctx.beginPath();
						ctx.moveTo(0, 0);
						ctx.lineTo(0, -r);
						ctx.stroke();
						ctx.beginPath();
						ctx.moveTo(0, -r * .5);
						ctx.lineTo(-r * .22, -r * .68);
						ctx.moveTo(0, -r * .5);
						ctx.lineTo(r * .22, -r * .68);
						ctx.stroke();
						ctx.rotate(Math.PI / 3);
					}
					ctx.restore();
				} else if (p.kind === "wind") {
					const g = ctx.createLinearGradient(p.x - p.r, p.y, p.x + p.r, p.y);
					g.addColorStop(0, "rgba(200,230,255,0)");
					g.addColorStop(.5, "rgba(200,235,255,0.95)");
					g.addColorStop(1, "rgba(200,230,255,0)");
					ctx.strokeStyle = g;
					ctx.lineWidth = (1.5 + Math.random() * 1) * dpr;
					ctx.beginPath();
					ctx.moveTo(p.x - p.r, p.y);
					ctx.lineTo(p.x + p.r, p.y);
					ctx.stroke();
				} else if (p.kind === "leaf") {
					ctx.fillStyle = "rgba(134,239,172,0.75)";
					ctx.beginPath();
					const wob = Math.sin(t / 200 + (p.seed ?? 0)) * 3 * dpr;
					ctx.ellipse(p.x, p.y + wob, p.r * 1.6, p.r * .7, Math.sin(t / 300 + (p.seed ?? 0)), 0, Math.PI * 2);
					ctx.fill();
				} else if (p.kind === "star") {
					ctx.fillStyle = "#fef9c3";
					ctx.beginPath();
					ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
					ctx.fill();
				} else if (p.kind === "mist") {
					ctx.fillStyle = "#bae6fd";
					ctx.beginPath();
					ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
					ctx.fill();
				} else if (p.kind === "shimmer") {
					const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
					g.addColorStop(0, "rgba(255,170,80,0.6)");
					g.addColorStop(1, "rgba(255,170,80,0)");
					ctx.fillStyle = g;
					ctx.beginPath();
					ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
					ctx.fill();
				}
			}
			ctx.globalAlpha = 1;
			raf = requestAnimationFrame(tick);
		};
		tick();
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", resize);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref,
		className: "pointer-events-none fixed inset-0 z-0 h-full w-full",
		"aria-hidden": true
	});
}
function Sparkline({ data, color, height = 44 }) {
	if (data.length === 0) return null;
	const w = 100;
	const h = height;
	const min = Math.min(...data);
	const range = Math.max(...data) - min || 1;
	const step = w / (data.length - 1);
	const line = `M ${data.map((v, i) => {
		return `${i * step},${h - (v - min) / range * (h - 4) - 2}`;
	}).join(" L ")}`;
	const area = `${line} L ${w},${h} L 0,${h} Z`;
	const gid = `spg-${color.replace(/[^a-z0-9]/gi, "")}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: `0 0 ${w} ${h}`,
		preserveAspectRatio: "none",
		className: "h-full w-full",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
				id: gid,
				x1: "0",
				y1: "0",
				x2: "0",
				y2: "1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "0%",
					stopColor: color,
					stopOpacity: "0.35"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "100%",
					stopColor: color,
					stopOpacity: "0"
				})]
			}) }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: area,
				fill: `url(#${gid})`
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: line,
				fill: "none",
				stroke: color,
				strokeWidth: "1.5",
				strokeLinecap: "round",
				strokeLinejoin: "round",
				vectorEffect: "non-scaling-stroke"
			})
		]
	});
}
var TABS = [
	{
		key: "dashboard",
		label: "Bảng điều khiển",
		icon: LayoutDashboard
	},
	{
		key: "sensors",
		label: "Dữ liệu cảm biến",
		icon: ChartLine
	},
	{
		key: "schedule",
		label: "Lịch hẹn giờ",
		icon: CalendarClock
	},
	{
		key: "activity",
		label: "Lịch sử hoạt động",
		icon: History
	},
	{
		key: "notifications",
		label: "Thông báo",
		icon: Bell
	},
	{
		key: "health",
		label: "Trạng thái hệ thống",
		icon: HeartPulse
	},
	{
		key: "settings",
		label: "Cài đặt hệ thống",
		icon: Settings
	}
];
var NODES = [
	{
		id: "living",
		name: "Phòng khách",
		chip: "ESP32-S3-Node-01",
		icon: House
	},
	{
		id: "bedroom",
		name: "Phòng ngủ",
		chip: "ESP32-S3-Node-02",
		icon: Moon
	},
	{
		id: "kitchen",
		name: "Nhà bếp",
		chip: "ESP32-C3-Kitchen",
		icon: Sunrise
	}
];
function genSeries(base, amp, n, noise = .4) {
	return Array.from({ length: n }).map((_, i) => {
		const t = i / n * Math.PI * 2;
		return +(base + Math.sin(t) * amp + (Math.random() - .5) * amp * noise).toFixed(1);
	});
}
var HOURS_24 = Array.from({ length: 24 }).map((_, i) => `${String(i).padStart(2, "0")}:00`);
var TEMP_24 = genSeries(28, 4, 24);
var HUMID_24 = genSeries(62, 10, 24);
var LIGHT_24 = Array.from({ length: 24 }).map((_, i) => {
	const t = (i - 6) / 24;
	return Math.max(0, Math.round(600 * Math.sin(t * Math.PI) + (Math.random() - .5) * 80));
});
var DEVICES = [
	"ESP32-S3-Node-01",
	"ESP32-S3-Node-02",
	"ESP32-C3-Kitchen"
];
Array.from({ length: 24 }).map((_, i) => ({
	id: i + 1,
	time: `2026-07-06 ${String(9 + Math.floor(i / 4)).padStart(2, "0")}:${String(i * 15 % 60).padStart(2, "0")}:12`,
	temp: (26 + Math.random() * 6).toFixed(1),
	humid: (55 + Math.random() * 20).toFixed(0),
	light: Math.round(150 + Math.random() * 750),
	device: DEVICES[i % DEVICES.length]
}));
function Dashboard() {
	const [tab, setTab] = (0, import_react.useState)("dashboard");
	const title = TABS.find((t) => t.key === tab).label;
	const tod = useTimeOfDay();
	const { dark, toggle: toggleDark } = useDarkMode();
	const [nodeId, setNodeId] = (0, import_react.useState)(NODES[0].id);
	const node = NODES.find((n) => n.id === nodeId);
	const [paletteOpen, setPaletteOpen] = (0, import_react.useState)(false);
	const [devices, setDevices] = (0, import_react.useState)({
		ac: {
			on: false,
			mode: "manual"
		},
		fan: {
			on: false,
			mode: "manual"
		},
		light: {
			on: false,
			mode: "manual"
		}
	});
	const [sensors, setSensors] = (0, import_react.useState)({
		temp: 0,
		humid: 0,
		light: 0
	});
	const [sensorHistory, setSensorHistory] = (0, import_react.useState)([]);
	const [alerts, setAlerts] = (0, import_react.useState)([]);
	const [readAlertIds, setReadAlertIds] = (0, import_react.useState)(() => {
		if (typeof window !== "undefined") try {
			const stored = window.localStorage.getItem("sh-read-alerts");
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
		return [];
	});
	const saveReadAlertIds = (ids) => {
		setReadAlertIds(ids);
		if (typeof window !== "undefined") try {
			window.localStorage.setItem("sh-read-alerts", JSON.stringify(ids));
		} catch {}
	};
	const markAsRead = (id) => {
		if (!readAlertIds.includes(id)) saveReadAlertIds([...readAlertIds, id]);
	};
	const markAllAsRead = (ids) => {
		const newRead = Array.from(/* @__PURE__ */ new Set([...readAlertIds, ...ids]));
		saveReadAlertIds(newRead);
	};
	const [bellPing, setBellPing] = (0, import_react.useState)(false);
	const [currentUser, setCurrentUser] = (0, import_react.useState)(null);
	const [currentUserId, setCurrentUserId] = (0, import_react.useState)(null);
	const [sessionLoading, setSessionLoading] = (0, import_react.useState)(true);
	const [mobileSidebarOpen, setMobileSidebarOpen] = (0, import_react.useState)(false);
	const [thresholds, setThresholds] = (0, import_react.useState)({
		temp: 30,
		humid: 75,
		light: 200
	});
	const [lastSensorTime, setLastSensorTime] = (0, import_react.useState)(null);
	const [sensorOnline, setSensorOnline] = (0, import_react.useState)(false);
	const [connectionError, setConnectionError] = (0, import_react.useState)(null);
	const ALERT_COOLDOWN_MS = 300 * 1e3;
	const alertCooldownRef = (0, import_react.useRef)({
		temp: 0,
		humid: 0,
		light: 0
	});
	const prevAlertStateRef = (0, import_react.useRef)({
		temp: false,
		humid: false,
		light: false
	});
	const thresholdsRef = (0, import_react.useRef)(thresholds);
	const currentUserIdRef = (0, import_react.useRef)(currentUserId);
	const lastSensorIdRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		thresholdsRef.current = thresholds;
	}, [thresholds]);
	(0, import_react.useEffect)(() => {
		currentUserIdRef.current = currentUserId;
	}, [currentUserId]);
	(0, import_react.useEffect)(() => {
		let active = true;
		const refreshLatestData = async () => {
			if (!active) return;
			try {
				const [{ data: sensorRows, error: sensorError }, { data: devData, error: devError }, { data: ruleData, error: ruleError }] = await Promise.all([
					supabase.from("dulieucambien").select("*").order("thoigian", { ascending: false }).limit(1),
					supabase.from("den").select("*"),
					supabase.from("luat").select("*")
				]);
				if (sensorError) {
					console.error("Lỗi refresh cảm biến:", sensorError);
					return;
				}
				if (sensorRows && sensorRows.length > 0) {
					const latest = sensorRows[0];
					const latestId = Number(latest.iddl);
					if (latestId !== lastSensorIdRef.current) {
						const nextSensors = {
							temp: Number(latest.nhietdo),
							humid: Number(latest.doam),
							light: Number(latest.anhsang)
						};
						setSensors((prev) => {
							if (prev.temp === nextSensors.temp && prev.humid === nextSensors.humid && prev.light === nextSensors.light) return prev;
							return nextSensors;
						});
						setSensorHistory((prev) => {
							if (prev.some((item) => Number(item.iddl) === latestId)) return prev;
							return [latest, ...prev].slice(0, 24);
						});
						setLastSensorTime(new Date(latest.thoigian ?? Date.now()));
						setSensorOnline(true);
						lastSensorIdRef.current = latestId;
					}
				}
				if (!devError && devData) setDevices((prev) => {
					const next = { ...prev };
					devData.forEach((d) => {
						const key = d.idden === 1 ? "ac" : d.idden === 2 ? "fan" : "light";
						next[key] = {
							...next[key],
							on: d.trangthai === 1
						};
					});
					return next;
				});
				if (!ruleError && ruleData) {
					setDevices((prev) => {
						const next = { ...prev };
						ruleData.forEach((r) => {
							const key = r.idden === 1 ? "ac" : r.idden === 2 ? "fan" : "light";
							next[key] = {
								...next[key],
								mode: r.automation ? "auto" : "manual"
							};
						});
						return next;
					});
					setThresholds((prev) => {
						const next = { ...prev };
						ruleData.forEach((r) => {
							const key = r.idden === 1 ? "temp" : r.idden === 2 ? "humid" : "light";
							next[key] = Number(r.nguong);
						});
						return next;
					});
				}
			} catch (err) {
				console.error("Lỗi khi refresh snapshot dữ liệu:", err);
			}
		};
		const loadInitial = async () => {
			try {
				const { data: devData, error: devError } = await supabase.from("den").select("*");
				if (devError) {
					console.error("Lỗi load bảng den:", devError);
					setConnectionError(`Không thể kết nối Supabase: ${devError.message}`);
					toast.error("Lỗi kết nối database", { description: devError.message });
				}
				if (devData) setDevices((prev) => {
					const next = { ...prev };
					devData.forEach((d) => {
						const key = d.idden === 1 ? "ac" : d.idden === 2 ? "fan" : "light";
						next[key] = {
							...next[key],
							on: d.trangthai === 1
						};
					});
					return next;
				});
				const { data: ruleData, error: ruleError } = await supabase.from("luat").select("*");
				if (ruleError) {
					console.error("Lỗi load bảng luat:", ruleError);
					toast.error("Lỗi đọc cấu hình luật", { description: ruleError.message });
				}
				if (ruleData) {
					setDevices((prev) => {
						const next = { ...prev };
						ruleData.forEach((r) => {
							const key = r.idden === 1 ? "ac" : r.idden === 2 ? "fan" : "light";
							next[key] = {
								...next[key],
								mode: r.automation ? "auto" : "manual"
							};
						});
						return next;
					});
					setThresholds((prev) => {
						const next = { ...prev };
						ruleData.forEach((r) => {
							const key = r.idden === 1 ? "temp" : r.idden === 2 ? "humid" : "light";
							next[key] = Number(r.nguong);
						});
						return next;
					});
				}
				const { data: sensorData, error: sensorError } = await supabase.from("dulieucambien").select("*").order("thoigian", { ascending: false }).limit(24);
				if (sensorError) {
					console.error("Lỗi load dữ liệu cảm biến:", sensorError);
					toast.error("Lỗi đọc dữ liệu cảm biến", { description: sensorError.message });
				}
				if (sensorData && sensorData.length > 0) {
					setSensorHistory(sensorData);
					setSensors({
						temp: Number(sensorData[0].nhietdo),
						humid: Number(sensorData[0].doam),
						light: Number(sensorData[0].anhsang)
					});
				}
				const { data: logData } = await supabase.from("nhatkyhoatdong").select("*").order("thoigian", { ascending: false }).limit(15);
				if (logData) {
					const mappedAlerts = logData.filter((l) => l.hanhdong.includes("vượt ngưỡng") || l.hanhdong.includes("Lỗi") || l.hanhdong.includes("Cảnh báo") || l.hanhdong.includes("Mất kết nối")).map((l) => ({
						id: Number(l.idnhatky),
						ts: Date.parse(l.thoigian),
						title: l.hanhdong.includes("vượt ngưỡng") ? "Cảnh báo vượt ngưỡng" : l.hanhdong.includes("Lỗi") ? "Lỗi hệ thống" : "Thông báo cảnh báo",
						detail: l.hanhdong,
						level: l.hanhdong.includes("Lỗi") || l.hanhdong.includes("Mất kết nối") ? "error" : "warn"
					}));
					setAlerts(mappedAlerts);
				}
				const { data: { session } } = await supabase.auth.getSession();
				if (session?.user) {
					const authUser = session.user;
					const { data: profileData } = await supabase.from("nguoidung").select("*").eq("email", authUser.email).maybeSingle();
					if (profileData) {
						setCurrentUser(profileData);
						setCurrentUserId(Number(profileData.idnguoidung) || null);
					} else setCurrentUser({
						hoten: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Người dùng",
						email: authUser.email ?? ""
					});
				}
				if (!connectionError) setConnectionError(null);
			} catch (err) {
				console.error("Lỗi khi tải trạng thái ban đầu:", err);
				const msg = err instanceof Error ? err.message : "Lỗi không xác định";
				setConnectionError(`Không thể kết nối đến database: ${msg}`);
				toast.error("Lỗi kết nối", { description: msg });
			} finally {
				setSessionLoading(false);
			}
		};
		loadInitial();
		refreshLatestData();
		const pollTimer = window.setInterval(() => {
			refreshLatestData();
		}, 5e3);
		const deviceChan = supabase.channel("db-device-changes").on("postgres_changes", {
			event: "UPDATE",
			schema: "public",
			table: "den"
		}, (payload) => {
			const record = payload.new;
			if (!record) return;
			const key = record.idden === 1 ? "ac" : record.idden === 2 ? "fan" : "light";
			const on = record.trangthai === 1;
			setDevices((prev) => {
				const next = { ...prev };
				next[key] = {
					...next[key],
					on
				};
				return next;
			});
		}).subscribe((status) => {
			if (status === "CHANNEL_ERROR") {
				console.error("Realtime channel 'den' error");
				toast.error("Mất kết nối Realtime", { description: "Kênh thiết bị bị ngắt. Đang thử kết nối lại..." });
				refreshLatestData();
			}
		});
		const ruleChan = supabase.channel("db-luat-changes").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "luat"
		}, (payload) => {
			const record = payload.new;
			if (!record) return;
			const mode = record.automation ? "auto" : "manual";
			setDevices((prev) => {
				const next = { ...prev };
				if (record.idden === 1) next.ac = {
					...next.ac,
					mode
				};
				if (record.idden === 2) next.fan = {
					...next.fan,
					mode
				};
				if (record.idden === 3) next.light = {
					...next.light,
					mode
				};
				return next;
			});
			const key = record.idden === 1 ? "temp" : record.idden === 2 ? "humid" : "light";
			setThresholds((prev) => ({
				...prev,
				[key]: Number(record.nguong)
			}));
		}).subscribe((status) => {
			if (status === "CHANNEL_ERROR") {
				console.error("Realtime channel 'luat' error");
				toast.error("Lỗi kênh tự động hóa", { description: "Không thể đồng bộ luật. Đang kết nối lại..." });
			}
		});
		const sensorChan = supabase.channel("db-sensor-changes").on("postgres_changes", {
			event: "INSERT",
			schema: "public",
			table: "dulieucambien"
		}, async (payload) => {
			const record = payload.new;
			if (record) {
				const temp = Number(record.nhietdo);
				const humid = Number(record.doam);
				const light = Number(record.anhsang);
				setSensors({
					temp,
					humid,
					light
				});
				setSensorHistory((prev) => [record, ...prev].slice(0, 24));
				setLastSensorTime(/* @__PURE__ */ new Date());
				setSensorOnline(true);
				const now = Date.now();
				const currentThresholds = thresholdsRef.current;
				const curState = {
					temp: temp >= (currentThresholds.temp || 30),
					humid: humid >= (currentThresholds.humid || 75),
					light: light < (currentThresholds.light || 200)
				};
				const prev = prevAlertStateRef.current;
				const cooldown = alertCooldownRef.current;
				const checks = [
					{
						key: "temp",
						triggered: curState.temp,
						msg: `Nhiệt độ ${temp}°C vượt ngưỡng ${currentThresholds.temp || 30}°C`
					},
					{
						key: "humid",
						triggered: curState.humid,
						msg: `Độ ẩm ${humid}% vượt ngưỡng ${currentThresholds.humid || 75}%`
					},
					{
						key: "light",
						triggered: curState.light,
						msg: `Ánh sáng ${light} lx dưới ngưỡng ${currentThresholds.light || 200} lx`
					}
				];
				const localAlerts = [];
				for (const c of checks) {
					if (!c.triggered) {
						prev[c.key] = false;
						continue;
					}
					const isEdge = !prev[c.key];
					const isCooldownOver = now - (cooldown[c.key] || 0) >= ALERT_COOLDOWN_MS;
					if (isEdge || isCooldownOver) {
						localAlerts.push({
							id: Date.now() + Math.random(),
							ts: Date.now(),
							title: "Cảnh báo vượt ngưỡng",
							detail: c.msg,
							level: "warn"
						});
						cooldown[c.key] = now;
					}
					prev[c.key] = true;
				}
				if (localAlerts.length > 0) {
					setAlerts((prevAlerts) => {
						return [...localAlerts, ...prevAlerts].slice(0, 15);
					});
					setBellPing(true);
					setTimeout(() => setBellPing(false), 2e3);
					localAlerts.forEach((alert) => {
						toast(alert.title, {
							description: alert.detail,
							className: "!border-amber-200"
						});
					});
				}
			}
		}).subscribe((status) => {
			if (status === "CHANNEL_ERROR") {
				console.error("Realtime channel 'dulieucambien' error");
				toast.error("Lỗi kết nối cảm biến", { description: "Mất kết nối nhận dữ liệu trực tiếp từ ESP32!" });
				refreshLatestData();
			}
		});
		const logChan = supabase.channel("db-log-changes").on("postgres_changes", {
			event: "INSERT",
			schema: "public",
			table: "nhatkyhoatdong"
		}, (payload) => {
			const record = payload.new;
			if (record && (record.hanhdong.includes("vượt ngưỡng") || record.hanhdong.includes("Lỗi") || record.hanhdong.includes("Cảnh báo") || record.hanhdong.includes("Mất kết nối"))) {
				const newAlert = {
					id: Number(record.idnhatky),
					ts: Date.parse(record.thoigian),
					title: record.hanhdong.includes("vượt ngưỡng") ? "Cảnh báo vượt ngưỡng" : record.hanhdong.includes("Lỗi") ? "Lỗi hệ thống" : "Thông báo cảnh báo",
					detail: record.hanhdong,
					level: record.hanhdong.includes("Lỗi") || record.hanhdong.includes("Mất kết nối") ? "error" : "warn"
				};
				setAlerts((prev) => [newAlert, ...prev].slice(0, 8));
				setBellPing(true);
				setTimeout(() => setBellPing(false), 2e3);
				toast(newAlert.title, {
					description: newAlert.detail,
					className: newAlert.level === "error" ? "!border-rose-200" : "!border-amber-200"
				});
			}
		}).subscribe((status) => {
			if (status === "CHANNEL_ERROR") console.error("Realtime channel 'nhatkyhoatdong' error");
		});
		const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
			setSessionLoading(true);
			if (session?.user) {
				const authUser = session.user;
				const { data: profileData } = await supabase.from("nguoidung").select("*").eq("email", authUser.email).maybeSingle();
				if (profileData) {
					setCurrentUser(profileData);
					setCurrentUserId(Number(profileData.idnguoidung) || null);
				} else {
					setCurrentUser({
						hoten: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "Người dùng",
						email: authUser.email ?? ""
					});
					setCurrentUserId(null);
				}
			} else {
				setCurrentUser(null);
				setCurrentUserId(null);
			}
			setSessionLoading(false);
		});
		return () => {
			active = false;
			window.clearInterval(pollTimer);
			supabase.removeChannel(deviceChan);
			supabase.removeChannel(ruleChan);
			supabase.removeChannel(sensorChan);
			supabase.removeChannel(logChan);
			subscription.unsubscribe();
		};
	}, []);
	(0, import_react.useEffect)(() => {
		if (!lastSensorTime) return;
		setSensorOnline(true);
		const timer = setTimeout(() => {
			setSensorOnline(false);
		}, 3e4);
		return () => clearTimeout(timer);
	}, [lastSensorTime]);
	const handleDeviceToggle = async (key, idden, on) => {
		if (devices[key].mode === "auto") {
			toast.error("Thiết bị đang ở chế độ Tự động. Hãy tắt chế độ Tự động trước khi điều khiển thủ công!");
			return;
		}
		setDevices((prev) => ({
			...prev,
			[key]: {
				...prev[key],
				on
			}
		}));
		try {
			const { error } = await supabase.from("den").update({ trangthai: on ? 1 : 0 }).eq("idden", idden);
			if (error) throw error;
			const deviceName = key === "ac" ? "Điều hòa" : key === "fan" ? "Quạt" : "Đèn";
			await supabase.from("nhatkyhoatdong").insert([{
				idden,
				hanhdong: `${on ? "Bật" : "Tắt"} ${deviceName} thủ công từ Web`
			}]);
			toast.success(`Đã gửi lệnh ${on ? "BẬT" : "TẮT"} ${deviceName}`);
		} catch (err) {
			setDevices((prev) => ({
				...prev,
				[key]: {
					...prev[key],
					on: !on
				}
			}));
			toast.error(`Lỗi điều khiển thiết bị: ${err.message}`);
		}
	};
	const handleDeviceModeChange = async (key, idden, mode) => {
		const prevMode = devices[key].mode;
		setDevices((prev) => ({
			...prev,
			[key]: {
				...prev[key],
				mode
			}
		}));
		try {
			const isAuto = mode === "auto";
			const { error } = await supabase.from("luat").update({ automation: isAuto }).eq("idden", idden);
			if (error) throw error;
			toast.success(`Đã chuyển ${key === "ac" ? "Điều hòa" : key === "fan" ? "Quạt" : "Đèn"} sang chế độ ${isAuto ? "Tự động" : "Thủ công"}`);
		} catch (err) {
			setDevices((prev) => ({
				...prev,
				[key]: {
					...prev[key],
					mode: prevMode
				}
			}));
			toast.error(`Lỗi đổi chế độ: ${err.message}`);
		}
	};
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setPaletteOpen((o) => !o);
			} else if (e.key === "Escape") setPaletteOpen(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
	const particleModes = (0, import_react.useMemo)(() => {
		const m = [];
		if (devices.ac.on) m.push("snow");
		if (devices.fan.on) m.push("wind");
		if (sensors.temp >= 30) m.push("shimmer");
		if (sensors.light < 200) m.push("stars");
		if (sensors.humid >= 75) m.push("mist");
		return m;
	}, [devices, sensors]);
	const ambient = (0, import_react.useMemo)(() => {
		if (sensors.light < 200) return "linear-gradient(180deg,rgba(15,23,42,0.35),rgba(15,23,42,0.1))";
		if (sensors.temp >= 30) return "linear-gradient(180deg,rgba(255,140,80,0.12),transparent)";
		if (devices.ac.on) return "linear-gradient(180deg,rgba(120,190,255,0.18),transparent)";
		return "transparent";
	}, [sensors, devices]);
	const bg = dark ? tod.darkGradient : tod.gradient;
	if (sessionLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn("min-h-screen grid place-items-center bg-[radial-gradient(1200px_600px_at_-10%_-10%,#dbe7ff_0%,transparent_60%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)]", dark && "bg-slate-950 text-slate-100"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col items-center gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-sm font-medium text-slate-500",
				children: "Đang kết nối cổng IoT..."
			})]
		})
	});
	if (!currentUser) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LandingPage, {
		dark,
		toggleDark
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("relative min-h-screen transition-[background] duration-[1500ms]", dark ? "text-slate-100" : "text-slate-800"),
		style: { background: bg },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ParticleCanvas, { modes: particleModes }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "pointer-events-none fixed inset-0 z-0 transition-[background] duration-1000",
				style: { background: ambient }
			}),
			connectionError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-3 bg-rose-600 px-4 py-2.5 text-white text-sm font-medium shadow-lg",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-4 w-4 shrink-0" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "truncate",
						children: connectionError
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							setConnectionError(null);
							window.location.reload();
						},
						className: "ml-2 shrink-0 rounded bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30 transition-colors",
						children: "Thử lại"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("relative z-10 flex min-h-screen", connectionError && "pt-10"),
				children: [
					mobileSidebarOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity duration-300",
						onClick: () => setMobileSidebarOpen(false)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sidebar, {
						tab,
						setTab,
						todLabel: tod.label,
						node,
						setNodeId,
						dark,
						alertCount: alerts.filter((a) => !readAlertIds.includes(a.id)).length,
						sensorOnline,
						onCloseMobile: () => setMobileSidebarOpen(false),
						className: cn("fixed inset-y-0 left-0 z-50 h-full border-r shadow-2xl transition-transform duration-300 transform lg:hidden", mobileSidebarOpen ? "translate-x-0" : "-translate-x-full", dark ? "bg-slate-950 border-white/10" : "bg-white border-slate-200")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sidebar, {
						tab,
						setTab,
						todLabel: tod.label,
						node,
						setNodeId,
						dark,
						alertCount: alerts.filter((a) => !readAlertIds.includes(a.id)).length,
						sensorOnline,
						className: "hidden lg:flex sticky top-0 h-screen"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
						className: "flex-1 min-w-0 flex flex-col",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {
							title,
							nodeName: node.name,
							alerts,
							readAlertIds,
							onMarkAsRead: markAsRead,
							onMarkAllAsRead: markAllAsRead,
							bellPing,
							onOpen: () => setBellPing(false),
							dark,
							toggleDark,
							openPalette: () => setPaletteOpen(true),
							currentUser,
							onMenuClick: () => setMobileSidebarOpen(true),
							lastSensorTime
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 p-3 sm:p-6 lg:p-8",
							children: [
								tab === "dashboard" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardTab, {
									devices,
									onToggle: handleDeviceToggle,
									onMode: handleDeviceModeChange,
									sensors,
									sensorHistory,
									alerts,
									nodeName: node.name,
									thresholds
								}),
								tab === "sensors" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SensorsTab, {}),
								tab === "schedule" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScheduleTab, {}),
								tab === "activity" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivityTab, {}),
								tab === "notifications" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotificationsTab, {
									readAlertIds,
									onMarkAsRead: markAsRead,
									onMarkAllAsRead: markAllAsRead
								}),
								tab === "health" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HealthTab, {}),
								tab === "settings" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsTab, {})
							]
						})]
					})
				]
			})
		]
	});
}
function Sidebar({ tab, setTab, todLabel, node, setNodeId, dark, alertCount, className, onCloseMobile, sensorOnline }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: cn("flex w-64 shrink-0 flex-col gap-3 p-4 border-r backdrop-blur-xl overflow-y-auto", dark ? "border-white/10 bg-slate-950/40" : "border-white/60 bg-white/60", className),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3 px-2 pt-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-500/30",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { className: "h-5 w-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("text-[11px] font-medium uppercase tracking-wider", dark ? "text-slate-400" : "text-slate-500"),
						children: "Cổng IoT"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("truncate text-sm font-semibold", dark ? "text-white" : "text-slate-900"),
						children: "Node ESP32-S3"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("rounded-2xl border p-3", dark ? "border-white/10 bg-white/5" : "border-white/70 bg-white/70"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn("mb-2 text-[11px] font-semibold uppercase tracking-wider", dark ? "text-slate-400" : "text-slate-500"),
					children: "Node / Phòng"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: node.id,
					onValueChange: setNodeId,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
						className: cn("h-10 text-sm", dark ? "bg-white/10 text-white border-white/10" : "bg-white/80"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: NODES.map((n) => {
						const Ic = n.icon;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: n.id,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ic, { className: "h-3.5 w-3.5 text-indigo-500" }),
									n.name,
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-slate-400",
										children: ["· ", n.chip]
									})
								]
							})
						}, n.id);
					}) })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "flex flex-col gap-1",
				children: TABS.map(({ key, label, icon: Icon }) => {
					const active = tab === key;
					const showBadge = key === "notifications" && alertCount > 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							setTab(key);
							onCloseMobile?.();
						},
						className: cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all", active ? "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30" : dark ? "text-slate-300 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-white/80 hover:text-slate-900"),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: cn("h-4 w-4 shrink-0", active ? "text-white" : dark ? "text-slate-400" : "text-slate-500") }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate flex-1",
								children: label
							}),
							showBadge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cn("ml-auto grid min-w-5 h-5 place-items-center rounded-full px-1 text-[10px] font-bold", active ? "bg-white/25 text-white" : "bg-rose-500 text-white"),
								children: alertCount > 99 ? "99+" : alertCount
							})
						]
					}, key);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("rounded-2xl border p-3", dark ? "border-white/10 bg-white/5 text-slate-200" : "border-white/70 bg-gradient-to-br from-indigo-50/70 to-sky-50/70 text-slate-700"),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 font-medium text-xs",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "h-3.5 w-3.5" }),
						" ",
						todLabel
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: cn("mt-0.5 text-[10px]", dark ? "text-slate-400" : "text-slate-500"),
					children: "Giao diện theo giờ hệ thống"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("rounded-2xl border p-3 shadow-sm backdrop-blur", dark ? "border-white/10 bg-white/5" : "border-white/70 bg-white/70"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("mb-3 text-[11px] font-semibold uppercase tracking-wider", dark ? "text-slate-400" : "text-slate-500"),
						children: "Trạng thái kết nối"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, {
						label: "Supabase",
						online: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, {
						label: "MQTT Broker",
						online: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, {
						label: node.chip,
						online: !!sensorOnline
					})
				]
			})
		]
	});
}
function StatusRow({ label, online }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between py-1.5 text-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-slate-600",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex items-center gap-1.5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("relative h-2 w-2 rounded-full", online ? "bg-emerald-500" : "bg-rose-500"),
				children: online && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 animate-ping rounded-full bg-emerald-500 opacity-60" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("text-xs font-medium", online ? "text-emerald-600" : "text-rose-600"),
				children: online ? "Online" : "Offline"
			})]
		})]
	});
}
function Header({ title, nodeName, alerts, readAlertIds, onMarkAsRead, onMarkAllAsRead, bellPing, onOpen, dark, toggleDark, openPalette, currentUser, onMenuClick, lastSensorTime }) {
	const unreadAlerts = alerts.filter((a) => !readAlertIds.includes(a.id));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: cn("sticky top-0 z-20 flex items-center gap-3 border-b px-6 py-4 backdrop-blur-xl lg:px-8", dark ? "border-white/10 bg-slate-950/40" : "border-white/60 bg-white/60"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: onMenuClick,
				"aria-label": "Mở menu",
				className: cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl border shadow-sm transition lg:hidden cursor-pointer", dark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-white/70 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "h-5 w-5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: cn("truncate text-lg font-semibold sm:text-xl", dark ? "text-white" : "text-slate-900"),
						children: title
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
						className: "hidden md:inline-flex rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-100",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(House, { className: "mr-1 h-3 w-3" }),
							" ",
							nodeName
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: cn("hidden text-xs sm:block", dark ? "text-slate-400" : "text-slate-500"),
					children: lastSensorTime ? `Cập nhật lần cuối: ${lastSensorTime.toLocaleTimeString("vi-VN", {
						hour: "2-digit",
						minute: "2-digit",
						second: "2-digit"
					})}` : "Chưa nhận dữ liệu cảm biến"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: openPalette,
				className: cn("hidden md:inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-sm transition", dark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-white/70 bg-white/80 text-slate-500 hover:bg-white"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-3.5 w-3.5" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Tìm nhanh…" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("kbd", {
						className: cn("ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-medium", dark ? "bg-white/10" : "bg-slate-100 text-slate-500"),
						children: "Ctrl K"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: toggleDark,
				"aria-label": "Chuyển giao diện",
				className: cn("grid h-10 w-10 place-items-center rounded-xl border shadow-sm transition", dark ? "border-white/10 bg-white/5 text-amber-300 hover:bg-white/10" : "border-white/70 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900"),
				children: dark ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "h-4 w-4" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, {
				onOpenChange: (o) => o && onOpen(),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						className: cn("relative grid h-10 w-10 place-items-center rounded-xl border border-white/70 bg-white/80 text-slate-600 shadow-sm transition hover:bg-white hover:text-slate-900 cursor-pointer", bellPing && "animate-[bell-shake_0.6s_ease-in-out]"),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4" }), unreadAlerts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white",
							children: [unreadAlerts.length, bellPing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 animate-ping rounded-full bg-rose-500 opacity-70" })]
						})]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
					align: "end",
					className: "w-80",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuLabel, {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Cảnh báo gần đây" }), unreadAlerts.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: (e) => {
									e.preventDefault();
									e.stopPropagation();
									onMarkAllAsRead(unreadAlerts.map((a) => a.id));
								},
								className: "text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-semibold cursor-pointer border-0 bg-transparent p-0 outline-none",
								children: "Đọc tất cả"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
						alerts.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "px-3 py-4 text-center text-xs text-slate-500",
							children: "Chưa có cảnh báo"
						}),
						alerts.slice(0, 6).map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertItem, {
							alert: a,
							isRead: readAlertIds.includes(a.id),
							onMark: () => onMarkAsRead(a.id)
						}, a.id))
					]
				})]
			}),
			currentUser ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					className: "flex items-center gap-3 rounded-xl border border-white/70 bg-white/80 py-1.5 pl-1.5 pr-3 shadow-sm transition hover:bg-white cursor-pointer",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-400 text-white",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-4 w-4" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "hidden text-left sm:block",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-medium leading-tight text-slate-900",
							children: currentUser.hoten
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-[11px] leading-tight text-slate-500",
							children: currentUser.email
						})]
					})]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
				align: "end",
				className: "w-56",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuLabel, { children: "Tài khoản" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/profile",
							className: "cursor-pointer",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleUser, { className: "mr-2 h-4 w-4" }), " Hồ sơ"]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuItem, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/profile",
							className: "cursor-pointer",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "mr-2 h-4 w-4" }), " Cài đặt tài khoản"]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuSeparator, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
						onClick: async () => {
							await supabase.auth.signOut();
							toast.success("Đã đăng xuất thành công!");
						},
						className: "text-rose-600 focus:text-rose-600 cursor-pointer",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "mr-2 h-4 w-4" }), " Đăng xuất"]
					})
				]
			})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				asChild: true,
				className: "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20 hover:opacity-90 cursor-pointer",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/login",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "mr-2 h-4 w-4" }), " Đăng nhập"]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: `
        @keyframes bell-shake {
          0%,100% { transform: rotate(0); }
          20% { transform: rotate(-15deg); }
          40% { transform: rotate(12deg); }
          60% { transform: rotate(-8deg); }
          80% { transform: rotate(6deg); }
        }
        @keyframes breathing {
          0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.0), 0 10px 40px -20px rgba(30,41,59,0.25); }
          50% { box-shadow: 0 0 22px 4px var(--glow, rgba(99,102,241,0.35)), 0 10px 40px -20px rgba(30,41,59,0.25); }
        }
        @keyframes wind-sway {
          0%,100% { transform: translateX(0) rotate(-8deg); }
          25% { transform: translateX(3px) rotate(0deg); }
          50% { transform: translateX(0) rotate(8deg); }
          75% { transform: translateX(-3px) rotate(0deg); }
        }
      ` })
		]
	});
}
function AlertItem({ alert, isRead, onMark }) {
	const rel = useRelativeTime(alert.ts);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
		className: cn("flex flex-col items-start gap-0.5 cursor-pointer transition-colors duration-200", isRead ? "opacity-60" : "bg-indigo-50/20 font-semibold"),
		onClick: (e) => {
			onMark();
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex w-full items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("text-sm font-medium", isRead ? "text-slate-500" : alert.level === "error" ? "text-rose-600 font-semibold" : "text-amber-600 font-semibold"),
				children: alert.title
			}), !isRead && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 ml-2" })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "text-xs text-slate-500 leading-normal",
			children: [
				rel,
				" · ",
				alert.detail
			]
		})]
	});
}
function GlassCard({ className, children, style }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		style,
		className: cn("rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_10px_40px_-20px_rgba(30,41,59,0.25)] backdrop-blur-xl", className),
		children
	});
}
function DashboardTab({ devices, onToggle, onMode, sensors, sensorHistory, alerts, nodeName, thresholds }) {
	const tempA = useAnimatedNumber(sensors.temp);
	const humidA = useAnimatedNumber(sensors.humid);
	const lightA = useAnimatedNumber(sensors.light);
	const sensorCards = [
		{
			key: "temp",
			label: "Nhiệt độ",
			value: tempA.toFixed(1),
			unit: "°C",
			icon: Thermometer,
			alert: sensors.temp >= (thresholds?.temp || 30),
			color: "from-rose-500 to-orange-400"
		},
		{
			key: "humid",
			label: "Độ ẩm",
			value: humidA.toFixed(0),
			unit: "%",
			icon: Droplets,
			alert: sensors.humid >= (thresholds?.humid || 75),
			color: "from-sky-500 to-cyan-400"
		},
		{
			key: "light",
			label: "Ánh sáng",
			value: Math.round(lightA).toString(),
			unit: "lx",
			icon: Sun,
			alert: sensors.light < (thresholds?.light || 200),
			color: "from-amber-400 to-yellow-300"
		}
	];
	const latestAlert = alerts.find((a) => a.level === "error");
	const chartData = (0, import_react.useMemo)(() => {
		if (sensorHistory.length === 0) return HOURS_24.map((time, i) => ({
			time,
			temp: TEMP_24[i],
			humid: HUMID_24[i],
			light: LIGHT_24[i]
		}));
		return [...sensorHistory].reverse().map((h) => {
			return {
				time: new Date(h.thoigian).toLocaleTimeString("vi-VN", {
					hour: "2-digit",
					minute: "2-digit"
				}),
				temp: Number(h.nhietdo),
				humid: Number(h.doam),
				light: Number(h.anhsang)
			};
		});
	}, [sensorHistory]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			latestAlert && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-gradient-to-r from-rose-50 to-orange-50 p-4 text-rose-800 shadow-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "mt-0.5 h-5 w-5 shrink-0 text-rose-600 animate-pulse" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-semibold",
							children: latestAlert.title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-rose-700/80",
							children: [latestAlert.detail, " · Hệ thống đã phản ứng tự động."]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						className: "text-rose-700 hover:bg-rose-100",
						children: "Bỏ qua"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-3 gap-3 sm:gap-5",
				children: sensorCards.map((s) => {
					const Icon = s.icon;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, {
						className: "p-3 sm:p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-2 sm:hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: cn("grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", s.color),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-tight", s.alert ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"),
									children: s.alert ? "⚠ Vượt" : "✓ OK"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] text-slate-500",
								children: s.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline gap-0.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xl font-bold tracking-tight text-slate-900 tabular-nums",
									children: s.value
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium text-slate-500",
									children: s.unit
								})]
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "hidden sm:block",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: cn("grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", s.color),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									className: cn("rounded-full border-transparent text-xs font-medium", s.alert ? "bg-rose-100 text-rose-700 hover:bg-rose-100" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"),
									children: s.alert ? "Vượt ngưỡng" : "Bình thường"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-6",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-sm text-slate-500",
									children: s.label
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 flex items-baseline gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-4xl font-bold tracking-tight text-slate-900 tabular-nums",
										children: s.value
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-base font-medium text-slate-500",
										children: s.unit
									})]
								})]
							})]
						})]
					}, s.key);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-3 gap-3 sm:gap-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeviceCard, {
						name: "Điều hòa",
						icon: Wind,
						gradient: "from-sky-500 to-indigo-500",
						glow: "rgba(56,189,248,0.55)",
						state: devices.ac,
						onToggle: (on) => onToggle("ac", 1, on),
						onMode: (mode) => onMode("ac", 1, mode),
						acBreeze: devices.ac.on
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeviceCard, {
						name: "Quạt",
						icon: Fan,
						gradient: "from-emerald-500 to-teal-400",
						glow: "rgba(16,185,129,0.5)",
						state: devices.fan,
						onToggle: (on) => onToggle("fan", 2, on),
						onMode: (mode) => onMode("fan", 2, mode),
						spinIcon: devices.fan.on
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DeviceCard, {
						name: "Đèn",
						icon: Lightbulb,
						gradient: "from-amber-400 to-orange-400",
						glow: "rgba(251,191,36,0.7)",
						state: devices.light,
						onToggle: (on) => onToggle("light", 3, on),
						onMode: (mode) => onMode("light", 3, mode),
						lightHalo: devices.light.on
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-base font-semibold text-slate-900",
					children: "Biểu đồ cảm biến 24h"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-slate-500",
					children: "Nhiệt độ, độ ẩm và ánh sáng theo thời gian"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2 text-xs",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendChip, {
							color: "#ef4444",
							label: "Nhiệt độ (°C)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendChip, {
							color: "#0ea5e9",
							label: "Độ ẩm (%)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegendChip, {
							color: "#f59e0b",
							label: "Ánh sáng (lx)"
						})
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-72 w-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
						data: chartData,
						margin: {
							top: 10,
							right: 20,
							left: -10,
							bottom: 0
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
								strokeDasharray: "3 3",
								stroke: "#e2e8f0",
								vertical: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "time",
								tick: {
									fontSize: 11,
									fill: "#64748b"
								},
								axisLine: false,
								tickLine: false,
								interval: 2
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								tick: {
									fontSize: 11,
									fill: "#64748b"
								},
								axisLine: false,
								tickLine: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: {
								borderRadius: 12,
								border: "1px solid rgba(255,255,255,0.7)",
								background: "rgba(255,255,255,0.95)",
								boxShadow: "0 10px 30px -10px rgba(0,0,0,0.2)",
								fontSize: 12
							} }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "monotone",
								dataKey: "temp",
								stroke: "#ef4444",
								strokeWidth: 2.5,
								dot: false,
								name: "Nhiệt độ"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "monotone",
								dataKey: "humid",
								stroke: "#0ea5e9",
								strokeWidth: 2.5,
								dot: false,
								name: "Độ ẩm"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								type: "monotone",
								dataKey: "light",
								stroke: "#f59e0b",
								strokeWidth: 2.5,
								dot: false,
								name: "Ánh sáng"
							})
						]
					})
				})
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ForecastCard, {
				sensors,
				nodeName
			})
		]
	});
}
function LegendChip({ color, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-slate-600 shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "h-2 w-2 rounded-full",
			style: { backgroundColor: color }
		}), label]
	});
}
function DeviceCard({ name, icon: Icon, gradient, glow, state, onToggle, onMode, spinIcon, lightHalo, acBreeze }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative",
		style: state.on ? {
			["--glow"]: glow,
			animation: "breathing 3s ease-in-out infinite",
			borderRadius: "1.5rem"
		} : void 0,
		children: [lightHalo && state.on && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pointer-events-none absolute -inset-6 rounded-[2rem] blur-2xl opacity-70 animate-pulse",
			style: { background: "radial-gradient(circle at center, rgba(251,191,36,0.55), transparent 70%)" }
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, {
			className: "relative p-3 sm:p-5",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center gap-2 sm:hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md transition", gradient, !state.on && "opacity-40 grayscale"),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
							className: cn("h-4 w-4", spinIcon && "animate-spin", !spinIcon && !acBreeze && state.on && "animate-pulse"),
							style: {
								...spinIcon ? { animationDuration: "1.4s" } : {},
								...acBreeze ? { animation: "wind-sway 1.6s ease-in-out infinite" } : {}
							}
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs font-semibold text-slate-900 leading-tight",
							children: name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: cn("text-[10px] font-medium", state.on ? "text-emerald-600" : "text-slate-400"),
							children: state.on ? "BẬT" : "TẮT"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: state.on,
						onCheckedChange: onToggle
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-full grid grid-cols-2 gap-1 rounded-lg bg-slate-100/80 p-0.5",
						children: ["manual", "auto"].map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => onMode(m),
							className: cn("rounded-md py-1 text-[10px] font-medium transition-all", state.mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"),
							children: m === "manual" ? "TC" : "TĐ"
						}, m))
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "hidden sm:block",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: cn("grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition", gradient, !state.on && "opacity-40 grayscale"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
								className: cn("h-5 w-5", spinIcon && "animate-spin", !spinIcon && !acBreeze && state.on && "animate-pulse"),
								style: {
									...spinIcon ? { animationDuration: "1.4s" } : {},
									...acBreeze ? { animation: "wind-sway 1.6s ease-in-out infinite" } : {}
								}
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-semibold text-slate-900",
							children: name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: cn("mt-0.5 text-xs font-medium", state.on ? "text-emerald-600" : "text-slate-400"),
							children: state.on ? "● Đang BẬT" : "○ Đang TẮT"
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: state.on,
						onCheckedChange: onToggle
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100/80 p-1",
					children: ["manual", "auto"].map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => onMode(m),
						className: cn("rounded-lg py-1.5 text-xs font-medium transition-all", state.mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"),
						children: m === "manual" ? "Thủ công" : "Tự động"
					}, m))
				})]
			})]
		})]
	});
}
function SensorsTab() {
	const [range, setRange] = (0, import_react.useState)("today");
	const [deviceFilter, setDeviceFilter] = (0, import_react.useState)("all");
	const [history, setHistory] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [currentPage, setCurrentPage] = (0, import_react.useState)(1);
	const [pageSize, setPageSize] = (0, import_react.useState)(10);
	(0, import_react.useEffect)(() => {
		async function fetchHistory() {
			setLoading(true);
			try {
				let limit = 100;
				if (range === "7d") limit = 500;
				if (range === "30d") limit = 1e3;
				const { data, error } = await supabase.from("dulieucambien").select("*").order("thoigian", { ascending: false }).limit(limit);
				if (data) setHistory(data);
			} catch (e) {
				console.error("Lỗi khi tải lịch sử cảm biến:", e);
			}
			setLoading(false);
		}
		fetchHistory();
		const channel = supabase.channel("sensors-tab-realtime").on("postgres_changes", {
			event: "INSERT",
			schema: "public",
			table: "dulieucambien"
		}, (payload) => {
			setHistory((prev) => [payload.new, ...prev].slice(0, 100));
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [range]);
	const stats = (0, import_react.useMemo)(() => {
		if (history.length === 0) return {
			temp: {
				min: "0",
				max: "0",
				avg: "0"
			},
			humid: {
				min: "0",
				max: "0",
				avg: "0"
			},
			light: {
				min: "0",
				max: "0",
				avg: "0"
			}
		};
		const temps = history.map((h) => Number(h.nhietdo));
		const humids = history.map((h) => Number(h.doam));
		const lights = history.map((h) => Number(h.anhsang));
		const s = (arr) => ({
			min: Math.min(...arr).toFixed(1),
			max: Math.max(...arr).toFixed(1),
			avg: (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
		});
		return {
			temp: s(temps),
			humid: s(humids),
			light: s(lights)
		};
	}, [history]);
	const sparkData = (0, import_react.useMemo)(() => {
		const sliced = history.slice(0, 24).reverse();
		return {
			temp: sliced.map((h) => Number(h.nhietdo)),
			humid: sliced.map((h) => Number(h.doam)),
			light: sliced.map((h) => Number(h.anhsang))
		};
	}, [history]);
	const comboData = (0, import_react.useMemo)(() => {
		return [...history].slice(0, 24).reverse().map((h) => {
			const t = new Date(h.thoigian);
			return {
				label: range === "today" ? t.toLocaleTimeString("vi-VN", {
					hour: "2-digit",
					minute: "2-digit"
				}) : t.toLocaleDateString("vi-VN", {
					month: "numeric",
					day: "numeric"
				}),
				temp: Number(h.nhietdo),
				humid: Number(h.doam),
				light: Number(h.anhsang)
			};
		});
	}, [history, range]);
	const filtered = (0, import_react.useMemo)(() => {
		const mapped = history.map((h) => ({
			id: Number(h.iddl),
			time: new Date(h.thoigian).toLocaleString("vi-VN"),
			rawTime: h.thoigian,
			temp: Number(h.nhietdo).toFixed(1),
			humid: Number(h.doam).toFixed(0),
			light: Math.round(Number(h.anhsang)),
			device: h.cambien || "ESP32"
		}));
		return deviceFilter === "all" ? mapped : mapped.filter((r) => r.device === deviceFilter);
	}, [history, deviceFilter]);
	(0, import_react.useEffect)(() => {
		setCurrentPage(1);
	}, [deviceFilter, range]);
	const paginatedData = (0, import_react.useMemo)(() => {
		const start = (currentPage - 1) * pageSize;
		return filtered.slice(start, start + pageSize);
	}, [
		filtered,
		currentPage,
		pageSize
	]);
	const totalPages = Math.ceil(filtered.length / pageSize);
	const exportCSV = () => {
		const header = "﻿STT,Date,Time,Temp (C),Humidity (%),Light (lx),Device\n";
		const rows = filtered.map((r) => {
			const d = new Date(r.rawTime);
			let dateStr = "";
			let timeStr = "";
			if (!isNaN(d.getTime())) {
				const y = d.getFullYear();
				const mo = String(d.getMonth() + 1).padStart(2, "0");
				const day = String(d.getDate()).padStart(2, "0");
				const h = String(d.getHours()).padStart(2, "0");
				const min = String(d.getMinutes()).padStart(2, "0");
				const s = String(d.getSeconds()).padStart(2, "0");
				dateStr = `${day}/${mo}/${y}`;
				timeStr = `${h}:${min}:${s}`;
			} else {
				dateStr = r.time;
				timeStr = "";
			}
			return `${r.id},${dateStr},${timeStr},${r.temp},${r.humid},${r.light},${r.device}`;
		}).join("\n");
		const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const now = /* @__PURE__ */ new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, "0");
		const day = String(now.getDate()).padStart(2, "0");
		const h = String(now.getHours()).padStart(2, "0");
		const min = String(now.getMinutes()).padStart(2, "0");
		const a = document.createElement("a");
		a.href = url;
		a.download = `lich-su-do-dac-${y}${m}${day}-${h}${min}.csv`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("Đã xuất file CSV chuẩn Excel thành công!");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 gap-4 md:grid-cols-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniChart, {
						title: "Nhiệt độ 24h",
						data: sparkData.temp.length ? sparkData.temp : TEMP_24,
						color: "#ef4444",
						unit: "°C",
						stats: stats.temp,
						icon: Thermometer
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniChart, {
						title: "Độ ẩm 24h",
						data: sparkData.humid.length ? sparkData.humid : HUMID_24,
						color: "#0ea5e9",
						unit: "%",
						stats: stats.humid,
						icon: Droplets
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniChart, {
						title: "Ánh sáng 24h",
						data: sparkData.light.length ? sparkData.light : LIGHT_24,
						color: "#f59e0b",
						unit: "lx",
						stats: stats.light,
						icon: Sun
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-base font-semibold text-slate-900",
					children: "So sánh xu hướng"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-slate-500",
					children: "Tổng hợp 3 cảm biến theo khoảng thời gian"
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "inline-flex rounded-xl bg-slate-100/80 p-1 text-xs",
					children: [
						"today",
						"7d",
						"30d"
					].map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setRange(r),
						className: cn("rounded-lg px-3 py-1.5 font-medium transition", range === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"),
						children: r === "today" ? "Hôm nay" : r === "7d" ? "7 ngày" : "30 ngày"
					}, r))
				})]
			}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-center py-12 text-sm text-slate-500",
				children: "Đang tải biểu đồ cảm biến..."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-64 w-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ComposedChart, {
						data: comboData,
						margin: {
							top: 10,
							right: 20,
							left: -10,
							bottom: 0
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
								strokeDasharray: "3 3",
								stroke: "#e2e8f0",
								vertical: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "label",
								tick: {
									fontSize: 11,
									fill: "#64748b"
								},
								axisLine: false,
								tickLine: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								yAxisId: "l",
								tick: {
									fontSize: 11,
									fill: "#64748b"
								},
								axisLine: false,
								tickLine: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								yAxisId: "r",
								orientation: "right",
								tick: {
									fontSize: 11,
									fill: "#64748b"
								},
								axisLine: false,
								tickLine: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { contentStyle: {
								borderRadius: 12,
								background: "rgba(255,255,255,0.95)",
								border: "1px solid rgba(255,255,255,0.7)",
								fontSize: 12
							} }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, { wrapperStyle: { fontSize: 12 } }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
								yAxisId: "r",
								dataKey: "light",
								fill: "#f59e0b",
								opacity: .35,
								name: "Ánh sáng",
								radius: [
									4,
									4,
									0,
									0
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								yAxisId: "l",
								type: "monotone",
								dataKey: "temp",
								stroke: "#ef4444",
								strokeWidth: 2.5,
								dot: false,
								name: "Nhiệt độ"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
								yAxisId: "l",
								type: "monotone",
								dataKey: "humid",
								stroke: "#0ea5e9",
								strokeWidth: 2.5,
								dot: false,
								name: "Độ ẩm"
							})
						]
					})
				})
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeatmapCard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, {
				className: "p-0 overflow-hidden",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3 p-5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-base font-semibold text-slate-900",
							children: "Lịch sử đo đạc"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-slate-500",
							children: [filtered.length, " bản ghi gần nhất"]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1.5 text-xs text-slate-500",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { className: "h-3.5 w-3.5" }), " Thiết bị:"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: deviceFilter,
									onValueChange: setDeviceFilter,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
										className: "h-9 w-52 bg-white/80 text-xs",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "all",
										children: "Tất cả"
									}), DEVICES.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: d,
										children: d
									}, d))] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									size: "sm",
									onClick: exportCSV,
									className: "bg-slate-900 text-white hover:bg-slate-800",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "mr-1.5 h-3.5 w-3.5" }), " Xuất CSV"]
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "overflow-x-auto",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
							className: "min-w-full text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
								className: "border-y border-slate-200/70 bg-slate-50/50 text-xs uppercase tracking-wider text-slate-500",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Th, { children: "STT" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Th, { children: "Thời gian" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Th, { children: "Nhiệt độ (°C)" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Th, { children: "Độ ẩm (%)" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Th, { children: "Ánh sáng (lx)" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Th, { children: "Thiết bị gửi" })
								] })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								colSpan: 6,
								className: "text-center py-6 text-slate-500",
								children: "Đang tải lịch sử..."
							}) }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								colSpan: 6,
								className: "text-center py-6 text-slate-500",
								children: "Không có dữ liệu"
							}) }) : paginatedData.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-b border-slate-100 last:border-0 transition hover:bg-white/60",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Td, {
										className: "font-medium text-slate-500",
										children: r.id
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Td, {
										className: "tabular-nums",
										children: r.time
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Td, {
										className: "tabular-nums font-medium text-rose-600",
										children: r.temp
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Td, {
										className: "tabular-nums font-medium text-sky-600",
										children: r.humid
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Td, {
										className: "tabular-nums font-medium text-amber-600",
										children: r.light
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Td, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleDot, { className: "h-3 w-3 text-emerald-500" }), r.device]
									}) })
								]
							}, r.id)) })]
						})
					}),
					totalPages > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between border-t border-slate-200/70 p-4 bg-slate-50/30 text-xs text-slate-500",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
								"Hiển thị ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: Math.min(filtered.length, (currentPage - 1) * pageSize + 1) }),
								" đến",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: Math.min(filtered.length, currentPage * pageSize) }),
								" trong tổng số",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: filtered.length }),
								" bản ghi"
							] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Số dòng:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: pageSize,
									onChange: (e) => {
										setPageSize(Number(e.target.value));
										setCurrentPage(1);
									},
									className: "rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 outline-none",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: 10,
											children: "10"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: 20,
											children: "20"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: 50,
											children: "50"
										})
									]
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => setCurrentPage((p) => Math.max(1, p - 1)),
									disabled: currentPage === 1,
									className: "h-8 px-2.5",
									children: "Trước"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-medium text-slate-600",
									children: [
										"Trang ",
										currentPage,
										" / ",
										totalPages
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									size: "sm",
									onClick: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
									disabled: currentPage === totalPages,
									className: "h-8 px-2.5",
									children: "Sau"
								})
							]
						})]
					})
				]
			})
		]
	});
}
function MiniChart({ title, data, color, unit, stats, icon: Icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
					className: "h-4 w-4",
					style: { color }
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm font-semibold text-slate-900",
					children: title
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-xs text-slate-500",
				children: [
					"TB ",
					stats.avg,
					" ",
					unit
				]
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 h-14 w-full",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkline, {
				data,
				color
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mt-2 flex justify-between text-[11px] text-slate-500",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Min: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
				className: "text-slate-700",
				children: stats.min
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Max: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
				className: "text-slate-700",
				children: stats.max
			})] })]
		})
	] });
}
function Th({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
		className: "px-5 py-3 text-left font-semibold",
		children
	});
}
function Td({ children, className }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
		className: cn("px-5 py-3.5 text-slate-700", className),
		children
	});
}
function getActMeta(type, detail, ok) {
	if (!ok) return {
		icon: TriangleAlert,
		gradient: "from-rose-500 to-pink-500",
		badge: "bg-rose-100 text-rose-700 border-rose-200",
		border: "border-l-rose-400",
		bg: "bg-rose-50/40"
	};
	if (type === "Cấu hình") return {
		icon: Settings,
		gradient: "from-violet-500 to-indigo-500",
		badge: "bg-violet-100 text-violet-700 border-violet-200",
		border: "border-l-violet-400",
		bg: "bg-violet-50/40"
	};
	if (detail.includes("Điều hòa")) return {
		icon: Wind,
		gradient: "from-sky-500 to-cyan-500",
		badge: "bg-sky-100 text-sky-700 border-sky-200",
		border: "border-l-sky-400",
		bg: "bg-sky-50/40"
	};
	if (detail.includes("Quạt")) return {
		icon: Fan,
		gradient: "from-teal-500 to-emerald-500",
		badge: "bg-teal-100 text-teal-700 border-teal-200",
		border: "border-l-teal-400",
		bg: "bg-teal-50/40"
	};
	if (detail.includes("Đèn")) return {
		icon: Lightbulb,
		gradient: "from-amber-500 to-yellow-400",
		badge: "bg-amber-100 text-amber-700 border-amber-200",
		border: "border-l-amber-400",
		bg: "bg-amber-50/40"
	};
	return {
		icon: CircleCheck,
		gradient: "from-emerald-500 to-green-500",
		badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
		border: "border-l-emerald-400",
		bg: "bg-emerald-50/30"
	};
}
function ActivityTab() {
	const [logs, setLogs] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [search, setSearch] = (0, import_react.useState)("");
	const [page, setPage] = (0, import_react.useState)(1);
	const PAGE_SIZE = 10;
	(0, import_react.useEffect)(() => {
		async function fetchLogs() {
			setLoading(true);
			try {
				const { data } = await supabase.from("nhatkyhoatdong").select("*").order("thoigian", { ascending: false }).limit(50);
				if (data) setLogs(data);
			} catch (e) {
				console.error("Lỗi khi tải nhật ký hoạt động:", e);
			}
			setLoading(false);
		}
		fetchLogs();
		const channel = supabase.channel("activity-tab-realtime").on("postgres_changes", {
			event: "INSERT",
			schema: "public",
			table: "nhatkyhoatdong"
		}, (payload) => {
			setLogs((prev) => [payload.new, ...prev].slice(0, 50));
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, []);
	const mappedLogs = (0, import_react.useMemo)(() => {
		return logs.map((l) => {
			const hasWarning = l.hanhdong.includes("vượt ngưỡng") || l.hanhdong.includes("Lỗi") || l.hanhdong.includes("Mất kết nối");
			return {
				ts: Date.parse(l.thoigian),
				type: hasWarning ? "Cảnh báo" : l.hanhdong.includes("Cấu hình") || l.hanhdong.includes("Ngưỡng") ? "Cấu hình" : "Điều khiển",
				detail: l.hanhdong,
				by: l.idnguoidung ? "Admin" : "Hệ thống",
				ok: !hasWarning,
				isoTime: l.thoigian
			};
		});
	}, [logs]);
	const filtered = (0, import_react.useMemo)(() => {
		return !search.trim() ? mappedLogs : mappedLogs.filter((m) => m.detail.toLowerCase().includes(search.toLowerCase()) || m.type.toLowerCase().includes(search.toLowerCase()) || m.by.toLowerCase().includes(search.toLowerCase()));
	}, [mappedLogs, search]);
	(0, import_react.useEffect)(() => {
		setPage(1);
	}, [search]);
	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const paginated = (0, import_react.useMemo)(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
	const stats = (0, import_react.useMemo)(() => ({
		total: mappedLogs.length,
		ok: mappedLogs.filter((m) => m.ok).length,
		warn: mappedLogs.filter((m) => !m.ok).length,
		config: mappedLogs.filter((m) => m.type === "Cấu hình").length
	}), [mappedLogs]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
				children: [
					{
						label: "Tổng sự kiện",
						value: stats.total,
						color: "from-indigo-500 to-sky-500",
						icon: Clock
					},
					{
						label: "Thành công",
						value: stats.ok,
						color: "from-emerald-500 to-teal-500",
						icon: CircleCheck
					},
					{
						label: "Cảnh báo",
						value: stats.warn,
						color: "from-rose-500 to-pink-500",
						icon: TriangleAlert
					},
					{
						label: "Cấu hình",
						value: stats.config,
						color: "from-violet-500 to-indigo-500",
						icon: Settings
					}
				].map((s) => {
					const Icon = s.icon;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative overflow-hidden rounded-2xl border border-white/60 bg-white/60 p-4 backdrop-blur-md shadow-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("absolute -right-3 -top-3 h-14 w-14 rounded-full bg-gradient-to-br opacity-10", s.color) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: cn("mb-2 inline-grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br text-white shadow", s.color),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-2xl font-bold text-slate-900 tabular-nums",
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
				className: "relative",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						placeholder: "Tìm kiếm sự kiện, thiết bị, loại...",
						value: search,
						onChange: (e) => setSearch(e.target.value),
						className: "pl-9 bg-white/70 backdrop-blur-sm border-white/60 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-300"
					}),
					search && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setSearch(""),
						className: "absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-4 w-4" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-5 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-base font-semibold text-slate-900 dark:text-white",
					children: "Nhật ký hoạt động"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-xs text-slate-500",
					children: [
						"Trang ",
						page,
						"/",
						totalPages,
						" · ",
						filtered.length,
						" sự kiện"
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "relative flex h-2 w-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex h-2 w-2 rounded-full bg-emerald-500" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[11px] font-medium text-emerald-700",
						children: "Live"
					})]
				})]
			}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3",
				children: [
					1,
					2,
					3,
					4
				].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-4 animate-pulse",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-10 w-10 shrink-0 rounded-xl bg-slate-100" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-3/4 rounded bg-slate-100" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2.5 w-1/2 rounded bg-slate-100" })]
					})]
				}, i))
			}) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center gap-3 py-12 text-slate-400",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, { className: "h-10 w-10 opacity-30" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm",
					children: search ? "Không tìm thấy kết quả phù hợp" : "Chưa có nhật ký hoạt động"
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute left-[19px] top-5 bottom-5 w-px bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "space-y-3",
						children: paginated.map((a, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivityRow, {
							a,
							isFirst: page === 1 && i === 0
						}, i))
					}),
					totalPages > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-5 flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-slate-500 tabular-nums",
							children: [
								"Hiển thị ",
								(page - 1) * PAGE_SIZE + 1,
								"–",
								Math.min(page * PAGE_SIZE, filtered.length),
								" / ",
								filtered.length,
								" sự kiện"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setPage((p) => Math.max(1, p - 1)),
									disabled: page === 1,
									className: "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
										className: "h-4 w-4",
										fill: "none",
										stroke: "currentColor",
										viewBox: "0 0 24 24",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
											strokeLinecap: "round",
											strokeLinejoin: "round",
											strokeWidth: 2,
											d: "M15 19l-7-7 7-7"
										})
									})
								}),
								Array.from({ length: totalPages }).map((_, idx) => {
									const p = idx + 1;
									if (!(p === 1 || p === totalPages || Math.abs(p - page) <= 1)) {
										if (p === 2 || p === totalPages - 1) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "px-0.5 text-xs text-slate-400",
											children: "…"
										}, p);
										return null;
									}
									return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setPage(p),
										className: cn("inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs font-semibold transition", p === page ? "bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-200" : "border border-white/60 bg-white/60 text-slate-600 hover:bg-white shadow-sm"),
										children: p
									}, p);
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setPage((p) => Math.min(totalPages, p + 1)),
									disabled: page === totalPages,
									className: "inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/60 bg-white/60 text-slate-600 shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-30",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
										className: "h-4 w-4",
										fill: "none",
										stroke: "currentColor",
										viewBox: "0 0 24 24",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
											strokeLinecap: "round",
											strokeLinejoin: "round",
											strokeWidth: 2,
											d: "M9 5l7 7-7 7"
										})
									})
								})
							]
						})]
					})
				]
			})] })
		]
	});
}
function ActivityRow({ a, isFirst }) {
	const rel = useRelativeTime(a.ts);
	const meta = getActMeta(a.type, a.detail, a.ok);
	const Icon = meta.icon;
	const timeStr = new Date(a.ts).toLocaleTimeString("vi-VN", {
		hour: "2-digit",
		minute: "2-digit"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: cn("group relative flex items-start gap-4 rounded-2xl border-l-4 p-4 transition-all duration-200", "border border-white/60 bg-white/60 backdrop-blur-sm shadow-sm hover:shadow-md hover:-translate-y-0.5", meta.border, meta.bg),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: cn("relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", meta.gradient),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" }), isFirst && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "absolute -top-1 -right-1 flex h-3 w-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex h-3 w-3 rounded-full bg-current" })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-start gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-semibold text-slate-800 leading-snug",
						children: a.detail
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide", meta.badge),
						children: a.type
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3 w-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "tabular-nums font-medium",
								children: rel
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-3 w-3" }), a.by]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-auto font-mono text-[10px] text-slate-400 tabular-nums",
							children: timeStr
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("shrink-0 self-center rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm", a.ok ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-200" : "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-rose-200"),
				children: a.ok ? "✓ Thành công" : "✗ Thất bại"
			})
		]
	});
}
function SettingsTab() {
	const [temp, setTemp] = (0, import_react.useState)(30);
	const [humid, setHumid] = (0, import_react.useState)(70);
	const [light, setLight] = (0, import_react.useState)(350);
	const [saving, setSaving] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		async function loadThresholds() {
			try {
				const { data, error } = await supabase.from("luat").select("*");
				if (data) data.forEach((r) => {
					if (r.loaicambien === "NhietDo") setTemp(Number(r.nguong));
					if (r.loaicambien === "DoAm") setHumid(Number(r.nguong));
					if (r.loaicambien === "AnhSang") setLight(Number(r.nguong));
				});
			} catch (e) {
				console.error("Lỗi khi tải luật tự động hóa:", e);
			}
		}
		loadThresholds();
	}, []);
	const handleSave = async () => {
		setSaving(true);
		try {
			const updateData = [
				{
					loaicambien: "NhietDo",
					value: temp,
					idDen: 1
				},
				{
					loaicambien: "DoAm",
					value: humid,
					idDen: 2
				},
				{
					loaicambien: "AnhSang",
					value: light,
					idDen: 3
				}
			];
			for (const item of updateData) {
				const { error } = await supabase.from("luat").update({ nguong: item.value }).eq("loaicambien", item.loaicambien);
				if (error) throw error;
			}
			await supabase.from("nhatkyhoatdong").insert([{ hanhdong: `Cấu hình: Cập nhật ngưỡng tự động (Nhiệt độ ${temp}°C, Độ ẩm ${humid}%, Ánh sáng ${light} lx)` }]);
			toast.success("Đã lưu cấu hình ngưỡng tự động thành công!");
		} catch (e) {
			console.error("Lỗi khi lưu cấu hình:", e);
			toast.error("Lỗi khi lưu cấu hình!");
		}
		setSaving(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [[
			{
				label: "Ngưỡng nhiệt độ (Bật điều hòa khi vượt)",
				unit: "°C",
				min: 15,
				max: 40,
				value: temp,
				set: setTemp,
				color: "from-rose-500 to-orange-400",
				icon: Thermometer
			},
			{
				label: "Ngưỡng độ ẩm (Bật quạt khi vượt)",
				unit: "%",
				min: 30,
				max: 90,
				value: humid,
				set: setHumid,
				color: "from-sky-500 to-cyan-400",
				icon: Droplets
			},
			{
				label: "Ngưỡng ánh sáng (Bật đèn khi dưới)",
				unit: "lx",
				min: 50,
				max: 1e3,
				value: light,
				set: setLight,
				color: "from-amber-400 to-yellow-300",
				icon: Sun
			}
		].map((it) => {
			const Icon = it.icon;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", it.color),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-semibold text-slate-900",
						children: it.label
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs text-slate-500",
						children: [
							"Phạm vi: ",
							it.min,
							" – ",
							it.max,
							" ",
							it.unit
						]
					})] })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						value: it.value,
						min: it.min,
						max: it.max,
						onChange: (e) => it.set(Number(e.target.value)),
						className: "w-24 bg-white/80"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-medium text-slate-600",
						children: it.unit
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
					value: [it.value],
					min: it.min,
					max: it.max,
					step: 1,
					onValueChange: (v) => it.set(v[0])
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-2 flex justify-between text-[11px] text-slate-400",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						it.min,
						" ",
						it.unit
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						it.max,
						" ",
						it.unit
					] })]
				})]
			})] }, it.label);
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex justify-end gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: "outline",
				disabled: saving,
				children: "Hủy"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: handleSave,
				disabled: saving,
				className: "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/30 hover:opacity-90",
				children: saving ? "Đang lưu..." : "Lưu cấu hình"
			})]
		})]
	});
}
function ForecastCard({ sensors, nodeName }) {
	const hist = (0, import_react.useRef)([]);
	const [tick, setTick] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		hist.current.push({
			t: Date.now(),
			temp: sensors.temp,
			humid: sensors.humid
		});
		if (hist.current.length > 30) hist.current.shift();
		setTick((x) => x + 1);
	}, [sensors.temp, sensors.humid]);
	const slope = (key) => {
		const arr = hist.current.slice(-10);
		if (arr.length < 2) return 0;
		const first = arr[0][key];
		return (arr[arr.length - 1][key] - first) / arr.length;
	};
	const tempSlope = slope("temp");
	const humidSlope = slope("humid");
	const forecastTemp = +(sensors.temp + tempSlope * 15).toFixed(1);
	const forecastHumid = Math.round(sensors.humid + humidSlope * 15);
	const chart = (0, import_react.useMemo)(() => {
		const arr = [];
		for (let i = 0; i < 12; i++) arr.push({
			label: `-${(11 - i) * 5}m`,
			temp: +(sensors.temp - tempSlope * (11 - i) * 2 + (Math.random() - .5) * .3).toFixed(1)
		});
		arr.push({
			label: "now",
			temp: sensors.temp,
			forecast: sensors.temp
		});
		for (let i = 1; i <= 6; i++) arr.push({
			label: `+${i * 10}m`,
			temp: NaN,
			forecast: +(sensors.temp + tempSlope * i * 2).toFixed(1)
		});
		return arr;
	}, [tick]);
	const trend = (v) => v > .05 ? {
		label: "tăng",
		color: "text-rose-600",
		arrow: "↗"
	} : v < -.05 ? {
		label: "giảm",
		color: "text-sky-600",
		arrow: "↘"
	} : {
		label: "ổn định",
		color: "text-emerald-600",
		arrow: "→"
	};
	const tT = trend(tempSlope);
	const tH = trend(humidSlope);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mb-4 flex flex-wrap items-center justify-between gap-2",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-4 w-4 text-indigo-500" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-base font-semibold text-slate-900 dark:text-white",
				children: "Dự báo 1-2 giờ tới"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-slate-500",
				children: ["Dựa trên xu hướng gần nhất tại ", nodeName]
			})] })]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 md:grid-cols-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-white/70 bg-gradient-to-br from-rose-50 to-orange-50 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-xs font-medium text-rose-700",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Thermometer, { className: "h-3.5 w-3.5" }), " Nhiệt độ dự báo"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex items-baseline gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-3xl font-bold text-slate-900 tabular-nums",
							children: forecastTemp
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-slate-600",
							children: "°C"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: cn("mt-1 text-xs font-medium", tT.color),
						children: [
							tT.arrow,
							" Xu hướng ",
							tT.label
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-white/70 bg-gradient-to-br from-sky-50 to-cyan-50 p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 text-xs font-medium text-sky-700",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Droplets, { className: "h-3.5 w-3.5" }), " Độ ẩm dự báo"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2 flex items-baseline gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-3xl font-bold text-slate-900 tabular-nums",
							children: forecastHumid
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-sm text-slate-600",
							children: "%"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: cn("mt-1 text-xs font-medium", tH.color),
						children: [
							tH.arrow,
							" Xu hướng ",
							tH.label
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-white/70 bg-white/60 p-2 md:col-span-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: 110,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
						data: chart,
						margin: {
							top: 8,
							right: 8,
							left: -20,
							bottom: 0
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
								id: "fc",
								x1: "0",
								y1: "0",
								x2: "0",
								y2: "1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "0%",
									stopColor: "#6366f1",
									stopOpacity: .5
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "100%",
									stopColor: "#6366f1",
									stopOpacity: 0
								})]
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "label",
								hide: true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								hide: true,
								domain: ["dataMin-1", "dataMax+1"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
								x: "now",
								stroke: "#94a3b8",
								strokeDasharray: "3 3"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								type: "monotone",
								dataKey: "temp",
								stroke: "#ef4444",
								strokeWidth: 2,
								fill: "url(#fc)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								type: "monotone",
								dataKey: "forecast",
								stroke: "#6366f1",
								strokeDasharray: "4 3",
								strokeWidth: 2,
								fill: "url(#fc)"
							})
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "px-2 pb-2 text-[10px] text-slate-500",
					children: "Đường liền: thực tế · Đường đứt: dự báo"
				})]
			})
		]
	})] });
}
var HEAT_METRICS = [
	{
		key: "temp",
		label: "Nhiệt độ",
		unit: "°C",
		base: 28,
		amp: 5,
		palette: [
			"#ecfeff",
			"#a5f3fc",
			"#67e8f9",
			"#facc15",
			"#fb923c",
			"#ef4444"
		]
	},
	{
		key: "humid",
		label: "Độ ẩm",
		unit: "%",
		base: 60,
		amp: 15,
		palette: [
			"#fef9c3",
			"#bbf7d0",
			"#a5f3fc",
			"#93c5fd",
			"#818cf8",
			"#4f46e5"
		]
	},
	{
		key: "light",
		label: "Ánh sáng",
		unit: "lx",
		base: 400,
		amp: 350,
		palette: [
			"#1e293b",
			"#334155",
			"#64748b",
			"#facc15",
			"#fde68a",
			"#fef3c7"
		]
	}
];
function buildHeatmapData(metric) {
	return [
		"T2",
		"T3",
		"T4",
		"T5",
		"T6",
		"T7",
		"CN"
	].map((d, di) => ({
		day: d,
		values: Array.from({ length: 24 }).map((_, h) => {
			const daynight = metric.key === "light" ? Math.max(0, Math.sin((h - 6) / 24 * Math.PI)) : (Math.sin((h - 4) / 24 * Math.PI * 2) + 1) / 2;
			const dayNoise = Math.sin(di * .7 + h * .3) * .2;
			return +(metric.base + metric.amp * (daynight + dayNoise)).toFixed(1);
		})
	}));
}
function HeatmapCard() {
	const [metricIdx, setMetricIdx] = (0, import_react.useState)(0);
	const metric = HEAT_METRICS[metricIdx];
	const data = (0, import_react.useMemo)(() => buildHeatmapData(metric), [metricIdx, metric]);
	const all = data.flatMap((r) => r.values);
	const min = Math.min(...all);
	const max = Math.max(...all);
	const color = (v) => {
		const p = (v - min) / (max - min + 1e-6);
		const idx = Math.min(metric.palette.length - 1, Math.floor(p * metric.palette.length));
		return metric.palette[idx];
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-4 flex flex-wrap items-center justify-between gap-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "text-base font-semibold text-slate-900",
			children: "Bản đồ nhiệt theo giờ"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "text-xs text-slate-500",
			children: [
				"Pattern trung bình 7 ngày qua · ",
				metric.label,
				" (",
				metric.unit,
				")"
			]
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "inline-flex rounded-xl bg-slate-100/80 p-1 text-xs",
			children: HEAT_METRICS.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: () => setMetricIdx(i),
				className: cn("rounded-lg px-3 py-1.5 font-medium transition", metricIdx === i ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"),
				children: m.label
			}, m.key))
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "overflow-x-auto",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "inline-block min-w-full",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex text-[10px] font-medium text-slate-500",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-10" }), Array.from({ length: 24 }).map((_, h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-6 text-center tabular-nums",
						children: h % 3 === 0 ? h : ""
					}, h))]
				}),
				data.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-0.5 flex items-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-10 text-xs font-medium text-slate-500",
						children: row.day
					}), row.values.map((v, h) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						title: `${row.day} · ${h}:00 · ${v}${metric.unit}`,
						className: "mx-[1px] h-6 w-6 rounded-md transition hover:scale-125 hover:z-10 hover:ring-2 hover:ring-white",
						style: { background: color(v) }
					}, h))]
				}, row.day)),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex items-center gap-3 text-[10px] text-slate-500",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"Thấp ",
							min.toFixed(0),
							metric.unit
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex overflow-hidden rounded-md",
							children: metric.palette.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-3 w-6",
								style: { background: c }
							}, c))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"Cao ",
							max.toFixed(0),
							metric.unit
						] })
					]
				})
			]
		})
	})] });
}
var DAY_LABELS = [
	"CN",
	"T2",
	"T3",
	"T4",
	"T5",
	"T6",
	"T7"
];
var DEVICE_LABELS = {
	ac: {
		name: "Điều hòa",
		icon: Wind
	},
	fan: {
		name: "Quạt",
		icon: Fan
	},
	light: {
		name: "Đèn",
		icon: Lightbulb
	}
};
function ScheduleTab() {
	const [rules, setRules] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [draft, setDraft] = (0, import_react.useState)({
		device: "light",
		action: "on",
		time: "20:00",
		days: [
			1,
			2,
			3,
			4,
			5
		],
		enabled: true
	});
	const [editingRuleId, setEditingRuleId] = (0, import_react.useState)(null);
	const fetchSchedules = async () => {
		setLoading(true);
		try {
			const { data, error } = await supabase.from("lichhengio").select("*").order("idid", { ascending: true });
			if (data) {
				const mapped = data.map((item) => {
					let device = "light";
					if (item.idden === 1) device = "ac";
					if (item.idden === 2) device = "fan";
					if (item.idden === 3) device = "light";
					return {
						id: Number(item.idid),
						device,
						action: item.hanhdong,
						time: item.thoigian.substring(0, 5),
						days: item.thu || [],
						enabled: item.kichhoat
					};
				});
				setRules(mapped);
			}
		} catch (err) {
			console.error("Lỗi khi tải lịch hẹn từ database:", err);
		}
		setLoading(false);
	};
	(0, import_react.useEffect)(() => {
		fetchSchedules();
	}, []);
	const saveSchedule = async () => {
		let idden = 3;
		if (draft.device === "ac") idden = 1;
		if (draft.device === "fan") idden = 2;
		try {
			if (editingRuleId !== null) {
				const { error } = await supabase.from("lichhengio").update({
					idden,
					hanhdong: draft.action,
					thoigian: `${draft.time.length === 5 ? draft.time + ":00" : draft.time}`,
					thu: draft.days,
					kichhoat: draft.enabled
				}).eq("idid", editingRuleId);
				if (error) throw error;
				toast.success(`Đã cập nhật lịch hẹn: ${DEVICE_LABELS[draft.device].name} ${draft.action === "on" ? "BẬT" : "TẮT"} lúc ${draft.time}`);
				await supabase.from("nhatkyhoatdong").insert([{ hanhdong: `Cấu hình: Cập nhật lịch hẹn giờ ID=${editingRuleId} cho ${DEVICE_LABELS[draft.device].name} (${draft.action === "on" ? "BẬT" : "TẮT"} lúc ${draft.time})` }]);
				setEditingRuleId(null);
			} else {
				const { error } = await supabase.from("lichhengio").insert([{
					idden,
					hanhdong: draft.action,
					thoigian: `${draft.time}:00`,
					thu: draft.days,
					kichhoat: draft.enabled
				}]);
				if (error) throw error;
				toast.success(`Đã thêm lịch hẹn: ${DEVICE_LABELS[draft.device].name} ${draft.action === "on" ? "BẬT" : "TẮT"} lúc ${draft.time}`);
				await supabase.from("nhatkyhoatdong").insert([{ hanhdong: `Cấu hình: Thêm lịch hẹn giờ mới cho ${DEVICE_LABELS[draft.device].name} (${draft.action === "on" ? "BẬT" : "TẮT"} lúc ${draft.time})` }]);
			}
			setDraft({
				device: "light",
				action: "on",
				time: "20:00",
				days: [
					1,
					2,
					3,
					4,
					5
				],
				enabled: true
			});
			fetchSchedules();
		} catch (err) {
			toast.error("Lỗi khi lưu lịch hẹn: " + err.message);
		}
	};
	const handleEdit = (rule) => {
		setEditingRuleId(rule.id);
		setDraft({
			device: rule.device,
			action: rule.action,
			time: rule.time,
			days: rule.days,
			enabled: rule.enabled
		});
	};
	const handleCancelEdit = () => {
		setEditingRuleId(null);
		setDraft({
			device: "light",
			action: "on",
			time: "20:00",
			days: [
				1,
				2,
				3,
				4,
				5
			],
			enabled: true
		});
	};
	const remove = async (id) => {
		try {
			const { error } = await supabase.from("lichhengio").delete().eq("idid", id);
			if (error) throw error;
			toast.success("Đã xóa lịch hẹn thành công");
			if (editingRuleId === id) handleCancelEdit();
			fetchSchedules();
		} catch (err) {
			toast.error("Lỗi khi xóa lịch hẹn: " + err.message);
		}
	};
	const handleToggleActive = async (id, enabled) => {
		try {
			const { error } = await supabase.from("lichhengio").update({ kichhoat: enabled }).eq("idid", id);
			if (error) throw error;
			setRules((prev) => prev.map((r) => r.id === id ? {
				...r,
				enabled
			} : r));
			toast.success(enabled ? "Đã kích hoạt lịch hẹn" : "Đã tạm dừng lịch hẹn");
		} catch (err) {
			toast.error("Lỗi thay đổi trạng thái: " + err.message);
		}
	};
	const toggleDay = (d) => setDraft((s) => ({
		...s,
		days: s.days.includes(d) ? s.days.filter((x) => x !== d) : [...s.days, d].sort()
	}));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { className: "h-4 w-4 text-indigo-500" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-base font-semibold text-slate-900",
					children: editingRuleId !== null ? "Chỉnh sửa lịch hẹn giờ" : "Thêm lịch hẹn giờ mới"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-slate-500",
					children: editingRuleId !== null ? "Thay đổi cấu hình lịch hẹn giờ của thiết bị và lưu lại" : "Tự động bật/tắt thiết bị theo giờ, độc lập với ngưỡng cảm biến"
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs font-medium text-slate-500",
							children: "Thiết bị"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: draft.device,
							onValueChange: (v) => setDraft((s) => ({
								...s,
								device: v
							})),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "bg-white/80",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: Object.keys(DEVICE_LABELS).map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: k,
								children: DEVICE_LABELS[k].name
							}, k)) })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs font-medium text-slate-500",
							children: "Hành động"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							value: draft.action,
							onValueChange: (v) => setDraft((s) => ({
								...s,
								action: v
							})),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "bg-white/80",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "on",
								children: "Bật"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "off",
								children: "Tắt"
							})] })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs font-medium text-slate-500",
							children: "Giờ"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "time",
							value: draft.time,
							onChange: (e) => setDraft((s) => ({
								...s,
								time: e.target.value
							})),
							className: "bg-white/80"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5 md:col-span-4 lg:col-span-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs font-medium text-slate-500",
							children: "Ngày lặp lại"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-wrap gap-1",
							children: DAY_LABELS.map((d, i) => {
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => toggleDay(i),
									className: cn("grid h-8 w-8 place-items-center rounded-lg text-xs font-medium transition", draft.days.includes(i) ? "bg-indigo-500 text-white shadow-sm" : "bg-white/70 text-slate-500 hover:bg-white"),
									children: d
								}, d);
							})
						})]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-5 flex justify-end gap-2",
				children: [editingRuleId !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					onClick: handleCancelEdit,
					children: "Hủy sửa"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: saveSchedule,
					className: "bg-gradient-to-r from-indigo-500 to-sky-500 text-white hover:opacity-90",
					children: editingRuleId !== null ? "Cập nhật lịch" : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1.5 h-4 w-4" }), " Thêm lịch"] })
				})]
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "text-base font-semibold text-slate-900",
				children: "Danh sách lịch đang cài đặt"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-slate-500",
				children: [
					rules.filter((r) => r.enabled).length,
					"/",
					rules.length,
					" lịch đang hoạt động"
				]
			})]
		}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-center py-6 text-sm text-slate-500",
			children: "Đang tải lịch hẹn..."
		}) : rules.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-center py-6 text-sm text-slate-500",
			children: "Chưa cấu hình lịch hẹn nào"
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
			className: "space-y-2",
			children: rules.map((r) => {
				const D = DEVICE_LABELS[r.device];
				const Icon = D.icon;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: cn("flex flex-wrap items-center gap-3 rounded-2xl border p-4 transition", r.id === editingRuleId ? "border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20" : "border-white/70 bg-white/60 hover:bg-white/80"),
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md", r.action === "on" ? "from-emerald-500 to-teal-400" : "from-slate-500 to-slate-400"),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-sm font-medium text-slate-900",
								children: [
									D.name,
									" · ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: r.action === "on" ? "text-emerald-600" : "text-slate-500",
										children: r.action === "on" ? "BẬT" : "TẮT"
									}),
									r.id === editingRuleId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700",
										children: "Đang sửa"
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3 w-3" }),
											" ",
											r.time
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "flex gap-1",
										children: DAY_LABELS.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: cn("rounded px-1 py-0.5 text-[10px]", r.days.includes(i) ? "bg-indigo-100 text-indigo-700 font-medium" : "text-slate-300"),
											children: d
										}, d))
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
							checked: r.enabled,
							onCheckedChange: (v) => handleToggleActive(r.id, v)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => handleEdit(r),
							className: cn("grid h-9 w-9 place-items-center rounded-lg transition", r.id === editingRuleId ? "text-indigo-600 bg-indigo-100" : "text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"),
							title: "Chỉnh sửa",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => remove(r.id),
							className: "grid h-9 w-9 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600",
							title: "Xóa",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
						})
					]
				}, r.id);
			})
		})] })]
	});
}
function NotificationsTab({ readAlertIds, onMarkAsRead, onMarkAllAsRead }) {
	const [logs, setLogs] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [filter, setFilter] = (0, import_react.useState)("all");
	const [currentPage, setCurrentPage] = (0, import_react.useState)(1);
	const [pageSize, setPageSize] = (0, import_react.useState)(10);
	(0, import_react.useEffect)(() => {
		async function fetchAll() {
			setLoading(true);
			try {
				const { data } = await supabase.from("nhatkyhoatdong").select("*").order("thoigian", { ascending: false }).limit(100);
				if (data) setLogs(data);
			} catch (e) {
				console.error("Lỗi tải thông báo:", e);
			}
			setLoading(false);
		}
		fetchAll();
		const chan = supabase.channel("notif-tab-realtime").on("postgres_changes", {
			event: "INSERT",
			schema: "public",
			table: "nhatkyhoatdong"
		}, (payload) => {
			setLogs((prev) => [payload.new, ...prev].slice(0, 100));
		}).subscribe();
		return () => {
			supabase.removeChannel(chan);
		};
	}, []);
	(0, import_react.useEffect)(() => {
		setCurrentPage(1);
	}, [filter, pageSize]);
	const mapped = (0, import_react.useMemo)(() => logs.map((l) => {
		const isError = l.hanhdong.includes("Lỗi") || l.hanhdong.includes("Mất kết nối");
		const isWarn = l.hanhdong.includes("vượt ngưỡng") || l.hanhdong.includes("Cảnh báo");
		const level = isError ? "error" : isWarn ? "warn" : "info";
		return {
			id: Number(l.idnhatky),
			ts: Date.parse(l.thoigian),
			detail: l.hanhdong,
			level,
			isoTime: l.thoigian
		};
	}), [logs]);
	const filtered = (0, import_react.useMemo)(() => filter === "all" ? mapped : mapped.filter((n) => n.level === filter), [mapped, filter]);
	const counts = (0, import_react.useMemo)(() => ({
		all: mapped.length,
		error: mapped.filter((n) => n.level === "error").length,
		warn: mapped.filter((n) => n.level === "warn").length,
		info: mapped.filter((n) => n.level === "info").length
	}), [mapped]);
	const totalPages = Math.ceil(filtered.length / pageSize);
	const paginatedData = (0, import_react.useMemo)(() => {
		const start = (currentPage - 1) * pageSize;
		return filtered.slice(start, start + pageSize);
	}, [
		filtered,
		currentPage,
		pageSize
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-2 gap-3 sm:grid-cols-4",
			children: [
				{
					key: "all",
					label: "Tất cả",
					color: "from-indigo-500 to-sky-500"
				},
				{
					key: "error",
					label: "Lỗi",
					color: "from-rose-500 to-pink-500"
				},
				{
					key: "warn",
					label: "Cảnh báo",
					color: "from-amber-500 to-orange-400"
				},
				{
					key: "info",
					label: "Thông tin",
					color: "from-emerald-500 to-teal-400"
				}
			].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => setFilter(f.key),
				className: cn("relative overflow-hidden rounded-2xl border p-4 text-left transition-all cursor-pointer", filter === f.key ? "border-transparent ring-2 ring-indigo-400 shadow-lg bg-white" : "border-white/60 bg-white/60 backdrop-blur-md shadow-sm hover:bg-white/80"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("absolute -right-3 -top-3 h-14 w-14 rounded-full bg-gradient-to-br opacity-15", f.color) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-2xl font-bold text-slate-900 tabular-nums",
						children: counts[f.key]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-slate-500 mt-0.5",
						children: f.label
					})
				]
			}, f.key))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, {
			className: "p-0 overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between px-5 py-4 border-b border-slate-100 gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-base font-semibold text-slate-900",
						children: "Trung tâm thông báo"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-xs text-slate-500 mt-0.5",
						children: [filtered.length, " thông báo · Cập nhật realtime"]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [filtered.some((n) => !readAlertIds.includes(n.id)) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							size: "sm",
							onClick: () => onMarkAllAsRead(filtered.filter((n) => !readAlertIds.includes(n.id)).map((n) => n.id)),
							className: "text-xs border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 cursor-pointer h-8",
							children: "Đọc tất cả"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "relative flex h-2 w-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "relative inline-flex h-2 w-2 rounded-full bg-emerald-500" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] font-medium text-emerald-700",
								children: "Live"
							})]
						})]
					})]
				}),
				loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-px",
					children: [
						1,
						2,
						3,
						4,
						5
					].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-4 px-5 py-4 animate-pulse",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-10 w-10 shrink-0 rounded-xl bg-slate-100" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3 w-3/4 rounded bg-slate-100" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-2.5 w-1/2 rounded bg-slate-100" })]
						})]
					}, i))
				}) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center gap-3 py-16 text-slate-400",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-12 w-12 opacity-20" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm",
						children: "Không có thông báo nào"
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "divide-y divide-slate-100/80",
					children: paginatedData.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotifItem, {
						notif: n,
						isRead: readAlertIds.includes(n.id),
						onMark: () => onMarkAsRead(n.id)
					}, n.id))
				}),
				totalPages > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between border-t border-slate-200/70 p-4 bg-slate-50/30 text-xs text-slate-500",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"Hiển thị ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: Math.min(filtered.length, (currentPage - 1) * pageSize + 1) }),
							" đến",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: Math.min(filtered.length, currentPage * pageSize) }),
							" trong tổng số",
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: filtered.length }),
							" bản ghi"
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Số dòng:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: pageSize,
								onChange: (e) => {
									setPageSize(Number(e.target.value));
									setCurrentPage(1);
								},
								className: "rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 outline-none cursor-pointer",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: 10,
										children: "10"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: 20,
										children: "20"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: 50,
										children: "50"
									})
								]
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								size: "sm",
								onClick: () => setCurrentPage((p) => Math.max(1, p - 1)),
								disabled: currentPage === 1,
								className: "h-8 px-2.5 cursor-pointer",
								children: "Trước"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-medium text-slate-600",
								children: [
									"Trang ",
									currentPage,
									" / ",
									totalPages
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								size: "sm",
								onClick: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
								disabled: currentPage === totalPages,
								className: "h-8 px-2.5 cursor-pointer",
								children: "Sau"
							})
						]
					})]
				})
			]
		})]
	});
}
function NotifItem({ notif, isRead, onMark }) {
	const rel = useRelativeTime(notif.ts);
	const timeStr = new Date(notif.ts).toLocaleString("vi-VN", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit"
	});
	const cfg = notif.level === "error" ? {
		icon: TriangleAlert,
		gradient: "from-rose-500 to-pink-500",
		badge: "bg-rose-100 text-rose-700",
		bg: isRead ? "hover:bg-slate-100/50" : "bg-rose-50/20 hover:bg-rose-50/40"
	} : notif.level === "warn" ? {
		icon: TriangleAlert,
		gradient: "from-amber-500 to-orange-400",
		badge: "bg-amber-100 text-amber-700",
		bg: isRead ? "hover:bg-slate-100/50" : "bg-amber-50/20 hover:bg-amber-50/40"
	} : {
		icon: CircleCheck,
		gradient: "from-emerald-500 to-teal-400",
		badge: "bg-emerald-100 text-emerald-700",
		bg: isRead ? "hover:bg-slate-100/50" : "bg-emerald-50/10 hover:bg-emerald-50/20"
	};
	const Icon = cfg.icon;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: cn("flex items-start gap-4 px-5 py-4 transition relative", cfg.bg, !isRead && "font-medium"),
		children: [
			!isRead && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-indigo-500 shadow-md shadow-indigo-500/50" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-md transition-all duration-300", cfg.gradient, isRead && "opacity-60 grayscale"),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: cn("text-sm leading-snug transition-colors duration-300", isRead ? "text-slate-500" : "text-slate-800 font-semibold"),
					children: notif.detail
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3 w-3" }),
								" ",
								rel
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "tabular-nums",
							children: timeStr
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "ml-auto flex items-center gap-2",
							children: [!isRead && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: (e) => {
									e.preventDefault();
									onMark();
								},
								className: "text-[11px] font-medium text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer",
								children: "Đã đọc"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", cfg.badge),
								children: notif.level === "error" ? "Lỗi" : notif.level === "warn" ? "Cảnh báo" : "Thông tin"
							})]
						})
					]
				})]
			})
		]
	});
}
function HealthTab() {
	const [uptime, setUptime] = (0, import_react.useState)(2346120);
	const [rssi, setRssi] = (0, import_react.useState)(-58);
	const [latency, setLatency] = (0, import_react.useState)(42);
	const [storage] = (0, import_react.useState)({
		used: 218,
		total: 500
	});
	(0, import_react.useEffect)(() => {
		const id = setInterval(() => {
			setUptime((u) => u + 1);
			setRssi((r) => Math.max(-85, Math.min(-40, r + (Math.random() - .5) * 3)));
			setLatency((l) => Math.max(15, Math.min(320, l + (Math.random() - .5) * 40)));
		}, 2e3);
		return () => clearInterval(id);
	}, []);
	const days = Math.floor(uptime / 86400);
	const hh = Math.floor(uptime % 86400 / 3600);
	const mm = Math.floor(uptime % 3600 / 60);
	const rssiPct = Math.max(0, Math.min(100, (rssi + 90) / 50 * 100));
	const rssiLevel = rssi > -60 ? "Xuất sắc" : rssi > -70 ? "Tốt" : rssi > -80 ? "Trung bình" : "Yếu";
	const latencyLevel = latency < 100 ? {
		l: "Ổn định",
		c: "text-emerald-600",
		bg: "bg-emerald-100"
	} : latency < 200 ? {
		l: "Chậm nhẹ",
		c: "text-amber-600",
		bg: "bg-amber-100"
	} : {
		l: "Trễ cao",
		c: "text-rose-600",
		bg: "bg-rose-100"
	};
	const storagePct = storage.used / storage.total * 100;
	const latHist = (0, import_react.useRef)([]);
	(0, import_react.useEffect)(() => {
		latHist.current.push({
			t: Date.now(),
			latency
		});
		if (latHist.current.length > 30) latHist.current.shift();
	}, [latency]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-5 md:grid-cols-2 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HealthStat, {
						icon: Clock,
						label: "Uptime ESP32",
						value: `${days}d ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`,
						hint: "Kể từ lần khởi động cuối",
						gradient: "from-emerald-500 to-teal-400"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HealthStat, {
						icon: Wifi,
						label: "WiFi RSSI",
						value: `${Math.round(rssi)} dBm`,
						hint: rssiLevel,
						gradient: "from-sky-500 to-indigo-500",
						progress: rssiPct
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HealthStat, {
						icon: Zap,
						label: "Độ trễ MQTT",
						value: `${Math.round(latency)} ms`,
						hint: latencyLevel.l,
						gradient: "from-amber-400 to-orange-400",
						badge: latencyLevel
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HealthStat, {
						icon: Database,
						label: "Dung lượng Supabase",
						value: `${storage.used} / ${storage.total} MB`,
						hint: `Đã dùng ${storagePct.toFixed(0)}%`,
						gradient: "from-fuchsia-500 to-pink-400",
						progress: storagePct
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-base font-semibold text-slate-900",
					children: "Độ trễ MQTT theo thời gian"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-slate-500",
					children: "Cập nhật mỗi 2 giây"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-56 w-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
						data: latHist.current,
						margin: {
							top: 10,
							right: 10,
							left: -20,
							bottom: 0
						},
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
								id: "lat",
								x1: "0",
								y1: "0",
								x2: "0",
								y2: "1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "0%",
									stopColor: "#f59e0b",
									stopOpacity: .5
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "100%",
									stopColor: "#f59e0b",
									stopOpacity: 0
								})]
							}) }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
								strokeDasharray: "3 3",
								stroke: "#e2e8f0",
								vertical: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
								dataKey: "t",
								hide: true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
								tick: {
									fontSize: 11,
									fill: "#64748b"
								},
								axisLine: false,
								tickLine: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {
								formatter: (v) => `${Math.round(v)} ms`,
								labelFormatter: (l) => new Date(l).toLocaleTimeString("vi-VN"),
								contentStyle: {
									borderRadius: 12,
									background: "rgba(255,255,255,0.95)",
									border: "1px solid rgba(255,255,255,0.7)",
									fontSize: 12
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReferenceLine, {
								y: 100,
								stroke: "#94a3b8",
								strokeDasharray: "3 3"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
								type: "monotone",
								dataKey: "latency",
								stroke: "#f59e0b",
								strokeWidth: 2,
								fill: "url(#lat)",
								isAnimationActive: false
							})
						]
					})
				})
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-5 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-base font-semibold text-slate-900",
					children: "Trạng thái dịch vụ"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 space-y-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, {
							label: "ESP32-S3 Node-01",
							online: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, {
							label: "ESP32-S3 Node-02",
							online: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, {
							label: "ESP32-C3 Kitchen",
							online: false
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, {
							label: "MQTT Broker (HiveMQ)",
							online: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, {
							label: "Supabase Realtime",
							online: true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusRow, {
							label: "Edge Functions",
							online: true
						})
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-base font-semibold text-slate-900",
					children: "Thông số phần cứng"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 space-y-2 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HwRow, {
							k: "Firmware",
							v: "v2.4.1 (2026-06-12)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HwRow, {
							k: "Chip",
							v: "ESP32-S3 · Xtensa LX7 dual-core 240MHz"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HwRow, {
							k: "RAM",
							v: "512 KB SRAM · 2 MB PSRAM"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HwRow, {
							k: "Flash",
							v: "8 MB (4.2 MB đã dùng)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HwRow, {
							k: "Địa chỉ IP",
							v: "192.168.1.42"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HwRow, {
							k: "MAC",
							v: "A4:CF:12:8B:3D:E1"
						})
					]
				})] })]
			})
		]
	});
}
function HealthStat({ icon: Icon, label, value, hint, gradient, progress, badge }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GlassCard, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: cn("grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", gradient),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
			}), badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: cn("rounded-full px-2 py-0.5 text-[11px] font-medium", badge.bg, badge.c),
				children: badge.l
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-4 text-xs text-slate-500",
			children: label
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1 text-2xl font-bold tabular-nums text-slate-900",
			children: value
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-1 text-[11px] text-slate-500",
			children: hint
		}),
		progress !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-400 transition-all",
				style: { width: `${progress}%` }
			})
		})
	] });
}
function HwRow({ k, v }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between border-b border-slate-100 py-1.5 last:border-0",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs text-slate-500",
			children: k
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-mono text-xs text-slate-700",
			children: v
		})]
	});
}
function LandingPage({ dark, toggleDark }) {
	const bg = dark ? "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" : "linear-gradient(135deg, #f6f7fb 0%, #eef1f8 100%)";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("min-h-screen transition-colors duration-1000 flex flex-col justify-between p-6 md:p-10", dark ? "text-slate-100 bg-slate-950" : "text-slate-800 bg-slate-50"),
		style: { background: bg },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "flex justify-between items-center max-w-7xl w-full mx-auto mb-10",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cpu, { className: "h-5 w-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-bold text-lg tracking-tight",
						children: "Smart Home IoT"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: toggleDark,
					className: cn("grid h-10 w-10 place-items-center rounded-xl border shadow-sm transition cursor-pointer", dark ? "border-white/10 bg-white/5 text-amber-300 hover:bg-white/10" : "border-white/70 bg-white/80 text-slate-600 hover:bg-white hover:text-slate-900"),
					children: dark ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "h-4 w-4" })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center my-auto",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-6 text-left",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase", dark ? "bg-indigo-500/10 text-indigo-300" : "bg-indigo-50 text-indigo-600"),
							children: "● Giải pháp điều khiển thế hệ mới"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none",
							children: [
								"Giám sát & Điều khiển ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 bg-clip-text text-transparent",
									children: "Smart Home IoT"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: cn("text-base md:text-lg max-w-lg", dark ? "text-slate-400" : "text-slate-600"),
							children: "Hệ thống quản lý nhà thông minh tối ưu sử dụng chip điều khiển ESP32-S3, truyền thông điệp thời gian thực MQTT và đồng bộ cơ sở dữ liệu Supabase."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-4 pt-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								className: "bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 h-11 px-6 rounded-2xl cursor-pointer",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/login",
									children: ["Đăng nhập hệ thống ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "ml-2 h-4 w-4" })]
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								asChild: true,
								variant: "outline",
								className: cn("h-11 px-6 rounded-2xl border-white/60 bg-white/40 backdrop-blur hover:bg-white/80 cursor-pointer", dark ? "text-white border-white/10 bg-white/5 hover:bg-white/10" : "text-slate-800"),
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/register",
									children: "Tạo tài khoản mới"
								})
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
					children: [
						{
							title: "Giám sát Cảm biến",
							desc: "Đọc nhiệt độ, độ ẩm và cường độ ánh sáng thời gian thực.",
							icon: Thermometer,
							color: "text-rose-500 bg-rose-500/10"
						},
						{
							title: "Điều khiển Thiết bị",
							desc: "Bật/tắt Điều hòa, Quạt, Đèn ở 2 chế độ Tự động và Thủ công.",
							icon: Cpu,
							color: "text-indigo-500 bg-indigo-500/10"
						},
						{
							title: "Lịch trình Hẹn giờ",
							desc: "Cài đặt lịch bật/tắt thiết bị tự động theo giờ trong ngày.",
							icon: Clock,
							color: "text-emerald-500 bg-emerald-500/10"
						},
						{
							title: "Cảnh báo & Nhật ký",
							desc: "Ghi chép lịch sử vận hành, báo động ngay lập tức khi vượt ngưỡng.",
							icon: ShieldAlert,
							color: "text-amber-500 bg-amber-500/10"
						}
					].map((f, i) => {
						const Icon = f.icon;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: cn("p-5 rounded-3xl border transition-all duration-300 hover:scale-[1.02]", dark ? "border-white/10 bg-white/5" : "border-white/70 bg-white/60"),
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: cn("grid h-10 w-10 place-items-center rounded-xl mb-3", f.color),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "font-bold text-sm mb-1",
									children: f.title
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: cn("text-xs leading-relaxed", dark ? "text-slate-400" : "text-slate-500"),
									children: f.desc
								})
							]
						}, i);
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
				className: "max-w-7xl w-full mx-auto border-t border-slate-200/50 dark:border-white/10 pt-6 mt-10 text-center text-xs text-slate-500 dark:text-slate-400",
				children: ["© 2026 Smart Home IoT Project · Phát triển bởi ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-semibold text-slate-700 dark:text-slate-200",
					children: "Bùi Văn Sang"
				})]
			})
		]
	});
}
//#endregion
export { Dashboard as component };
