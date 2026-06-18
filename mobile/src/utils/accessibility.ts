export const minimumTouchTarget = 44;

export const defaultHitSlop = {
  top: 8,
  right: 8,
  bottom: 8,
  left: 8,
};

export function formFieldLabel(label: string, required = false) {
  return required ? `${label}, required` : label;
}
