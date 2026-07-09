import "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { _ as useRouter, c as HeadContent, d as Outlet, f as lazyRouteComponent, h as Link, m as createRootRouteWithContext, p as createFileRoute, s as Scripts, u as createRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { t as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
require_react();
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-GBapK1Ua.css";
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$4 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Smart Home Control | Cổng IoT ESP32-S3" },
			{
				name: "description",
				content: "Bảng điều khiển giám sát và điều khiển Smart Home qua cổng IoT ESP32-S3: cảm biến, thiết bị, lịch sử và cài đặt ngưỡng tự động."
			},
			{
				name: "author",
				content: "Bùi Văn Sang"
			},
			{
				property: "og:title",
				content: "Smart Home Control | Cổng IoT ESP32-S3"
			},
			{
				property: "og:description",
				content: "Bảng điều khiển giám sát và điều khiển Smart Home qua cổng IoT ESP32-S3: cảm biến, thiết bị, lịch sử và cài đặt ngưỡng tự động."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:title",
				content: "Smart Home Control | Cổng IoT ESP32-S3"
			},
			{
				name: "twitter:description",
				content: "Bảng điều khiển giám sát và điều khiển Smart Home qua cổng IoT ESP32-S3: cảm biến, thiết bị, lịch sử và cài đặt ngưỡng tự động."
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}, {
			rel: "icon",
			href: "/favicon.ico",
			type: "image/x-icon"
		}]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$4.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {
			position: "bottom-right",
			richColors: true,
			closeButton: true
		})]
	});
}
var $$splitComponentImporter$3 = () => import("./register-rGK4JnFc.mjs");
var Route$3 = createFileRoute("/register")({
	head: () => ({ meta: [{ title: "Đăng ký | Smart Home IoT" }, {
		name: "description",
		content: "Đăng ký tài khoản Smart Home."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./profile-DUPtpbxr.mjs");
var Route$2 = createFileRoute("/profile")({
	head: () => ({ meta: [
		{ title: "Hồ sơ người dùng | Smart Home IoT" },
		{
			name: "description",
			content: "Thông tin cá nhân, thiết bị đang quản lý và cấu hình thông báo."
		},
		{
			property: "og:title",
			content: "Hồ sơ người dùng | Smart Home IoT"
		},
		{
			property: "og:description",
			content: "Trang hồ sơ người dùng hệ thống Smart Home."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./login-CZSXyyJm.mjs");
var Route$1 = createFileRoute("/login")({
	head: () => ({ meta: [{ title: "Đăng nhập | Smart Home IoT" }, {
		name: "description",
		content: "Đăng nhập hệ thống điều khiển Smart Home."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./routes-CscbjL8a.mjs");
var Route = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "Smart Home Control | Cổng IoT ESP32-S3" },
		{
			name: "description",
			content: "Bảng điều khiển giám sát và điều khiển Smart Home qua cổng IoT ESP32-S3: cảm biến realtime, thiết bị, lịch sử và cài đặt ngưỡng tự động."
		},
		{
			property: "og:title",
			content: "Smart Home Control | ESP32-S3"
		},
		{
			property: "og:description",
			content: "Giám sát cảm biến và điều khiển thiết bị nhà thông minh theo thời gian thực."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
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
var RegisterRoute = Route$3.update({
	id: "/register",
	path: "/register",
	getParentRoute: () => Route$4
});
var ProfileRoute = Route$2.update({
	id: "/profile",
	path: "/profile",
	getParentRoute: () => Route$4
});
var LoginRoute = Route$1.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$4
});
var rootRouteChildren = {
	IndexRoute: Route.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$4
	}),
	LoginRoute,
	ProfileRoute,
	RegisterRoute
};
var routeTree = Route$4._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
