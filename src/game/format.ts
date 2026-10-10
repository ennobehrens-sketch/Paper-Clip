// Number and time formatting, ported as-is from the original so displayed values match.
// Note that formatWithCommas truncates decimals rather than rounding, like the original.

export function formatWithCommas(num: number, decimal?: number): string {
  let hasDot = false;
  let base = num.toString();
  if (base.indexOf('e+') !== -1) {
    const splittedExponentNum = base.split('e+');
    let exponent = Number(splittedExponentNum[1]);
    let str = '';
    if (base.indexOf('.') !== -1) {
      const parts = splittedExponentNum[0].split('.');
      exponent -= parts[1].length;
      base = parts.join('');
    }
    // (Without a dot the original keeps the "e+" text in `base`; kept as-is.)
    while (exponent--) str = str + '0';
    base = base + str;
  }
  if (base.indexOf('.') !== -1) hasDot = true;
  if (decimal === 0) {
    if (base.length <= 3 && !hasDot) return base;
  }
  if (typeof decimal === 'undefined') decimal = 0;
  const leftNum = hasDot ? base.substr(0, base.indexOf('.')) : base;
  if (decimal === 0) {
    if (num <= 999) return leftNum;
    return leftNum.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
  }
  let dec = hasDot ? base.substr(base.indexOf('.'), decimal + 1) : '.';
  while (dec.length < decimal + 1) dec += '0';
  if (num <= 999) return leftNum + dec;
  return leftNum.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,') + dec;
}

/** `t` is in 10ms ticks, like the original's `ticks` counter. */
export function timeCruncher(t: number): string {
  const x = t / 100;
  const h = Math.floor(x / 3600);
  const m = Math.floor((x % 3600) / 60);
  const s = Math.floor((x % 3600) % 60);
  const hDisplay = h > 0 ? h + (h == 1 ? ' hour ' : ' hours ') : '';
  const mDisplay = m > 0 ? m + (m == 1 ? ' minute ' : ' minutes ') : '';
  const sDisplay = s > 0 ? s + (s == 1 ? ' second' : ' seconds') : '';
  return hDisplay + mDisplay + sDisplay;
}
