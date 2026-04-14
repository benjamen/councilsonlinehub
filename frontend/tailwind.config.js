import frappeUIPreset from "frappe-ui/tailwind"

export default {
	presets: [frappeUIPreset],
	content: [
		"./index.html",
		"./src/**/*.{vue,js,ts,jsx,tsx}",
		"./node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}",
	],
	theme: {
		extend: {
			colors: {
				// CouncilsOnline brand colours (fixed — hub has no dynamic theming)
				brand: {
					DEFAULT: '#1B3A72',
					hover:   '#15305e',
					light:   '#dde6f5',
					dark:    '#0f2147',
				},
				'brand-teal': {
					DEFAULT: '#00B4D8',
					hover:   '#0096b7',
					light:   '#cdf0fa',
				},
			},
		},
	},
	plugins: [],
}
