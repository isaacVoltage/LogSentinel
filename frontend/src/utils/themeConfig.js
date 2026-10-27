export const THEMES = [
  // Dark Themes
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    mode: 'dark',
    description: 'Vibrant cyan & purple neon glassmorphism aesthetic.',
    primaryColor: '#00F0FF',
    secondaryColor: '#7000FF',
    bgPreview: '#0B0F19',
    tag: 'Default SOC'
  },
  {
    id: 'matrix',
    name: 'Matrix Terminal',
    mode: 'dark',
    description: 'Classic phosphor green monospace hacker console.',
    primaryColor: '#00FF66',
    secondaryColor: '#10B981',
    bgPreview: '#03140B',
    tag: 'Hacker Console'
  },
  {
    id: 'midnight',
    name: 'Midnight Defense',
    mode: 'dark',
    description: 'Deep cobalt blue enterprise security operations.',
    primaryColor: '#3B82F6',
    secondaryColor: '#6366F1',
    bgPreview: '#091326',
    tag: 'Enterprise SOC'
  },
  {
    id: 'obsidian',
    name: 'Obsidian OLED',
    mode: 'dark',
    description: 'Pure pitch black with high-contrast sharp accents.',
    primaryColor: '#E2E8F0',
    secondaryColor: '#94A3B8',
    bgPreview: '#000000',
    tag: 'OLED Pure Black'
  },
  // Light Themes
  {
    id: 'light-clean',
    name: 'Light Arctic',
    mode: 'light',
    description: 'Crisp ice slate with vivid sky blue & high readability.',
    primaryColor: '#0284C7',
    secondaryColor: '#4F46E5',
    bgPreview: '#F8FAFC',
    tag: 'Modern Light'
  },
  {
    id: 'light-nordic',
    name: 'Nordic Frost',
    mode: 'light',
    description: 'Calm glacier teal & mint frosted glass aesthetic.',
    primaryColor: '#0D9488',
    secondaryColor: '#06B6D4',
    bgPreview: '#F0FDFA',
    tag: 'Glacier Mist'
  },
  {
    id: 'light-paper',
    name: 'Paper Minimalist',
    mode: 'light',
    description: 'Warm cream & sand backdrop with terracotta accents.',
    primaryColor: '#D97706',
    secondaryColor: '#B45309',
    bgPreview: '#FDFBF7',
    tag: 'Warm Tech'
  }
];

export const FONT_SANS_OPTIONS = [
  { id: 'Inter', name: 'Inter', family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", preview: 'Modern & Balanced' },
  { id: 'Outfit', name: 'Outfit', family: "'Outfit', sans-serif", preview: 'Geometric Tech' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', sans-serif", preview: 'Elegant & Crisp' },
  { id: 'Roboto', name: 'Roboto', family: "'Roboto', sans-serif", preview: 'Clean Google Sans' },
  { id: 'System UI', name: 'System UI', family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", preview: 'Native OS Default' }
];

export const FONT_MONO_OPTIONS = [
  { id: 'JetBrains Mono', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", preview: 'Developer Favorite' },
  { id: 'Fira Code', name: 'Fira Code', family: "'Fira Code', monospace", preview: 'Iconic Code Font' },
  { id: 'Source Code Pro', name: 'Source Code Pro', family: "'Source Code Pro', monospace", preview: 'Adobe Terminal Mono' },
  { id: 'Consolas', name: 'Consolas / Shell', family: "Consolas, 'Courier New', monospace", preview: 'Classic Shell Console' }
];

export const FONT_SIZE_OPTIONS = [
  { id: 'compact', name: 'Compact', scale: '13.5px', label: '90% (Dense)' },
  { id: 'normal', name: 'Default', scale: '15px', label: '100% (Balanced)' },
  { id: 'large', name: 'Large', scale: '16.5px', label: '110% (Readable)' },
  { id: 'xlarge', name: 'Extra Large', scale: '18px', label: '120% (High Access)' }
];

export const FONT_WEIGHT_OPTIONS = [
  { id: 'normal', name: 'Regular (400)', class: 'font-weight-normal' },
  { id: 'medium', name: 'Medium (500)', class: 'font-weight-medium' },
  { id: 'semibold', name: 'Semibold (600)', class: 'font-weight-semibold' }
];

export function applyThemeAndFontSettings({ theme, fontSans, fontMono, fontSize, fontWeight }) {
  const root = document.documentElement;
  const body = document.body;

  // 1. Theme application
  THEMES.forEach((t) => {
    body.classList.remove(`theme-${t.id}`);
    root.classList.remove(`theme-${t.id}`);
  });
  body.classList.add(`theme-${theme}`);
  root.classList.add(`theme-${theme}`);

  const activeTheme = THEMES.find((t) => t.id === theme);
  const isLight = activeTheme?.mode === 'light' || theme.startsWith('light-');

  if (isLight) {
    root.classList.remove('dark');
    root.classList.add('light');
    root.classList.add('is-light');
    body.classList.add('is-light');
  } else {
    root.classList.remove('light');
    root.classList.remove('is-light');
    root.classList.add('dark');
    body.classList.remove('is-light');
  }

  // 2. Font Sans application
  const activeSans = FONT_SANS_OPTIONS.find((f) => f.id === fontSans) || FONT_SANS_OPTIONS[0];
  root.style.setProperty('--font-sans', activeSans.family);

  // 3. Font Mono application
  const activeMono = FONT_MONO_OPTIONS.find((f) => f.id === fontMono) || FONT_MONO_OPTIONS[0];
  root.style.setProperty('--font-mono', activeMono.family);

  // 4. Font Size Scale application
  FONT_SIZE_OPTIONS.forEach((s) => {
    body.classList.remove(`font-size-${s.id}`);
  });
  body.classList.add(`font-size-${fontSize}`);
  const activeSize = FONT_SIZE_OPTIONS.find((s) => s.id === fontSize) || FONT_SIZE_OPTIONS[1];
  root.style.setProperty('--font-size-scale', activeSize.scale);

  // 5. Font Weight application
  FONT_WEIGHT_OPTIONS.forEach((w) => {
    body.classList.remove(w.class);
  });
  const activeWeight = FONT_WEIGHT_OPTIONS.find((w) => w.id === fontWeight) || FONT_WEIGHT_OPTIONS[0];
  body.classList.add(activeWeight.class);

  // Persist settings
  try {
    localStorage.setItem('logsentinel_theme', theme);
    localStorage.setItem('logsentinel_font_sans', fontSans);
    localStorage.setItem('logsentinel_font_mono', fontMono);
    localStorage.setItem('logsentinel_font_size', fontSize);
    localStorage.setItem('logsentinel_font_weight', fontWeight);
  } catch (e) {
    // LocalStorage quota or access error handling
  }
}
