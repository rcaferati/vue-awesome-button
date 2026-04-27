import type {
  AutoTextTransitionFlow,
  AutoWidthInlineStyleSnapshot,
  AutoWidthValues,
} from './types';

export const DEFAULT_AUTO_WIDTHS = Object.freeze({
  content: null as number | null,
  label: null as number | null,
});

export const AUTO_WIDTH_TRANSITION_FALLBACK_MS = 175;

export function readSnappedWidth(element: HTMLElement | null): number | null {
  if (!element) {
    return null;
  }

  const scrollWidth = element.scrollWidth;
  if (scrollWidth > 0) {
    return scrollWidth;
  }

  const rectWidth = element.getBoundingClientRect().width;
  if (Number.isFinite(rectWidth) && rectWidth > 0) {
    return Math.ceil(rectWidth);
  }

  return null;
}

export function readClonedAutoWidths(
  contentElement: HTMLElement,
  measurementLabelText: string
): AutoWidthValues | null {
  const parentElement = contentElement.parentElement;

  if (!parentElement) {
    return null;
  }

  const clone = contentElement.cloneNode(true) as HTMLElement;
  const cloneLabel = clone.querySelector('.aws-btn__label') as HTMLElement | null;

  clone.style.position = 'absolute';
  clone.style.visibility = 'hidden';
  clone.style.pointerEvents = 'none';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.width = 'auto';
  clone.style.flexBasis = 'auto';
  clone.style.flexGrow = '0';
  clone.style.flexShrink = '1';
  clone.style.transition = 'none';

  if (cloneLabel) {
    cloneLabel.textContent = measurementLabelText;
    cloneLabel.style.width = 'auto';
    cloneLabel.style.flexBasis = 'auto';
    cloneLabel.style.flexGrow = '0';
    cloneLabel.style.flexShrink = '1';
    cloneLabel.style.transition = 'none';
  }

  parentElement.appendChild(clone);

  const widths = {
    content: readSnappedWidth(clone),
    label: readSnappedWidth(cloneLabel),
  };

  clone.remove();

  if (widths.content == null && widths.label == null) {
    return null;
  }

  return widths;
}

function readLiveAutoWidths(
  contentElement: HTMLElement,
  labelElement: HTMLElement
): AutoWidthValues {
  contentElement.style.width = 'auto';
  contentElement.style.flexBasis = 'auto';
  contentElement.style.flexGrow = '0';
  contentElement.style.flexShrink = '1';
  labelElement.style.width = 'auto';
  labelElement.style.flexBasis = 'auto';
  labelElement.style.flexGrow = '0';
  labelElement.style.flexShrink = '1';

  return {
    content: readSnappedWidth(contentElement),
    label: readSnappedWidth(labelElement),
  };
}

export function readMeasuredAutoWidths(
  contentElement: HTMLElement,
  labelElement: HTMLElement,
  measurementLabelText: string | null
): AutoWidthValues {
  return (
    (measurementLabelText != null
      ? readClonedAutoWidths(contentElement, measurementLabelText)
      : null) ?? readLiveAutoWidths(contentElement, labelElement)
  );
}

export function getAutoTextTransitionFlow(
  currentWidths: AutoWidthValues,
  targetWidths: AutoWidthValues | null
): AutoTextTransitionFlow | null {
  const currentWidth = currentWidths.content;
  const nextWidth = targetWidths?.content;

  if (currentWidth == null || nextWidth == null) {
    return null;
  }

  if (nextWidth > currentWidth) {
    return 'grow-first';
  }

  if (nextWidth < currentWidth) {
    return 'text-first';
  }

  return 'text-only';
}

export function captureAutoWidthInlineStyleSnapshot(
  contentElement: HTMLElement,
  labelElement: HTMLElement
): AutoWidthInlineStyleSnapshot {
  return {
    contentWidth: contentElement.style.width,
    contentFlexBasis: contentElement.style.flexBasis,
    contentFlexGrow: contentElement.style.flexGrow,
    contentFlexShrink: contentElement.style.flexShrink,
    contentTransition: contentElement.style.transition,
    labelWidth: labelElement.style.width,
    labelFlexBasis: labelElement.style.flexBasis,
    labelFlexGrow: labelElement.style.flexGrow,
    labelFlexShrink: labelElement.style.flexShrink,
    labelTransition: labelElement.style.transition,
  };
}

export function restoreAutoWidthInlineStyles(
  contentElement: HTMLElement,
  labelElement: HTMLElement,
  snapshot: AutoWidthInlineStyleSnapshot
) {
  contentElement.style.width = snapshot.contentWidth;
  contentElement.style.flexBasis = snapshot.contentFlexBasis;
  contentElement.style.flexGrow = snapshot.contentFlexGrow;
  contentElement.style.flexShrink = snapshot.contentFlexShrink;
  contentElement.style.transition = snapshot.contentTransition;
  labelElement.style.width = snapshot.labelWidth;
  labelElement.style.flexBasis = snapshot.labelFlexBasis;
  labelElement.style.flexGrow = snapshot.labelFlexGrow;
  labelElement.style.flexShrink = snapshot.labelFlexShrink;
  labelElement.style.transition = snapshot.labelTransition;
}

export function restoreAutoWidthTransitionStart(
  contentElement: HTMLElement,
  labelElement: HTMLElement,
  startWidths: AutoWidthValues,
  snapshot: AutoWidthInlineStyleSnapshot
) {
  contentElement.style.transition = 'none';
  labelElement.style.transition = 'none';
  contentElement.style.width = `${startWidths.content}px`;
  contentElement.style.flexBasis = `${startWidths.content}px`;
  contentElement.style.flexGrow = '0';
  contentElement.style.flexShrink = '0';

  if (startWidths.label != null) {
    labelElement.style.width = `${startWidths.label}px`;
    labelElement.style.flexBasis = `${startWidths.label}px`;
    labelElement.style.flexGrow = '0';
    labelElement.style.flexShrink = '0';
  } else {
    labelElement.style.width = snapshot.labelWidth;
    labelElement.style.flexBasis = snapshot.labelFlexBasis;
    labelElement.style.flexGrow = snapshot.labelFlexGrow;
    labelElement.style.flexShrink = snapshot.labelFlexShrink;
  }

  void contentElement.offsetWidth;
  void labelElement.offsetWidth;
  contentElement.style.transition = snapshot.contentTransition;
  labelElement.style.transition = snapshot.labelTransition;
}
