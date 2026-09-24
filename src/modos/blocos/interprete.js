// O interpretador dos blocos.
//
// Ele não gera código nenhum: caminha pela árvore de blocos do Blockly e vai
// executando. Isso é de propósito — como o passo a passo é nosso, dá para
// parar em cima de cada bloco, acender ele na tela e seguir devagar, que é o
// "modo lento". Também evita eval, então nada do que o aluno monta vira
// código solto rodando no navegador.

import * as THREE from "three";
import { cena3d } from "../livre3d/cena.js";
import * as pecas from "../livre3d/pecas.js";
import * as projeto from "../livre3d/projeto.js";

// Trava de segurança: o computador da sala não pode travar por causa de um
// "repetir 999 vezes" dentro de outro.
const LIMITE_DE_PASSOS = 20000;
const LIMITE_DE_PECAS = 250;

const grau = (numero) => (numero * Math.PI) / 180;

function centroDaBase() {
  return { x: cena3d.base.largura / 2, z: cena3d.base.profundidade / 2 };
}

function novoEstado() {
  return {
    posicao: { x: 0, y: 0, z: 0 },
    giro: { x: 0, y: 0, z: 0 },
    criadas: [],
    ultima: null,
    contadores: [],
  };
}

// --- Valores -----------------------------------------------------------

function numeroDe(bloco, nome, estado, padrao = 0) {
  const alvo = bloco.getInputTargetBlock ? bloco.getInputTargetBlock(nome) : null;
  if (!alvo) return padrao;
  const valor = avaliar(alvo, estado);
  return Number.isFinite(valor) ? valor : padrao;
}

function avaliar(bloco, estado) {
  switch (bloco.type) {
    case "bura_numero":
      return Number(bloco.getFieldValue("NUM")) || 0;
    case "bura_conta": {
      const a = numeroDe(bloco, "A", estado);
      const b = numeroDe(bloco, "B", estado);
      const op = bloco.getFieldValue("OP");
      if (op === "+") return a + b;
      if (op === "-") return a - b;
      if (op === "*") return a * b;
      return b === 0 ? 0 : a / b;
    }
    case "bura_contador":
      return estado.contadores.length ? estado.contadores[estado.contadores.length - 1] : 0;
    case "bura_acaso": {
      const a = Math.round(numeroDe(bloco, "A", estado));
      const b = Math.round(numeroDe(bloco, "B", estado));
      const menor = Math.min(a, b);
      const maior = Math.max(a, b);
      return menor + Math.floor(Math.random() * (maior - menor + 1));
    }
    default:
      return 0;
  }
}

// --- Peças -------------------------------------------------------------

// Cada forma vira um sólido de solidos.js. A tabela traduz o bloco para o
// tipo e os parâmetros que a peça espera.
const FORMAS = {
  bura_cubo: (b, e) => ["cubo", { lado: numeroDe(b, "LADO", e, 20) }],
  bura_cuboide: (b, e) => [
    "cuboide",
    {
      largura: numeroDe(b, "L", e, 40),
      altura: numeroDe(b, "A", e, 20),
      profundidade: numeroDe(b, "P", e, 20),
    },
  ],
  bura_esfera: (b, e) => ["esfera", { diametro: numeroDe(b, "D", e, 24) }],
  bura_meia_esfera: (b, e) => ["meiaEsfera", { raio: numeroDe(b, "R", e, 15) }],
  bura_cilindro: (b, e) => [
    "cilindro",
    { diametro: numeroDe(b, "D", e, 20), altura: numeroDe(b, "A", e, 30) },
  ],
  bura_cone: (b, e) => [
    "cone",
    { diametro: numeroDe(b, "D", e, 24), altura: numeroDe(b, "A", e, 30) },
  ],
  bura_prisma: (b, e) => [
    "prisma",
    {
      lados: Math.round(numeroDe(b, "N", e, 6)),
      largura: numeroDe(b, "L", e, 26),
      altura: numeroDe(b, "A", e, 30),
    },
  ],
  bura_piramide: (b, e) => [
    "piramide",
    {
      lados: Math.round(numeroDe(b, "N", e, 4)),
      largura: numeroDe(b, "L", e, 26),
      altura: numeroDe(b, "A", e, 30),
    },
  ],
  bura_torus: (b, e) => [
    "torus",
    { diametro: numeroDe(b, "D", e, 30), grossura: numeroDe(b, "G", e, 8) },
  ],
  bura_anel: (b, e) => [
    "anel",
    {
      largura: numeroDe(b, "D", e, 30),
      altura: numeroDe(b, "A", e, 10),
      furo: numeroDe(b, "F", e, 16),
    },
  ],
  bura_estrela: (b, e) => [
    "prismaEstrela",
    {
      pontas: Math.round(numeroDe(b, "N", e, 5)),
      largura: numeroDe(b, "L", e, 30),
      altura: numeroDe(b, "A", e, 12),
    },
  ],
  bura_engrenagem: (b, e) => [
    "engrenagem3d",
    {
      dentes: Math.round(numeroDe(b, "N", e, 12)),
      diametro: numeroDe(b, "D", e, 40),
      altura: numeroDe(b, "A", e, 8),
    },
  ],
};

function nascerForma(bloco, estado) {
  if (estado.criadas.length >= LIMITE_DE_PECAS) {
    throw new Error(`O programa passou de ${LIMITE_DE_PECAS} peças. Diminua as repetições.`);
  }
  const [tipo, params] = FORMAS[bloco.type](bloco, estado);
  // Medidas abaixo de zero quebram a geometria; um aluno vai digitar isso.
  for (const chave of Object.keys(params)) {
    if (!Number.isFinite(params[chave])) params[chave] = 1;
    if (chave !== "furo") params[chave] = Math.max(0.5, params[chave]);
    else params[chave] = Math.max(0, params[chave]);
  }
  const peca = pecas.criar(tipo, params);
  if (!peca) throw new Error("Não consegui montar essa forma com esses números.");
  posicionar(peca, estado);
  estado.criadas.push(peca);
  estado.ultima = peca;
  return peca;
}

// O ponteiro conta a partir do centro da base: (0,0,0) é o meio do chão.
function posicionar(peca, estado) {
  const centro = centroDaBase();
  peca.rotation.set(grau(estado.giro.x), grau(estado.giro.y), grau(estado.giro.z));
  peca.position.set(centro.x + estado.posicao.x, 0, centro.z + estado.posicao.z);
  pecas.pousarNaBase(peca);
  peca.position.y += estado.posicao.y;
}

// --- Caminhada ---------------------------------------------------------

function* executar(bloco, estado) {
  if (FORMAS[bloco.type]) {
    nascerForma(bloco, estado);
    return;
  }

  switch (bloco.type) {
    case "bura_ir_para":
      estado.posicao = {
        x: numeroDe(bloco, "X", estado),
        y: numeroDe(bloco, "Y", estado),
        z: numeroDe(bloco, "Z", estado),
      };
      break;

    case "bura_mover":
      estado.posicao = {
        x: estado.posicao.x + numeroDe(bloco, "X", estado),
        y: estado.posicao.y + numeroDe(bloco, "Y", estado),
        z: estado.posicao.z + numeroDe(bloco, "Z", estado),
      };
      break;

    case "bura_girar": {
      const eixo = bloco.getFieldValue("EIXO") || "y";
      estado.giro[eixo] += numeroDe(bloco, "ANGULO", estado, 0);
      break;
    }

    case "bura_centro":
      estado.posicao = { x: 0, y: 0, z: 0 };
      estado.giro = { x: 0, y: 0, z: 0 };
      break;

    case "bura_negativa":
      if (estado.ultima) pecas.marcarNegativo([estado.ultima], true);
      break;

    case "bura_combinar": {
      const vivas = estado.criadas.filter((peca) => peca.parent);
      if (vivas.length < 2) break;
      const nova = pecas.combinar(vivas);
      if (!nova) throw new Error("Para combinar é preciso ao menos uma peça que não seja negativa.");
      estado.criadas = [nova];
      estado.ultima = nova;
      break;
    }

    case "bura_pousar":
      for (const peca of estado.criadas) {
        if (peca.parent) pecas.pousarNaBase(peca);
      }
      break;

    case "bura_pintar":
      if (estado.ultima) {
        estado.ultima.userData.cor = bloco.getFieldValue("COR") || "#7fb3d5";
        pecas.vestir(estado.ultima);
      }
      break;

    case "bura_textura":
      if (estado.ultima) {
        estado.ultima.userData.textura = bloco.getFieldValue("TIPO") || "nenhuma";
        pecas.vestir(estado.ultima);
      }
      break;

    case "bura_repetir": {
      const vezes = Math.max(0, Math.min(500, Math.round(numeroDe(bloco, "N", estado, 0))));
      const corpo = bloco.getInputTargetBlock("DENTRO");
      for (let volta = 1; volta <= vezes; volta += 1) {
        estado.contadores.push(volta);
        yield* caminhar(corpo, estado);
        estado.contadores.pop();
      }
      break;
    }

    default:
      // Bloco desconhecido: ignora em silêncio, para um arquivo antigo não
      // derrubar o programa inteiro.
      break;
  }
}

function* caminhar(primeiro, estado) {
  let atual = primeiro;
  while (atual) {
    if (!atual.isEnabled || atual.isEnabled()) {
      yield atual;
      yield* executar(atual, estado);
    }
    atual = atual.getNextBlock();
  }
}

// --- Execução ----------------------------------------------------------

export function blocoDeInicio(workspace) {
  return workspace.getTopBlocks(true).find((bloco) => bloco.type === "bura_inicio") || null;
}

export function limparCena() {
  projeto.limparMesa();
  pecas.esconderMarcaDeContato();
}

// Devolve um controlador com parar() e o estado da execução. O modo lento é
// o mesmo caminho, só que consumindo um passo por vez com um intervalo.
export function executarPrograma(workspace, opcoes = {}) {
  const {
    lento = false,
    intervalo = 420,
    aoDestacar = () => {},
    aoContar = () => {},
    aoFim = () => {},
    aoErro = () => {},
  } = opcoes;

  const inicio = blocoDeInicio(workspace);
  if (!inicio) {
    aoErro(new Error('Falta o bloco "quando eu mandar montar" com o programa embaixo.'));
    return null;
  }

  limparCena();
  const estado = novoEstado();
  const passos = caminhar(inicio.getNextBlock(), estado);
  let vivo = true;
  let relogio = null;
  let contagem = 0;

  const encerrar = (erro) => {
    if (!vivo) return;
    vivo = false;
    clearTimeout(relogio);
    aoDestacar(null);
    if (erro) aoErro(erro);
    else aoFim(estado);
  };

  const avancar = () => {
    const passo = passos.next();
    contagem += 1;
    if (contagem > LIMITE_DE_PASSOS) {
      throw new Error("O programa ficou grande demais. Diminua as repetições.");
    }
    if (passo.done) return false;
    aoContar(contagem);
    return passo.value;
  };

  if (!lento) {
    try {
      for (;;) {
        const bloco = avancar();
        if (bloco === false) break;
      }
      encerrar(null);
    } catch (erro) {
      encerrar(erro);
    }
    return { parar: () => encerrar(null), estado, lento: false };
  }

  const tique = () => {
    if (!vivo) return;
    try {
      const bloco = avancar();
      if (bloco === false) {
        encerrar(null);
        return;
      }
      aoDestacar(bloco);
      relogio = setTimeout(tique, intervalo);
    } catch (erro) {
      encerrar(erro);
    }
  };
  relogio = setTimeout(tique, 60);

  return {
    parar: () => encerrar(null),
    estado,
    lento: true,
    get rodando() {
      return vivo;
    },
  };
}

// Enquadra a câmera no que o programa acabou de montar.
export function enquadrarResultado() {
  if (!cena3d.grupoPecas?.children.length) return;
  const caixa = new THREE.Box3();
  for (const peca of cena3d.grupoPecas.children) caixa.expandByObject(peca);
  if (caixa.isEmpty()) return;
  const centro = caixa.getCenter(new THREE.Vector3());
  const tamanho = caixa.getSize(new THREE.Vector3()).length() || 100;
  const direcao = new THREE.Vector3(0.9, 0.75, 1.1).normalize();
  cena3d.camera.position.copy(centro.clone().add(direcao.multiplyScalar(tamanho * 1.25)));
  cena3d.orbita.target.copy(centro);
  cena3d.orbita.update();
}
