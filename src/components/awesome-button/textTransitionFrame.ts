export const TEXT_TRANSITION_DURATION = 320;
export const TEXT_TRANSITION_SETTLE_START = 0.45;

const UPPERCASE_POOL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE_POOL = 'abcdefghijklmnopqrstuvwxyz';
const DIGIT_POOL = '0123456789';
const SYMBOL_POOL = '#%&^+=-';

export type TextTransitionFrame = {
  from: string;
  to: string;
  startedAt: number;
};

function getTransitionCharacterPool(character: string): string {
  if (/[A-Z]/.test(character)) {
    return UPPERCASE_POOL;
  }

  if (/[a-z]/.test(character)) {
    return LOWERCASE_POOL;
  }

  if (/\d/.test(character)) {
    return DIGIT_POOL;
  }

  return SYMBOL_POOL;
}

function getRandomTransitionCharacter(character: string): string {
  if (!character || /\s/.test(character)) {
    return character;
  }

  const pool = getTransitionCharacterPool(character);
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex] || character;
}

export function buildTextTransitionFrame(
  from: string,
  to: string,
  progress: number
) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const peakLength = Math.max(from.length, to.length);
  const settleProgress =
    clampedProgress <= TEXT_TRANSITION_SETTLE_START
      ? 0
      : (clampedProgress - TEXT_TRANSITION_SETTLE_START) /
        (1 - TEXT_TRANSITION_SETTLE_START);

  const currentLength =
    clampedProgress < TEXT_TRANSITION_SETTLE_START
      ? Math.ceil(
          from.length +
            (peakLength - from.length) *
              (clampedProgress / TEXT_TRANSITION_SETTLE_START)
        )
      : Math.ceil(peakLength - (peakLength - to.length) * settleProgress);

  const lockedCharacters = Math.floor(to.length * settleProgress);
  let nextText = '';

  for (let index = 0; index < currentLength; index += 1) {
    const sourceCharacter = from[index] ?? to[index] ?? ' ';
    const targetCharacter = to[index] ?? '';

    if (/\s/.test(targetCharacter || sourceCharacter)) {
      nextText += targetCharacter || sourceCharacter || ' ';
      continue;
    }

    if (settleProgress >= 1 && index < to.length) {
      nextText += targetCharacter;
      continue;
    }

    if (index < lockedCharacters && index < to.length) {
      nextText += targetCharacter;
      continue;
    }

    nextText += getRandomTransitionCharacter(targetCharacter || sourceCharacter);
  }

  return nextText;
}
