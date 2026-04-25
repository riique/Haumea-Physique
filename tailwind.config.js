/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                app: "var(--bg-app)",
                sidebar: "var(--bg-sidebar)",
                surface: "var(--bg-surface)",
                primary: "var(--fg-primary)",
                secondary: "var(--fg-secondary)",
                accent: "var(--accent)",
                border: "var(--border)",
            }
        },
    },
    plugins: [],
}
