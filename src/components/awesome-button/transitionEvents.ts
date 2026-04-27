export function isTransformTransitionEnd(event: Event) {
  return (event as TransitionEvent).propertyName === 'transform';
}

export function isAutoWidthTransitionEnd(event: Event) {
  const propertyName = (event as TransitionEvent).propertyName;
  return propertyName === 'width' || propertyName === 'flex-basis';
}
