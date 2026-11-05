export function ThemeSwitchIcon() {
  return (
    <span aria-hidden="true" className="theme-switch">
      <span className="theme-switch-thumb">
        <span className="theme-icon theme-sun">
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="3" fill="currentColor" />
            <path
              d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.9 11.9l1.05 1.05M12.95 3.05 11.9 4.1M4.1 11.9l-1.05 1.05"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className="theme-icon theme-moon">
          <svg viewBox="0 0 16 16" fill="none">
            <path
              d="M13 10.4A5.4 5.4 0 0 1 5.6 3a5.4 5.4 0 1 0 7.4 7.4Z"
              fill="currentColor"
            />
          </svg>
        </span>
      </span>
    </span>
  );
}
