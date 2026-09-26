// Ported from ux/prototype/icons.jsx — Lucide-style inline icons, single stroke, 1.6px, 24x24.
import type { SVGProps } from 'react';

const _i = (p: Record<string, unknown>): SVGProps<SVGSVGElement> => ({ stroke: 'currentColor', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none', viewBox: '0 0 24 24', ...p } as SVGProps<SVGSVGElement>);

export function Icon({ name, size = 16, className, ...rest }: { name: string; size?: number; className?: string; [k: string]: unknown }) {
  const props = _i({width:size, height:size, className, ...rest});
  switch(name) {
    case 'home':       return <svg {...props}><path d="m3 11 9-8 9 8"/><path d="M5 9v11h14V9"/></svg>;
    case 'grid':       return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
    case 'inbox':      return <svg {...props}><path d="M21 8v13H3V8l3-5h12l3 5Z"/><path d="M3 13h5l2 3h4l2-3h5"/></svg>;
    case 'users':      return <svg {...props}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4a3.5 3.5 0 0 1 0 7"/><path d="M22 20a5.5 5.5 0 0 0-5-5.5"/></svg>;
    case 'user':       return <svg {...props}><circle cx="12" cy="8" r="3.8"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
    case 'bot':        return <svg {...props}><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 3v4"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M10 17h4"/></svg>;
    case 'sparkles':   return <svg {...props}><path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1z"/></svg>;
    case 'sensor':     return <svg {...props}><circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7"/><path d="M15.5 15.5a5 5 0 0 0 0-7"/><path d="M5.5 5.5a9 9 0 0 0 0 13"/><path d="M18.5 18.5a9 9 0 0 0 0-13"/></svg>;
    case 'building':   return <svg {...props}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1"/><path d="M10 21v-3h4v3"/></svg>;
    case 'invoice':    return <svg {...props}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>;
    case 'wallet':     return <svg {...props}><path d="M3 7c0-1.5 1-3 3-3h12v3"/><path d="M3 7v12c0 1.5 1 3 3 3h13c.5 0 1-.5 1-1V9c0-.5-.5-1-1-1H6c-2 0-3-1.5-3-3"/><circle cx="17" cy="14.5" r="1.3"/></svg>;
    case 'alert':      return <svg {...props}><path d="m10.3 3.9-8 13.2A2 2 0 0 0 4 20h16a2 2 0 0 0 1.7-2.9l-8-13.2a2 2 0 0 0-3.4 0Z"/><path d="M12 9v5"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/></svg>;
    case 'flow':       return <svg {...props}><rect x="3" y="4" width="6" height="6" rx="1"/><rect x="15" y="14" width="6" height="6" rx="1"/><path d="M9 7h3a3 3 0 0 1 3 3v4"/></svg>;
    case 'chart':      return <svg {...props}><path d="M3 21h18"/><rect x="5" y="13" width="3" height="6"/><rect x="10.5" y="8" width="3" height="11"/><rect x="16" y="5" width="3" height="14"/></svg>;
    case 'lead':       return <svg {...props}><path d="M14 3h7v7"/><path d="M21 3 12 12"/><circle cx="7" cy="17" r="4"/></svg>;
    case 'settings':   return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg>;
    case 'search':     return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'bell':       return <svg {...props}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>;
    case 'arrow-right':return <svg {...props}><path d="M5 12h14m-6-6 6 6-6 6"/></svg>;
    case 'arrow-up':   return <svg {...props}><path d="M12 19V5m-6 6 6-6 6 6"/></svg>;
    case 'arrow-down': return <svg {...props}><path d="M12 5v14m6-6-6 6-6-6"/></svg>;
    case 'chevron-right': return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case 'chevron-down':  return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case 'check':      return <svg {...props}><path d="m5 12 5 5L20 7"/></svg>;
    case 'x':          return <svg {...props}><path d="M6 6 18 18M6 18 18 6"/></svg>;
    case 'plus':       return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'edit':       return <svg {...props}><path d="M4 20h4l11-11-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>;
    case 'mail':       return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>;
    case 'phone':      return <svg {...props}><path d="M22 17v3a2 2 0 0 1-2.2 2A19 19 0 0 1 2 4.2 2 2 0 0 1 4 2h3a2 2 0 0 1 2 1.7c.1.8.3 1.6.6 2.3a2 2 0 0 1-.5 2.1L7.9 9.4a16 16 0 0 0 6.7 6.7l1.3-1.3a2 2 0 0 1 2.1-.5c.7.3 1.5.5 2.3.6a2 2 0 0 1 1.7 2Z"/></svg>;
    case 'whatsapp':   return <svg {...props}><path d="M3 21l1.9-5.5a8.5 8.5 0 1 1 3.6 3.6L3 21Z"/><path d="M8.5 9c0 3.5 3 6.5 6.5 6.5l1.5-1.5-2.5-1L13 14l-1-.5-1.5-1L10 11l-1-1 1-1.5L9 8 8.5 9Z"/></svg>;
    case 'message':    return <svg {...props}><path d="M21 12a8 8 0 0 1-11.5 7.2L3 21l1.8-6.5A8 8 0 1 1 21 12Z"/></svg>;
    case 'door':       return <svg {...props}><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17"/><path d="M3 21h18"/><circle cx="15" cy="13" r="0.7" fill="currentColor"/></svg>;
    case 'wifi':       return <svg {...props}><path d="M2 9a16 16 0 0 1 20 0"/><path d="M5 12.5a11 11 0 0 1 14 0"/><path d="M8.5 16a6 6 0 0 1 7 0"/><circle cx="12" cy="19" r="0.7" fill="currentColor"/></svg>;
    case 'camera':     return <svg {...props}><rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3.5"/><path d="M8 6V4h8v2"/></svg>;
    case 'zap':        return <svg {...props}><path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/></svg>;
    case 'thermo':     return <svg {...props}><path d="M14 14V5a2 2 0 1 0-4 0v9a4 4 0 1 0 4 0Z"/></svg>;
    case 'flame':      return <svg {...props}><path d="M8.5 14.5C8.5 17 10 19 12 19s3.5-2 3.5-4.5c0-1.5-1-3-1-3s-.5 1-1.5 1c-1 0-.5-3-.5-5 0 0-4 3-4 7Z"/><path d="M5 13c0-5 5-7 5-12 0 0 7 4 7 12a7 7 0 1 1-14 0c0-2 1-4 2-5"/></svg>;
    case 'pin':        return <svg {...props}><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12Z"/><circle cx="12" cy="10" r="3"/></svg>;
    case 'clock':      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'calendar':   return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case 'filter':     return <svg {...props}><path d="M3 5h18l-7 9v6l-4-2v-4Z"/></svg>;
    case 'tag':        return <svg {...props}><path d="M20 12.5V4h-8.5L3 12.5 11.5 21l8.5-8.5Z"/><circle cx="8" cy="8" r="1.2"/></svg>;
    case 'paperclip':  return <svg {...props}><path d="M21 11.5 12 20.5a5 5 0 0 1-7-7L14 4.5a3.5 3.5 0 1 1 5 5L10 18.5a2 2 0 1 1-3-3l8-8"/></svg>;
    case 'send':       return <svg {...props}><path d="m4 4 17 8-17 8 4-8-4-8Z"/><path d="M8 12h13"/></svg>;
    case 'check-circle': return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5L16 9.5"/></svg>;
    case 'shield':     return <svg {...props}><path d="M12 2 4 5v7c0 5 3 8 8 10 5-2 8-5 8-10V5l-8-3Z"/></svg>;
    case 'cpu':        return <svg {...props}><rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3m6-3v3M9 19v3m6-3v3M2 9h3m-3 6h3m14-6h3m-3 6h3"/></svg>;
    case 'flag':       return <svg {...props}><path d="M4 21V4h13l-3 4 3 4H4"/></svg>;
    case 'sliders':    return <svg {...props}><path d="M4 6h8M4 12h2M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="20" cy="18" r="2"/></svg>;
    case 'menu':       return <svg {...props}><path d="M4 6h16M4 12h16M4 18h16"/></svg>;
    case 'more':       return <svg {...props}><circle cx="6" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/></svg>;
    case 'trending-up': return <svg {...props}><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>;
    case 'trending-down': return <svg {...props}><path d="m3 7 6 6 4-4 8 8"/><path d="M14 17h7v-7"/></svg>;
    case 'globe':      return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>;
    case 'lock':       return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>;
    case 'unlock':     return <svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0"/></svg>;
    case 'eye':        return <svg {...props}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'logo-fx':    return <svg {...props}><path d="M5 5h14v4H9v3h8v4H9v3"/></svg>;
    case 'refresh':    return <svg {...props}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>;
    case 'history':    return <svg {...props}><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 8v5l3 2"/></svg>;
    case 'route':      return <svg {...props}><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3 3 0 0 0 0-6h-6a3 3 0 0 1 0-6h7"/></svg>;
    case 'play':       return <svg {...props}><path d="m6 4 14 8-14 8V4Z" fill="currentColor"/></svg>;
    case 'pause':      return <svg {...props}><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>;
    default:           return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2"/></svg>;
  }
}
