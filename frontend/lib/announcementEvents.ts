const EVENT_NAME = "announcement-removed";

export function emitAnnouncementRemoved(id: number) {
  window.dispatchEvent(new CustomEvent<number>(EVENT_NAME, { detail: id }));
}

export function onAnnouncementRemoved(handler: (id: number) => void): () => void {
  const listener = (e: Event) => handler((e as CustomEvent<number>).detail);
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
