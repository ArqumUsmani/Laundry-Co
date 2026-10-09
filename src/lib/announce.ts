// Polite live-region line for screen readers, in place of the visual show.
export function announce(message: string) {
  const region = document.getElementById('live-region');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => {
    region.textContent = message;
  });
}
