export const themeConfigs = {
  purple: {
    primary: '#6366f1',
    primaryHover: '#4f46e5',
    primaryGlow: 'rgba(99, 102, 241, 0.25)',
    primaryGradient: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
    btnGradientHover: 'linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%)',
    panelGlow: 'rgba(99, 102, 241, 0.12)'
  },
  white: {
    primary: '#e2e8f0',
    primaryHover: '#cbd5e1',
    primaryGlow: 'rgba(255, 255, 255, 0.25)',
    primaryGradient: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
    btnGradientHover: 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
    panelGlow: 'rgba(255, 255, 255, 0.08)'
  },
  skyblue: {
    primary: '#06b6d4',
    primaryHover: '#0891b2',
    primaryGlow: 'rgba(6, 182, 212, 0.25)',
    primaryGradient: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
    btnGradientHover: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
    panelGlow: 'rgba(6, 182, 212, 0.12)'
  },
  orange: {
    primary: '#f97316',
    primaryHover: '#ea580c',
    primaryGlow: 'rgba(249, 115, 22, 0.25)',
    primaryGradient: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
    btnGradientHover: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
    panelGlow: 'rgba(249, 115, 22, 0.12)'
  },
  green: {
    primary: '#22c55e',
    primaryHover: '#16a34a',
    primaryGlow: 'rgba(34, 197, 94, 0.25)',
    primaryGradient: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
    btnGradientHover: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    panelGlow: 'rgba(34, 197, 94, 0.12)'
  }
};

export function applyThemeLight(color) {
  const config = themeConfigs[color] || themeConfigs.purple;
  const root = document.documentElement;

  root.style.setProperty('--primary', config.primary);
  root.style.setProperty('--primary-hover', config.primaryHover);
  root.style.setProperty('--primary-glow', config.primaryGlow);
  root.style.setProperty('--primary-gradient', config.primaryGradient);
  root.style.setProperty('--btn-gradient-hover', config.btnGradientHover);
  root.style.setProperty('--panel-glow', config.panelGlow);

  localStorage.setItem('themeLight', color);
}
