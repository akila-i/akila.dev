/** Command-line HTTP clients that get the terminal card at / instead of HTML. */
const TERMINAL_CLIENTS = /^(curl|wget|httpie|xh)\/|PowerShell\//i;

/** True for `curl akila.dev` and friends, unless the client explicitly asks for HTML. */
export function wantsTerminal(headers: Headers): boolean {
  if ((headers.get('accept') ?? '').includes('text/html')) return false;
  return TERMINAL_CLIENTS.test(headers.get('user-agent') ?? '');
}
