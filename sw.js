// Service worker do BuraDESIGN.
// Ao somar ou renomear arquivos, atualize a lista ARQUIVOS e suba o número da
// VERSAO. O cache antigo é apagado sozinho na ativação.

const VERSAO = "0.1.0";
const CACHE = `buradesign-${VERSAO}`;

const ARQUIVOS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "catalogo.json",
  "styles/tokens.css",
  "styles/base.css",
  "styles/shell.css",
  "styles/telas.css",
  "i18n/pt-BR.js",
  "src/core/app.js",
  "src/core/ajustes.js",
  "src/core/arquivos.js",
  "src/core/bolsa.js",
  "src/core/boot.js",
  "src/core/catalogo.js",
  "src/core/deposito.js",
  "src/core/eventos.js",
  "src/core/idioma.js",
  "src/core/registrar-sw.js",
  "src/core/som.js",
  "src/modos/registro.js",
  "src/modos/em-obras.js",
  "src/ui/aliens.js",
  "src/ui/casca.js",
  "src/ui/icones.js",
  "src/ui/inicio.js",
  "src/ui/painel.js",
  "src/ui/painel-ajustes.js",
  "src/ui/painel-bolsa.js",
  "assets/favicon.svg",
  "assets/icones/icone-192.png",
  "assets/icones/icone-512.png",
  "assets/icones/icone-maskable-512.png",
  "assets/icones/apple-touch-icon.png",
];

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ARQUIVOS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes
            .filter((nome) => nome.startsWith("buradesign-") && nome !== CACHE)
            .map((nome) => caches.delete(nome)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET" || new URL(pedido.url).origin !== self.location.origin) return;

  // Navegação: tenta a rede e cai para o index guardado quando estiver offline.
  if (pedido.mode === "navigate") {
    evento.respondWith(
      fetch(pedido).catch(() => caches.match("index.html", { ignoreSearch: true })),
    );
    return;
  }

  evento.respondWith(
    caches.match(pedido, { ignoreSearch: true }).then((guardado) => {
      if (guardado) return guardado;
      return fetch(pedido).then((resposta) => {
        if (resposta.ok && resposta.type === "basic") {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(pedido, copia));
        }
        return resposta;
      });
    }),
  );
});
