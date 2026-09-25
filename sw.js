// Service worker do BuraDESIGN.
// Ao somar ou renomear arquivos, atualize a lista ARQUIVOS e suba o número da
// VERSAO. O cache antigo é apagado sozinho na ativação.

const VERSAO = "1.5.0";
const CACHE = `buradesign-${VERSAO}`;

const ARQUIVOS = [
  "./",
  "assets/aliens/krux.svg",
  "assets/aliens/nibla.svg",
  "assets/aliens/pip.svg",
  "assets/aliens/zorp.svg",
  "assets/favicon.svg",
  "assets/fontes/caladea-bold.ttf",
  "assets/fontes/caladea-regular.ttf",
  "assets/fontes/fontes.json",
  "assets/fontes/mono-bold.ttf",
  "assets/fontes/mono-regular.ttf",
  "assets/fontes/poppins-bold.ttf",
  "assets/fontes/poppins-regular.ttf",
  "assets/icones/apple-touch-icon.png",
  "assets/icones/icone-192.png",
  "assets/icones/icone-512.png",
  "assets/icones/icone-maskable-512.png",
  "catalogo.json",
  "i18n/pt-BR.js",
  "index.html",
  "libs/blockly/blockly.min.js",
  "libs/blockly/media/sprites.png",
  "libs/blockly/msg-pt-br.js",
  "libs/csg/three-bvh-csg.module.js",
  "libs/csg/three-mesh-bvh.module.js",
  "libs/opentype/opentype.min.js",
  "libs/paper/paper-core.min.js",
  "libs/three/jsm/BufferGeometryUtils.js",
  "libs/three/jsm/controls/OrbitControls.js",
  "libs/three/jsm/controls/TransformControls.js",
  "libs/three/jsm/exporters/STLExporter.js",
  "libs/three/jsm/lines/Line2.js",
  "libs/three/jsm/lines/LineGeometry.js",
  "libs/three/jsm/lines/LineMaterial.js",
  "libs/three/jsm/lines/LineSegments2.js",
  "libs/three/jsm/lines/LineSegmentsGeometry.js",
  "libs/three/jsm/loaders/GLTFLoader.js",
  "libs/three/jsm/loaders/OBJLoader.js",
  "libs/three/jsm/loaders/STLLoader.js",
  "libs/three/jsm/loaders/SVGLoader.js",
  "libs/three/jsm/utils/BufferGeometryUtils.js",
  "libs/three/three.module.js",
  "manifest.webmanifest",
  "src/core/ajustes.js",
  "src/core/app.js",
  "src/core/arquivos.js",
  "src/core/bolsa.js",
  "src/core/boot.js",
  "src/core/carregar-script.js",
  "src/core/catalogo.js",
  "src/core/deposito.js",
  "src/core/eventos.js",
  "src/core/idioma.js",
  "src/core/registrar-sw.js",
  "src/core/som.js",
  "src/modos/blocos/avaliar.js",
  "src/modos/blocos/blocos.js",
  "src/modos/blocos/desafios.js",
  "src/modos/blocos/gizmo.js",
  "src/modos/blocos/interprete.js",
  "src/modos/blocos/livre.js",
  "src/modos/blocos/lote1.js",
  "src/modos/blocos/lote2.js",
  "src/modos/blocos/lote3.js",
  "src/modos/blocos/menu.js",
  "src/modos/blocos/progresso.js",
  "src/modos/blocos/receita.js",
  "src/modos/em-obras.js",
  "src/modos/livre/caneta.js",
  "src/modos/livre/combinar.js",
  "src/modos/livre/estado.js",
  "src/modos/livre/formas.js",
  "src/modos/livre/historico.js",
  "src/modos/livre/indice.js",
  "src/modos/livre/menu.js",
  "src/modos/livre/mesa.js",
  "src/modos/livre/organizar.js",
  "src/modos/livre/painel.js",
  "src/modos/livre/ponte.js",
  "src/modos/livre/projeto.js",
  "src/modos/livre/remodelar.js",
  "src/modos/livre/selecao.js",
  "src/modos/livre/texto.js",
  "src/modos/livre3d/cena.js",
  "src/modos/livre3d/indice.js",
  "src/modos/livre3d/malha.js",
  "src/modos/livre3d/pecas.js",
  "src/modos/livre3d/projeto.js",
  "src/modos/livre3d/solidos.js",
  "src/modos/livre3d/texto3d.js",
  "src/modos/livre3d/travessia.js",
  "src/modos/registro.js",
  "src/ui/aliens.js",
  "src/ui/campo-numero.js",
  "src/ui/casca.js",
  "src/ui/icones-ferramentas.js",
  "src/ui/icones.js",
  "src/ui/inicio.js",
  "src/ui/menu-flutuante.js",
  "src/ui/painel-ajustes.js",
  "src/ui/painel-bolsa.js",
  "src/ui/painel.js",
  "styles/base.css",
  "styles/blocos.css",
  "styles/livre.css",
  "styles/shell.css",
  "styles/telas.css",
  "styles/tokens.css",
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
