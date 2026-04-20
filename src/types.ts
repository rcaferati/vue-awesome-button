import type { Component } from 'vue';

export type ThemeName =
  | 'amber'
  | 'blue'
  | 'bojack'
  | 'bruce'
  | 'c137'
  | 'eric'
  | 'flat'
  | 'indigo'
  | 'red'
  | 'rickiest';

export type ButtonVariant = string;
export type ButtonSize = 'small' | 'medium' | 'large' | null;
export type ButtonPressEvent = MouseEvent | KeyboardEvent | PointerEvent;
export type ButtonReleasedPayload = HTMLElement | null;
export type ButtonRootElement = string | Component;

export interface AwesomeButtonProps {
  type?: ButtonVariant;
  size?: ButtonSize;
  active?: boolean;
  disabled?: boolean;
  visible?: boolean;
  placeholder?: boolean;
  textTransition?: boolean;
  between?: boolean;
  ripple?: boolean;
  moveEvents?: boolean;
  href?: string | null;
  as?: ButtonRootElement;
  theme?: ThemeName | null;
}

export type ProgressNext = (endState?: boolean, errorLabel?: string | null) => void;

export interface AwesomeButtonProgressProps
  extends Omit<AwesomeButtonProps, 'active'> {
  loadingLabel?: string;
  resultLabel?: string;
  releaseDelay?: number;
  showProgressBar?: boolean;
  progressLoadingTime?: number;
}

export type ShareType =
  | 'facebook'
  | 'twitter'
  | 'pinterest'
  | 'linkedin'
  | 'reddit'
  | 'whatsapp'
  | 'messenger'
  | 'mail'
  | 'instagram'
  | string;

export interface SharerConfig {
  image?: string;
  message?: string;
  phone?: string;
  url?: string;
  user?: string;
}

export interface PopupDimensions {
  width: number;
  height: number;
}

export interface SharePayload {
  url?: string;
  text?: string;
  title?: string;
  extra?: string;
}

export interface AwesomeButtonSocialProps extends AwesomeButtonProps {
  sharer?: SharerConfig;
  dimensions?: PopupDimensions;
}
