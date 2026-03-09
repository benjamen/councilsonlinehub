import path from "node:path"
import vue from "@vitejs/plugin-vue"
import frappeui from "frappe-ui/vite"
import { defineConfig } from "vite"

export default defineConfig({
	plugins: [
		frappeui({
			frappeProxy: true,
			jinjaBootData: true,
			lucideIcons: true,
			buildConfig: {
				indexHtmlPath: "../councilsonlinehub/www/frontend.html",
				emptyOutDir: false,
				sourcemap: true,
			},
		}),
		vue(),
	],
	build: {
		outDir: "../councilsonlinehub/public/frontend",
		emptyOutDir: false,
		target: "es2015",
		sourcemap: true,
		minify: "esbuild",
		esbuild: {
			pure: ["console.log", "console.debug", "console.trace"],
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	server: {
		host: "0.0.0.0",
		allowedHosts: true,
		port: 8081,
		proxy: {
			"^/(app|api|assets|files)": {
				target: "http://127.0.0.1:8090",
				ws: true,
				changeOrigin: true,
				secure: false,
				configure: (proxy) => {
					proxy.on("proxyReq", (proxyReq) => {
						proxyReq.setHeader("Host", "nzcouncil.localhost")
					})
				},
			},
		},
	},
})
