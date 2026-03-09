import frappeUIPreset from "frappe-ui/src/tailwind/preset"

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
				// Dynamic brand colors using CSS variables
				brand: {
					DEFAULT: 'var(--color-primary)',
					hover: 'var(--color-primary-hover)',
					light: 'var(--color-primary-light)',
					dark: 'var(--color-primary-dark)',
				},
				'brand-secondary': {
					DEFAULT: 'var(--color-secondary)',
					hover: 'var(--color-secondary-hover)',
					light: 'var(--color-secondary-light)',
				},
				'brand-accent': {
					DEFAULT: 'var(--color-accent)',
					hover: 'var(--color-accent-hover)',
					light: 'var(--color-accent-light)',
				},
			},
		},
	},
	plugins: [],
}
