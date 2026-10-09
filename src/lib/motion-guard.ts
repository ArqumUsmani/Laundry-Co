// One answer to "may I animate?"
export const motion = {
  get reduced() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  get hasHover() {
    return matchMedia('(hover: hover) and (pointer: fine)').matches;
  },
};
