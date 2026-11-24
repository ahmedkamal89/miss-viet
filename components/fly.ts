/** Animates a little dish token from `from` into the visible cart button, then bumps it. */
export function flyToCart(from: Element | null, imageUrl?: string | null) {
  if (typeof window === 'undefined' || !from) return;
  const targets = [...document.querySelectorAll<HTMLElement>('.cart-btn, .cart-bar .btn')].filter((el) => el.offsetParent !== null);
  const to = targets[0];
  const bump = () => window.dispatchEvent(new Event('cart:bump'));
  if (!to || matchMedia('(prefers-reduced-motion: reduce)').matches) return bump();
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const dot = document.createElement('div');
  dot.className = 'fly-dot';
  if (imageUrl) dot.style.backgroundImage = `url("${imageUrl}")`;
  const x0 = a.left + a.width / 2 - 23;
  const y0 = a.top + a.height / 2 - 23;
  const x1 = b.left + b.width / 2 - 23;
  const y1 = b.top + b.height / 2 - 23;
  dot.style.left = `${x0}px`;
  dot.style.top = `${y0}px`;
  document.body.appendChild(dot);
  const dx = x1 - x0;
  const dy = y1 - y0;
  dot
    .animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 140}px) scale(1.25) rotate(160deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(.35) rotate(360deg)`, opacity: 0.6 },
      ],
      { duration: 750, easing: 'cubic-bezier(.4,0,.2,1)' },
    )
    .finished.then(() => {
      dot.remove();
      bump();
    });
}
