/**
 * Browser behavior for the manifest page:
 * the human ⇄ yaml switch, the theme button, expandable trace rows and the Colombo clock.
 * The page is fully rendered at build time; this only adds interaction.
 */
import { formatClock } from '../lib/dates';

type Mode = 'human' | 'yaml';

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const store = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode or storage disabled: the choice just is not remembered */
    }
  },
};

function must<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`missing element: ${selector}`);
  return el;
}

/* ---------- human ⇄ yaml ---------- */

const stage = must<HTMLElement>('#stage');
const scan = must<HTMLElement>('#scan');
const scanCmd = must<HTMLElement>('#scan-cmd');
const modeGroup = must<HTMLElement>('#mode');
const layers: Record<Mode, HTMLElement> = {
  human: must<HTMLElement>('[data-layer="human"]'),
  yaml: must<HTMLElement>('[data-layer="yaml"]'),
};
const COMMAND: Record<Mode, string> = {
  human: 'kubectl describe engineer akila',
  yaml: 'kubectl get engineer akila -o yaml',
};

let mode: Mode = root.dataset.mode === 'yaml' ? 'yaml' : 'human';
let switching = false;

function pressMode(m: Mode): void {
  modeGroup.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
}

function commitMode(m: Mode): void {
  mode = m;
  root.dataset.mode = m;
  store.set('akila.mode', m);
  pressMode(m);
}

const easeInOutCubic = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/** Reveals the next rendering from the top down behind a scan line labelled with its kubectl command. */
function setMode(next: Mode): void {
  if (next === mode || switching) return;
  if (reducedMotion.matches) return commitMode(next);

  switching = true;
  pressMode(next);
  if (scrollY > 0) scrollTo({ top: 0, behavior: 'instant' });

  const incoming = layers[next];
  const height = Math.max(200, Math.min(stage.offsetHeight, innerHeight - stage.getBoundingClientRect().top));
  incoming.classList.add('incoming');
  incoming.style.setProperty('--reveal', '0px');
  scanCmd.textContent = COMMAND[next];
  scan.classList.add('on');

  const t0 = performance.now();
  const DURATION = 760;
  const step = (now: number) => {
    const p = Math.min(1, (now - t0) / DURATION);
    const y = easeInOutCubic(p) * height;
    incoming.style.setProperty('--reveal', `${y}px`);
    scan.style.transform = `translateY(${y}px)`;
    if (p < 1) {
      requestAnimationFrame(step);
      return;
    }
    commitMode(next);
    incoming.classList.remove('incoming');
    incoming.style.removeProperty('--reveal');
    scan.classList.remove('on');
    scan.style.transform = '';
    switching = false;
  };
  requestAnimationFrame(step);
}

modeGroup.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLButtonElement>('button[data-mode]');
  if (b) setMode(b.dataset.mode === 'yaml' ? 'yaml' : 'human');
});
pressMode(mode);

/* ---------- theme: light by default, dark only when chosen ---------- */

const themeBtn = must<HTMLButtonElement>('#theme-btn');
const themeLabel = must<HTMLElement>('[data-theme-label]');
const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

function paintThemeButton(): void {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  themeLabel.textContent = next;
  themeBtn.setAttribute('aria-label', `Switch to ${next} theme`);
}

themeBtn.addEventListener('click', () => {
  const dark = root.dataset.theme !== 'dark';
  if (dark) root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  themeColor?.setAttribute('content', dark ? '#0a0e13' : '#ece9ea');
  store.set('akila.theme', dark ? 'dark' : 'light');
  paintThemeButton();
});
paintThemeButton();

/* ---------- trace rows expand and collapse ---------- */

layers.human.addEventListener('click', (e) => {
  const row = (e.target as Element).closest<HTMLButtonElement>('button[data-span]');
  if (!row) return;
  const open = row.getAttribute('aria-expanded') !== 'true';
  row.setAttribute('aria-expanded', String(open));
  const detail = document.getElementById(`tr-${row.dataset.span}`);
  if (detail) detail.hidden = !open;
});

/* ---------- local time in Colombo, updated on the minute ---------- */

const timeZone = must<HTMLElement>('main').dataset.tz ?? 'UTC';

function paintClock(): void {
  const now = formatClock(timeZone);
  document.querySelectorAll<HTMLElement>('[data-clock]').forEach((n) => (n.textContent = now));
  document.querySelectorAll<HTMLElement>('[data-clock-wrap]').forEach((n) => (n.hidden = false));
}

function tick(): void {
  paintClock();
  setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
}
tick();
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) paintClock();
});

/* ---------- footer: how long this page took to render ---------- */

addEventListener(
  'load',
  () =>
    setTimeout(() => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const meta = document.getElementById('buildmeta');
      if (nav && meta) meta.textContent += ` · rendered in ${Math.round(nav.domContentLoadedEventEnd)} ms`;
    }, 0),
  { once: true },
);
