// O interpretador dos blocos.
//
// Ele não gera código nenhum: caminha pela árvore de blocos do Blockly e vai
// executando. Isso é de propósito — como o passo a passo é nosso, dá para
// parar em cima de cada bloco, acender ele na tela e seguir devagar, que é o
// "modo lento". Também evita eval, então nada do que o aluno monta vira
// código solto rodando no navegador.
//
// Além dos blocos do BuraDESIGN (bura_*), ele entende os blocos que já vêm no
// Blockly: controle, lógica, contas, variáveis e procedimentos.

import * as THREE from "three";
import { cena3d } from "../livre3d/cena.js";
import * as pecas from "../livre3d/pecas.js";
import * as projeto from "../livre3d/projeto.js";

// Travas de segurança: o computador da sala não pode travar por causa de um
// "repetir 999 vezes" dentro de outro, nem de um procedimento que se chama.
const LIMITE_DE_PASSOS = 40000;
const LIMITE_DE_PECAS = 250;
const LIMITE_DE_VOLTAS = 5000;
const LIMITE_DE_CHAMADAS = 60;

const grau = (numero) => (numero * Math.PI) / 180;
const numero = (valor, padrao = 0) => (Number.isFinite(valor) ? valor : padrao);

// Sinal de "sai do procedimento agora", usado pelo bloco de devolver.
class Retorno {
  constructor(valor) {
    this.valor = valor;
  }
}

function centroDaBase() {
  return { x: cena3d.base.largura / 2, z: cena3d.base.profundidade / 2 };
}

function novoEstado(workspace) {
  return {
    workspace,
    posicao: { x: 0, y: 0, z: 0 },
    giro: { x: 0, y: 0, z: 0 },
    criadas: [],
    ultima: null,
    contadores: [],
    variaveis: new Map(),
    chamadas: 0,
  };
}

// --- Valores -----------------------------------------------------------

function alvoDe(bloco, nome) {
  return bloco.getInputTargetBlock ? bloco.getInputTargetBlock(nome) : null;
}

function valorDe(bloco, nome, estado, padrao = 0) {
  const alvo = alvoDe(bloco, nome);
  if (!alvo) return padrao;
  const lido = avaliar(alvo, estado);
  return lido === undefined || lido === null ? padrao : lido;
}

function numeroDe(bloco, nome, estado, padrao = 0) {
  return numero(Number(valorDe(bloco, nome, estado, padrao)), padrao);
}

function verdadeDe(bloco, nome, estado) {
  const lido = valorDe(bloco, nome, estado, false);
  return Boolean(lido);
}

function comparar(a, b, operador) {
  switch (operador) {
    case "=":
    case "EQ":
      return a === b;
    case "!=":
    case "NEQ":
      return a !== b;
    case ">":
    case "GT":
      return a > b;
    case ">=":
    case "GTE":
      return a >= b;
    case "<":
    case "LT":
      return a < b;
    case "<=":
    case "LTE":
      return a <= b;
    default:
      return false;
  }
}

function avaliar(bloco, estado) {
  switch (bloco.type) {
    // --- números e contas ---
    case "bura_numero":
    case "math_number":
      return Number(bloco.getFieldValue("NUM")) || 0;
    case "bura_conta": {
      const a = numeroDe(bloco, "A", estado);
      const b = numeroDe(bloco, "B", estado);
      switch (bloco.getFieldValue("OP")) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "%":
          return b === 0 ? 0 : a % b;
        default:
          return b === 0 ? 0 : a / b;
      }
    }
    case "math_arithmetic": {
      const a = numeroDe(bloco, "A", estado);
      const b = numeroDe(bloco, "B", estado);
      switch (bloco.getFieldValue("OP")) {
        case "ADD":
          return a + b;
        case "MINUS":
          return a - b;
        case "MULTIPLY":
          return a * b;
        case "POWER":
          return a ** b;
        default:
          return b === 0 ? 0 : a / b;
      }
    }
    case "math_random_int": {
      const a = Math.round(numeroDe(bloco, "FROM", estado, 1));
      const b = Math.round(numeroDe(bloco, "TO", estado, 10));
      const menor = Math.min(a, b);
      return menor + Math.floor(Math.random() * (Math.max(a, b) - menor + 1));
    }
    case "bura_acaso": {
      const a = Math.round(numeroDe(bloco, "A", estado));
      const b = Math.round(numeroDe(bloco, "B", estado));
      const menor = Math.min(a, b);
      return menor + Math.floor(Math.random() * (Math.max(a, b) - menor + 1));
    }

    // --- comparações e lógica ---
    case "bura_comparar":
      return comparar(numeroDe(bloco, "A", estado), numeroDe(bloco, "B", estado), bloco.getFieldValue("OP"));
    case "logic_compare":
      return comparar(valorDe(bloco, "A", estado, 0), valorDe(bloco, "B", estado, 0), bloco.getFieldValue("OP"));
    case "logic_operation": {
      const a = verdadeDe(bloco, "A", estado);
      const b = verdadeDe(bloco, "B", estado);
      return bloco.getFieldValue("OP") === "OR" ? a || b : a && b;
    }
    case "logic_negate":
      return !verdadeDe(bloco, "BOOL", estado);
    case "logic_boolean":
      return bloco.getFieldValue("BOOL") === "TRUE";

    // --- estado do ponteiro e da mesa ---
    case "bura_posicao":
      return estado.posicao[bloco.getFieldValue("EIXO")] || 0;
    case "bura_rotacao":
      return estado.giro[bloco.getFieldValue("EIXO")] || 0;
    case "bura_contador":
      return estado.contadores.length ? estado.contadores[estado.contadores.length - 1] : 0;
    case "bura_quantas":
      return estado.criadas.filter((peca) => peca.parent).length;

    // --- variáveis e procedimentos ---
    case "variables_get": {
      const id = bloco.getFieldValue("VAR");
      return estado.variaveis.has(id) ? estado.variaveis.get(id) : 0;
    }
    case "procedures_callreturn":
      return chamarDeUmaVez(bloco, estado, true);

    case "text":
      return bloco.getFieldValue("TEXT");

    default:
      return 0;
  }
}

// --- Procedimentos -----------------------------------------------------

function nomeDaChamada(bloco) {
  return bloco.getProcedureCall ? bloco.getProcedureCall() : bloco.getFieldValue("NAME");
}

function acharDefinicao(nome, estado) {
  const alvo = String(nome).toLowerCase();
  for (const topo of estado.workspace.getTopBlocks(false)) {
    if (topo.type !== "procedures_defnoreturn" && topo.type !== "procedures_defreturn") continue;
    if (String(topo.getFieldValue("NAME")).toLowerCase() === alvo) return topo;
  }
  return null;
}

// Guarda o valor antigo de cada parâmetro e põe o novo no lugar. Ao sair, o
// antigo volta: sem isso, chamar um bloco dentro do outro embaralhava tudo.
function abrirQuadro(definicao, chamada, estado) {
  const modelos = definicao.getVarModels?.() || [];
  const guardado = [];
  modelos.forEach((modelo, indice) => {
    const id = modelo.getId();
    guardado.push([id, estado.variaveis.has(id) ? estado.variaveis.get(id) : undefined]);
    estado.variaveis.set(id, valorDe(chamada, `ARG${indice}`, estado, 0));
  });
  estado.chamadas += 1;
  if (estado.chamadas > LIMITE_DE_CHAMADAS) {
    throw new Error("Um bloco está chamando a si mesmo sem parar. Confira a condição de saída.");
  }
  return guardado;
}

function fecharQuadro(guardado, estado) {
  for (const [id, antigo] of guardado) {
    if (antigo === undefined) estado.variaveis.delete(id);
    else estado.variaveis.set(id, antigo);
  }
  estado.chamadas -= 1;
}

// Chamada dentro de uma expressão: roda de uma vez só, sem passo a passo,
// porque um valor precisa ficar pronto na hora.
function chamarDeUmaVez(bloco, estado, querResposta) {
  const definicao = acharDefinicao(nomeDaChamada(bloco), estado);
  if (!definicao) return querResposta ? 0 : undefined;
  const guardado = abrirQuadro(definicao, bloco, estado);
  let resposta = 0;
  try {
    const gerador = caminhar(definicao.getInputTargetBlock("STACK"), estado);
    // Consumir o gerador inteiro é o mesmo que executar tudo.
    for (const _passo of gerador) {
      // sem pausa aqui
    }
    if (definicao.type === "procedures_defreturn") {
      resposta = valorDe(definicao, "RETURN", estado, 0);
    }
  } catch (erro) {
    if (erro instanceof Retorno) resposta = erro.valor;
    else throw erro;
  } finally {
    fecharQuadro(guardado, estado);
  }
  return resposta;
}

// Chamada como comando: entra no procedimento passo a passo, então o modo
// lento acende os blocos de dentro também.
function* chamarComPassos(bloco, estado) {
  const definicao = acharDefinicao(nomeDaChamada(bloco), estado);
  if (!definicao) {
    throw new Error(`Não achei o bloco "${nomeDaChamada(bloco)}". Ele foi apagado?`);
  }
  const guardado = abrirQuadro(definicao, bloco, estado);
  try {
    yield* caminhar(definicao.getInputTargetBlock("STACK"), estado);
  } catch (erro) {
    if (!(erro instanceof Retorno)) throw erro;
  } finally {
    fecharQuadro(guardado, estado);
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
    params[chave] = chave === "furo" ? Math.max(0, params[chave]) : Math.max(0.5, params[chave]);
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
    // --- ponteiro ---
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

    case "bura_girar":
      estado.giro[bloco.getFieldValue("EIXO") || "y"] += numeroDe(bloco, "ANGULO", estado, 0);
      break;

    case "bura_apontar":
      estado.giro[bloco.getFieldValue("EIXO") || "y"] = numeroDe(bloco, "ANGULO", estado, 0);
      break;

    case "bura_centro":
      estado.posicao = { x: 0, y: 0, z: 0 };
      estado.giro = { x: 0, y: 0, z: 0 };
      break;

    // --- combinar ---
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

    // --- aparência ---
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

    // --- controle ---
    case "bura_repetir": {
      const vezes = Math.max(0, Math.min(LIMITE_DE_VOLTAS, Math.round(numeroDe(bloco, "N", estado, 0))));
      const corpo = bloco.getInputTargetBlock("DENTRO");
      for (let volta = 1; volta <= vezes; volta += 1) {
        estado.contadores.push(volta);
        yield* caminhar(corpo, estado);
        estado.contadores.pop();
      }
      break;
    }

    case "controls_repeat_ext": {
      const vezes = Math.max(0, Math.min(LIMITE_DE_VOLTAS, Math.round(numeroDe(bloco, "TIMES", estado, 0))));
      const corpo = bloco.getInputTargetBlock("DO");
      for (let volta = 1; volta <= vezes; volta += 1) {
        estado.contadores.push(volta);
        yield* caminhar(corpo, estado);
        estado.contadores.pop();
      }
      break;
    }

    case "controls_for": {
      const id = bloco.getFieldValue("VAR");
      const de = numeroDe(bloco, "FROM", estado, 1);
      const ate = numeroDe(bloco, "TO", estado, 1);
      const passoBruto = Math.abs(numeroDe(bloco, "BY", estado, 1)) || 1;
      const corpo = bloco.getInputTargetBlock("DO");
      const passo = de <= ate ? passoBruto : -passoBruto;
      let voltas = 0;
      for (let i = de; passo > 0 ? i <= ate : i >= ate; i += passo) {
        estado.variaveis.set(id, i);
        estado.contadores.push(voltas + 1);
        yield* caminhar(corpo, estado);
        estado.contadores.pop();
        voltas += 1;
        if (voltas > LIMITE_DE_VOLTAS) throw new Error("O 'para' deu voltas demais.");
      }
      break;
    }

    case "controls_whileUntil": {
      const ateSerVerdade = bloco.getFieldValue("MODE") === "UNTIL";
      const corpo = bloco.getInputTargetBlock("DO");
      let voltas = 0;
      for (;;) {
        const condicao = verdadeDe(bloco, "BOOL", estado);
        if (ateSerVerdade ? condicao : !condicao) break;
        yield* caminhar(corpo, estado);
        voltas += 1;
        if (voltas > LIMITE_DE_VOLTAS) {
          throw new Error("O 'repetir enquanto' não parou. Confira a condição.");
        }
      }
      break;
    }

    case "controls_if": {
      let escolhido = null;
      for (let i = 0; bloco.getInput(`IF${i}`); i += 1) {
        if (verdadeDe(bloco, `IF${i}`, estado)) {
          escolhido = bloco.getInputTargetBlock(`DO${i}`);
          break;
        }
      }
      if (!escolhido && bloco.getInput("ELSE")) escolhido = bloco.getInputTargetBlock("ELSE");
      if (escolhido) yield* caminhar(escolhido, estado);
      break;
    }

    // --- variáveis ---
    case "variables_set":
      estado.variaveis.set(bloco.getFieldValue("VAR"), valorDe(bloco, "VALUE", estado, 0));
      break;

    case "math_change": {
      const id = bloco.getFieldValue("VAR");
      const antes = Number(estado.variaveis.get(id)) || 0;
      estado.variaveis.set(id, antes + numeroDe(bloco, "DELTA", estado, 1));
      break;
    }

    // --- procedimentos ---
    case "procedures_callnoreturn":
      yield* chamarComPassos(bloco, estado);
      break;

    case "procedures_ifreturn":
      if (verdadeDe(bloco, "CONDITION", estado)) {
        throw new Retorno(bloco.getInput("VALUE") ? valorDe(bloco, "VALUE", estado, 0) : 0);
      }
      break;

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
  const estado = novoEstado(workspace);
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
        if (avancar() === false) break;
      }
      encerrar(null);
    } catch (erro) {
      encerrar(erro instanceof Retorno ? null : erro);
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
      encerrar(erro instanceof Retorno ? null : erro);
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
