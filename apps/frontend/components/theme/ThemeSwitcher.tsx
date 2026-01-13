import { useEffect, useState } from 'react';
import { getTheme, setTheme, type Theme, resolveSystemTheme } from '../../lib/theme';

type Props = {
  compact?: boolean;
};

export function ThemeSwitcher({ compact = false }: Props) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const optionStyle = { background: 'var(--bg)', color: 'var(--text)' };

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

  const handleChange = (value: Theme) => {
    setThemeState(value);
    setTheme(value);
    if (value === 'system') {
      const resolved = resolveSystemTheme();
      document.documentElement.setAttribute('data-theme', resolved);
    }
  };

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
      <span style={{ color: 'var(--muted)', display: compact ? 'none' : 'inline' }}>Theme</span>
      <select
        value={theme}
        onChange={(e) => handleChange(e.target.value as Theme)}
        style={{
          padding: '0.4rem 0.6rem',
          borderRadius: '999px',
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          color: 'var(--text)',
          outline: 'none',
        }}
      >
        <option value="dark" style={optionStyle}>Dark</option>
        <option value="light" style={optionStyle}>Light</option>
        <option value="system" style={optionStyle}>System</option>
      </select>
    </label>
  );
}
