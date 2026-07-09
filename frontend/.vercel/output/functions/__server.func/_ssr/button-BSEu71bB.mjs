import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { i as Slot, s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as createClient } from "../_libs/supabase__supabase-js.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/button-BSEu71bB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var supabase = createClient("https://ccvesdhnzlvfpdfhlesr.supabase.co", "sb_publishable_j72Mv19uraSeb0azL_ifHw_BAXSkPeU", { realtime: {
	params: { eventsPerSecond: 10 },
	reconnectAfterMs: (tries) => Math.min(tries * 1e3, 1e4)
} });
var lastHiddenAt = null;
var RECONNECT_THRESHOLD_MS = 300 * 1e3;
if (typeof document !== "undefined") {
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) lastHiddenAt = Date.now();
		else {
			const hiddenDuration = lastHiddenAt ? Date.now() - lastHiddenAt : 0;
			if (hiddenDuration > RECONNECT_THRESHOLD_MS) {
				console.info(`[Supabase] Tab bị ẩn ${Math.round(hiddenDuration / 1e3)}s. Đang reconnect Realtime...`);
				supabase.realtime.disconnect();
				setTimeout(() => supabase.realtime.connect(), 300);
			}
			lastHiddenAt = null;
		}
	});
	window.addEventListener("online", () => {
		console.info("[Supabase] Mạng được khôi phục. Đang reconnect Realtime...");
		supabase.realtime.disconnect();
		setTimeout(() => supabase.realtime.connect(), 500);
	});
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
			destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
			outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
			secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
			ghost: "hover:bg-accent hover:text-accent-foreground",
			link: "text-primary underline-offset-4 hover:underline"
		},
		size: {
			default: "h-9 px-4 py-2",
			sm: "h-8 rounded-md px-3 text-xs",
			lg: "h-10 rounded-md px-8",
			icon: "h-9 w-9"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
var Button = import_react.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		ref,
		...props
	});
});
Button.displayName = "Button";
//#endregion
export { supabase as i, Input as n, cn as r, Button as t };
