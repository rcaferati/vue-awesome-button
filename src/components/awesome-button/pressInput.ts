import type { PointerZone } from './types';

export function isActivationKey(event: KeyboardEvent) {
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
}

export function isKeyboardClick(event: MouseEvent) {
  return event.detail === 0;
}

export function getMoveState(clientX: number, element: HTMLElement): PointerZone {
  const { left } = element.getBoundingClientRect();
  const width = element.offsetWidth;

  if (clientX < left + width * 0.3) {
    return 'left';
  }
  if (clientX > left + width * 0.65) {
    return 'right';
  }
  return 'middle';
}
