export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    'bg-red-100', 'bg-red-500', 'text-red-600', 'text-red-700',
    'bg-blue-100', 'bg-blue-500', 'text-blue-600', 'text-blue-700',
    'bg-emerald-100', 'bg-emerald-500', 'text-emerald-600', 'text-emerald-700',
    'bg-purple-100', 'bg-purple-500', 'text-purple-600', 'text-purple-700',
    'bg-amber-100', 'bg-amber-500', 'text-amber-600', 'text-amber-700',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
