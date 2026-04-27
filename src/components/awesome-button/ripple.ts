const RIPPLE_FALLBACK_MS = 420;

export function createRipple(
  event: PointerEvent,
  wrapperElement: HTMLElement | null,
  contentElement: HTMLElement | null
) {
  if (typeof document === 'undefined' || !wrapperElement || !contentElement) {
    return;
  }

  const bounds = wrapperElement.getBoundingClientRect();
  const bubble = document.createElement('span');
  const size = bounds.width < 50 ? bounds.width * 3 : bounds.width * 2;
  const clientX = event.clientX ?? bounds.left + bounds.width / 2;
  const clientY = event.clientY ?? bounds.top + bounds.height / 2;

  bubble.className = 'aws-btn__bubble';
  bubble.style.left = `${clientX - bounds.left - size / 2}px`;
  bubble.style.top = `${clientY - bounds.top - size / 2}px`;
  bubble.style.width = `${size}px`;
  bubble.style.height = `${size}px`;

  let removed = false;
  let timeoutId: number | null = null;

  const cleanup = () => {
    if (removed) {
      return;
    }

    removed = true;
    bubble.removeEventListener('animationend', cleanup);
    if (timeoutId !== null && typeof window !== 'undefined') {
      window.clearTimeout(timeoutId);
    }
    bubble.remove();
  };

  bubble.addEventListener('animationend', cleanup);

  if (typeof window !== 'undefined') {
    timeoutId = window.setTimeout(cleanup, RIPPLE_FALLBACK_MS);
    window.requestAnimationFrame(() => {
      contentElement.appendChild(bubble);
    });
  } else {
    contentElement.appendChild(bubble);
  }
}
