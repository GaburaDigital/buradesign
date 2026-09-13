// Registro do service worker. É o que permite abrir a oficina sem internet
// depois da primeira visita, e o que torna a instalação como aplicativo possível.

export const CHAVE_CACHE = "buradesign-";

export function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol === "file:") {
    console.info("Abra por um servidor local ou pelo GitHub Pages para ativar o modo offline.");
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((erro) => {
      console.warn("Service worker não registrado", erro);
    });
  });
}
