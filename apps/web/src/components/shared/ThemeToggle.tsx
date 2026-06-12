import { useTheme } from '../../contexts/ThemeContext';

/**
 * ThemeToggle — a compact icon button that switches between light and dark mode.
 * Renders a sun icon in dark mode and a moon icon in light mode.
 */
export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 10,
        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(10,17,40,0.08)',
        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(10,17,40,0.04)',
        cursor: 'pointer',
        fontSize: 17,
        lineHeight: 1,
        transition: 'all 0.2s ease',
        color: 'inherit',
        flexShrink: 0,
      }}
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
