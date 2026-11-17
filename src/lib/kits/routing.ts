export function getKitEditorHref(kitId: string) {
  return `/admin/kits?edit=${encodeURIComponent(kitId)}`;
}
