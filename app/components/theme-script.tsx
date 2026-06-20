import {
  ACCENTS,
  ACCENT_STORAGE,
  DARK_TOKENS,
  LIGHT_TOKENS,
  THEME_STORAGE,
} from "./theme";

const DEFAULT_ACCENT = ACCENTS[0].id;

// Inline bootstrap that applies the saved theme/accent BEFORE first paint, so
// there is no flash of the default light theme. Runs from localStorage; the
// constants are serialized from the single source in theme.ts. Rendered as the
// first node in <body> in the root layout.
export function ThemeScript() {
  const js = `(function(){try{
var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE)})||'dark';
var a=localStorage.getItem(${JSON.stringify(ACCENT_STORAGE)})||${JSON.stringify(DEFAULT_ACCENT)};
var L=${JSON.stringify(LIGHT_TOKENS)},D=${JSON.stringify(DARK_TOKENS)},A=${JSON.stringify(ACCENTS)};
var r=document.documentElement;r.setAttribute('data-theme',t);
var tk=t==='dark'?D:L;for(var k in tk){r.style.setProperty('--color-'+k,tk[k]);}
var ac=A.filter(function(x){return x.id===a;})[0]||A[0];
r.style.setProperty('--color-accent',ac.value);
r.style.setProperty('--color-accent-deep',ac.deep);
r.style.setProperty('--color-accent-soft',ac.soft);
r.style.setProperty('--color-accent-ink',ac.ink);
}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
