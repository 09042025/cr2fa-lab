/** Ícones de linha dourados dos canais (no lugar dos símbolos do Discord). */
const PATHS: Record<string, React.ReactNode> = {
  shield: (<><path d="M12 3 5 6v5.5c0 4.2 2.8 7.6 7 9.5 4.2-1.9 7-5.3 7-9.5V6l-7-3Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>),
  bell: (<><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5Z" /><path d="M10 20.5a2 2 0 0 0 4 0" /><path d="M4 7.5C4.4 6 5.3 4.8 6.5 4M20 7.5C19.6 6 18.7 4.8 17.5 4" /></>),
  users: (<><circle cx="9" cy="9" r="3" /><path d="M3.5 19c.4-3 2.7-5 5.5-5s5.1 2 5.5 5" /><circle cx="17" cy="9.5" r="2.3" /><path d="M16.5 14.2c2.3.1 3.8 1.6 4.2 4" /></>),
  trend: (<><path d="M3.5 17 9 11.5l3.5 3.5 7-7.5" /><path d="M15 7.5h4.5V12" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M8 14h2M12 14h2M8 17h2" /></>),
  lock: (<><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /><circle cx="12" cy="15.5" r="1.2" /></>),
  headset: (<><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3.5" y="13.5" width="4" height="6" rx="2" /><rect x="16.5" y="13.5" width="4" height="6" rx="2" /><path d="M18.5 19.5c0 1-1.2 1.8-3 1.8" /></>),
  video: (<><rect x="3" y="6.5" width="12.5" height="11" rx="3" /><path d="m15.5 10.5 5-2.5v8l-5-2.5" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" /></>),
};

export function ChannelIcon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-gold">
      {PATHS[name] ?? PATHS.users}
    </svg>
  );
}
export { PATHS as CHANNEL_ICON_PATHS };
