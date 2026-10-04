// A cena da simulação 2D: a lista de peças, a lista de restrições e as regras
// de quem pode ligar em quem.
//
// Este arquivo é só dados e regras. Ele não sabe desenhar e não sabe simular —
// de propósito. O motor de física (mundo2d.js) lê daqui e escreve de volta; a
// tela (desenho2d.js) só lê. Separado assim, a cena pode ser salva, importada
// e conferida em teste sem precisar de navegador nem de canvas.
//
// Tudo em milímetros e graus, como no resto do BuraDESIGN.

import {
  medidasDaForma,
  areaDaForma,
  medidasDaEngrenagem,
  pecaDoCatalogo,
  contornoDaForma,
  furosDaBarra,
} from "./formas2d.js";
import { receitaDoMaterial, pesoEmGramas } from "./unidades.js";
import { novoAcionamento } from "./atuadores.js";

export const FORMATO = "buradesign.fisica2d";
export const VERSAO_FORMATO = 1;

// Quantos corpos a bancada aguenta antes de avisar, e quantos antes de gritar.
// O aluno nunca é impedido de continuar: o aviso é crítico, mas a porta fica
// aberta. Travar a edição de quem está no meio de uma montagem é pior do que
// deixar a simulação pesada.
export const CORPOS_PARA_AVISAR = 40;
export const CORPOS_PARA_ALERTA_CRITICO = 80;

export const TIPOS_DE_JUNTA = Object.freeze({
  pino: {
    id: "pino",
    nome: "Pino",
    icone: "juntaPino",
    dica: "Deixa as duas peças girarem em volta do mesmo ponto. É o parafuso da montagem.",
    aceitaMotor: true,
    precisaDeDois: true,
  },
  solda: {
    id: "solda",
    nome: "Solda",
    icone: "juntaSolda",
    dica: "Cola as duas peças como se fossem uma só. Nada de giro, nada de folga.",
    aceitaMotor: false,
    precisaDeDois: true,
  },
  trilho: {
    id: "trilho",
    nome: "Trilho",
    icone: "juntaTrilho",
    dica: "A peça só desliza numa direção, como gaveta ou pistão.",
    aceitaMotor: false,
    precisaDeDois: true,
  },
  vareta: {
    id: "vareta",
    nome: "Vareta",
    icone: "juntaVareta",
    dica: "Mantém a distância entre dois pontos. Marcando 'elástica', vira mola.",
    aceitaMotor: false,
    precisaDeDois: true,
  },
  engrenar: {
    id: "engrenar",
    nome: "Engrenar",
    icone: "juntaEngrenar",
    dica: "Trava a razão entre duas engrenagens que já têm eixo. A conta vem dos dentes.",
    aceitaMotor: false,
    precisaDeDois: true,
    sóEngrenagens: true,
  },
});

export const ORDEM_DAS_JUNTAS = ["pino", "solda", "trilho", "vareta", "engrenar"];

let contador = 0;

export function reiniciarContagem(de = 0) {
  contador = de;
}

function novoId(prefixo) {
  contador += 1;
  return `${prefixo}${contador}`;
}

export function novaCena(dados = {}) {
  return {
    ...dados,
    formato: FORMATO,
    versao: VERSAO_FORMATO,
    nome: dados.nome || "Montagem sem nome",
    // "lado" é a vista em pé, com a gravidade apontando para baixo da tela:
    // alavanca, gangorra, catapulta. "cima" é a vista de cima da mesa, sem
    // gravidade na tela: engrenagem, came, mesa giratória.
    vista: dados.vista === "cima" ? "cima" : "lado",
    gravidade: dados.gravidade !== false,
    pecas: Array.isArray(dados.pecas) ? dados.pecas : [],
    juntas: Array.isArray(dados.juntas) ? dados.juntas : [],
  };
}

// A gravidade só existe na vista de lado. De cima, uma peça "cair" não quer
// dizer nada — ela estaria encostada na mesa.
export function gravidadeLigada(cena) {
  return cena.vista === "lado" && cena.gravidade !== false;
}

export function novaPeca(dados = {}) {
  const forma = dados.forma || { tipo: "retangulo", largura: 100, altura: 20 };
  return {
    id: dados.id || novoId("p"),
    nome: dados.nome || "Peça",
    catalogo: dados.catalogo || null,
    forma,
    material: dados.material || "madeira",
    // Só vão escritos quando o aluno mexeu; sem eles vale o material.
    densidade: dados.densidade,
    espessura: dados.espessura,
    atrito: dados.atrito,
    quique: dados.quique,
    fixado: Boolean(dados.fixado),
    colisao: dados.colisao === "exata" ? "exata" : "simples",
    borracha: Boolean(dados.borracha),
    tijolos: Boolean(dados.tijolos),
    x: Number.isFinite(dados.x) ? dados.x : 0,
    y: Number.isFinite(dados.y) ? dados.y : 0,
    giro: Number.isFinite(dados.giro) ? dados.giro : 0,
  };
}

export function pecaDoMenu(id, onde = { x: 0, y: 0 }) {
  const ficha = pecaDoCatalogo(id);
  if (!ficha) return null;
  const receita = ficha.criar();
  return novaPeca({
    ...receita,
    catalogo: id,
    nome: ficha.nome,
    x: onde.x,
    y: onde.y,
  });
}

export function adicionarPeca(cena, peca) {
  cena.pecas.push(peca);
  return peca;
}

export function pecaPorId(cena, id) {
  return cena.pecas.find((peca) => peca.id === id) || null;
}

export function juntaPorId(cena, id) {
  return cena.juntas.find((junta) => junta.id === id) || null;
}

// Tirar uma peça tira junto tudo o que estava preso nela. Deixar uma junta
// órfã apontando para uma peça que não existe mais é a receita certa para a
// simulação explodir na próxima vez que abrir.
export function removerPeca(cena, id) {
  cena.pecas = cena.pecas.filter((peca) => peca.id !== id);
  cena.juntas = cena.juntas.filter((junta) => junta.a !== id && junta.b !== id);
}

export function removerJunta(cena, id) {
  const indo = juntaPorId(cena, id);
  cena.juntas = cena.juntas.filter((junta) => junta.id !== id);
  // Engrenar depende dos pinos das duas engrenagens. Se o pino foi embora, o
  // engrenamento vai com ele.
  if (indo && indo.tipo === "pino") {
    cena.juntas = cena.juntas.filter(
      (junta) => junta.tipo !== "engrenar" || (podeEngrenar(cena, junta.a) && podeEngrenar(cena, junta.b)),
    );
  }
}

export function novaJunta(dados = {}) {
  const tipo = TIPOS_DE_JUNTA[dados.tipo] ? dados.tipo : "pino";
  return {
    id: dados.id || novoId("j"),
    tipo,
    a: dados.a || null,
    b: dados.b || null,
    // Os dois pontos escolhidos, cada um nas coordenadas da sua peça.
    pa: dados.pa ? [...dados.pa] : [0, 0],
    pb: dados.pb ? [...dados.pb] : [0, 0],
    acionamento: dados.acionamento || null,
    // Trilho: a direção em que a peça pode escorregar, em graus.
    eixo: Number.isFinite(dados.eixo) ? dados.eixo : 0,
    // Vareta: comprimento travado (calculado na montagem quando não vier) e
    // se ela cede como mola.
    comprimento: Number.isFinite(dados.comprimento) ? dados.comprimento : null,
    elastica: Boolean(dados.elastica),
    // Engrenar: a razão sai dos dentes, mas pode ser escrita na mão.
    razao: Number.isFinite(dados.razao) ? dados.razao : null,
  };
}

export function adicionarJunta(cena, junta) {
  cena.juntas.push(junta);
  return junta;
}

// --- as regras de quem liga em quem --------------------------------------

export function temPino(cena, idDaPeca) {
  return cena.juntas.some(
    (junta) => junta.tipo === "pino" && (junta.a === idDaPeca || junta.b === idDaPeca),
  );
}

function podeEngrenar(cena, idDaPeca) {
  const peca = pecaPorId(cena, idDaPeca);
  return Boolean(peca && peca.forma.tipo === "engrenagem" && temPino(cena, idDaPeca));
}

// A resposta vai para a tela do jeito que o aluno precisa ouvir: ou "pode",
// ou o motivo exato de não poder.
export function conferirJunta(cena, { tipo, a, b }) {
  const ficha = TIPOS_DE_JUNTA[tipo];
  if (!ficha) return { pode: false, motivo: "Não conheço esse tipo de restrição." };
  const pecaA = pecaPorId(cena, a);
  if (!pecaA) return { pode: false, motivo: "Escolha a primeira peça." };
  if (ficha.precisaDeDois && !b) {
    // Ligar no mundo é permitido para o pino, o trilho e a vareta: é o eixo
    // preso na bancada e o tirante preso na parede.
    if (tipo === "pino" || tipo === "vareta" || tipo === "trilho") {
      // Mas não para uma peça ancorada. Prender na bancada o que já está
      // preso na bancada não faz nada, e descobrir isso só depois de apertar
      // Iniciar e ver a peça parada é frustração à toa.
      if (pecaA.fixado) {
        return {
          pode: false,
          motivo: `${pecaA.nome} está fixada no lugar. Solte ela antes de pôr ${ficha.nome.toLowerCase()} na bancada.`,
        };
      }
      return { pode: true, noMundo: true };
    }
    return { pode: false, motivo: `${ficha.nome} precisa de duas peças.` };
  }
  if (b && a === b) return { pode: false, motivo: "Escolha duas peças diferentes." };
  const pecaB = b ? pecaPorId(cena, b) : null;
  if (b && !pecaB) return { pode: false, motivo: "A segunda peça não está mais na bancada." };

  if (tipo === "engrenar") {
    if (pecaA.forma.tipo !== "engrenagem" || pecaB?.forma.tipo !== "engrenagem") {
      return { pode: false, motivo: "Engrenar só vale entre duas engrenagens." };
    }
    if (pecaA.forma.modulo !== pecaB.forma.modulo) {
      return {
        pode: false,
        motivo: `Os dentes não casam: módulo ${pecaA.forma.modulo} e ${pecaB.forma.modulo}. Duas engrenagens só engrenam com o mesmo módulo.`,
      };
    }
    if (!temPino(cena, a) || !temPino(cena, b)) {
      return { pode: false, motivo: "Cada engrenagem precisa do seu eixo primeiro. Põe um pino em cada uma." };
    }
    const repetida = cena.juntas.some(
      (j) => j.tipo === "engrenar" && ((j.a === a && j.b === b) || (j.a === b && j.b === a)),
    );
    if (repetida) return { pode: false, motivo: "Essas duas já estão engrenadas." };
  }

  if (pecaA.fixado && pecaB?.fixado) {
    return { pode: false, motivo: "As duas peças estão ancoradas; a restrição não teria o que mover." };
  }
  return { pode: true, noMundo: false };
}

// A razão de transmissão a partir dos dentes. Sai exata porque dente é número
// inteiro: 40 dentes puxando 20 dentes é 2 voltas para 1, e ponto.
export function razaoDoEngrenamento(cena, junta) {
  if (Number.isFinite(junta.razao)) return junta.razao;
  const a = pecaPorId(cena, junta.a);
  const b = pecaPorId(cena, junta.b);
  if (!a || !b || a.forma.tipo !== "engrenagem" || b.forma.tipo !== "engrenagem") return 1;
  return b.forma.dentes / a.forma.dentes;
}

// A distância certa entre os centros de duas engrenagens que engrenam: a soma
// dos primitivos. Serve para a bancada encostar uma na outra sozinha, que é
// muito mais fácil do que o aluno acertar isso no olho.
export function distanciaDeEngrenamento(pecaA, pecaB) {
  const a = medidasDaEngrenagem(pecaA.forma.dentes, pecaA.forma.modulo);
  const b = medidasDaEngrenagem(pecaB.forma.dentes, pecaB.forma.modulo);
  return a.primitivo + b.primitivo;
}

// --- motor na junta ------------------------------------------------------

export function porMotor(junta, modelo) {
  if (!TIPOS_DE_JUNTA[junta.tipo]?.aceitaMotor) return false;
  junta.acionamento = modelo ? novoAcionamento(modelo) : null;
  return true;
}

export function juntasComMotor(cena) {
  return cena.juntas.filter((junta) => junta.acionamento);
}

// --- medidas e peso ------------------------------------------------------

export function fichaDaPeca(peca) {
  const receita = receitaDoMaterial(peca);
  const medidas = medidasDaForma(peca.forma);
  const area = areaDaForma(peca.forma);
  return {
    receita,
    medidas,
    area,
    gramas: pesoEmGramas(area, receita),
  };
}

export function contarCorpos(cena) {
  return cena.pecas.length;
}

export function pesoDaCena(cena) {
  return cena.pecas.reduce((soma, peca) => soma + fichaDaPeca(peca).gramas, 0);
}

// --- guardar e devolver as posições --------------------------------------
//
// Parar a simulação devolve tudo para onde estava. Sem isto, testar a
// montagem destruiria a montagem, e o aluno perderia o trabalho no primeiro
// clique de "Iniciar".

export function guardarPosicoes(cena) {
  return cena.pecas.map((peca) => ({ id: peca.id, x: peca.x, y: peca.y, giro: peca.giro }));
}

export function restaurarPosicoes(cena, guardadas) {
  if (!Array.isArray(guardadas)) return;
  const porId = new Map(guardadas.map((item) => [item.id, item]));
  for (const peca of cena.pecas) {
    const antes = porId.get(peca.id);
    if (!antes) continue;
    peca.x = antes.x;
    peca.y = antes.y;
    peca.giro = antes.giro;
  }
}

// --- geometria da bancada ------------------------------------------------
//
// A peça guarda posição e giro; o contorno dela é desenhado em volta do
// próprio zero. Estas funções são a ponte entre os dois, e são usadas tanto
// para desenhar quanto para saber onde o aluno clicou.

export function paraOMundo(peca, ponto) {
  const a = (peca.giro * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [peca.x + ponto[0] * c - ponto[1] * s, peca.y + ponto[0] * s + ponto[1] * c];
}

export function paraAPeca(peca, ponto) {
  const a = (-peca.giro * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = ponto[0] - peca.x;
  const dy = ponto[1] - peca.y;
  return [dx * c - dy * s, dx * s + dy * c];
}

export function contornoNoMundo(peca) {
  return contornoDaForma(peca.forma).map((ponto) => paraOMundo(peca, ponto));
}

function dentroDoContorno(pontos, [x, y]) {
  let sim = false;
  for (let i = 0, j = pontos.length - 1; i < pontos.length; j = i, i += 1) {
    const [xi, yi] = pontos[i];
    const [xj, yj] = pontos[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) sim = !sim;
  }
  return sim;
}

// O ponto está na peça? Para a engrenagem vale o círculo do topo, senão
// clicar entre dois dentes não pegaria a peça — e o aluno acharia que a
// bancada está quebrada.
export function pontoNaPeca(peca, ponto) {
  const local = paraAPeca(peca, ponto);
  if (peca.forma.tipo === "circulo") return Math.hypot(local[0], local[1]) <= peca.forma.raio;
  if (peca.forma.tipo === "engrenagem") {
    return Math.hypot(local[0], local[1]) <= medidasDaEngrenagem(peca.forma.dentes, peca.forma.modulo).topo;
  }
  if (peca.forma.tipo === "retangulo") {
    return (
      Math.abs(local[0]) <= peca.forma.largura / 2 && Math.abs(local[1]) <= peca.forma.altura / 2
    );
  }
  return dentroDoContorno(contornoDaForma(peca.forma), local);
}

// Quem está debaixo do dedo. A última da lista ganha, porque ela é a que está
// desenhada por cima.
export function pecaNoPonto(cena, ponto) {
  for (let i = cena.pecas.length - 1; i >= 0; i -= 1) {
    if (pontoNaPeca(cena.pecas[i], ponto)) return cena.pecas[i];
  }
  return null;
}

// Os lugares "certinhos" de uma peça, onde o pino cai sozinho quando o dedo
// passa perto: o centro, e os furos da barra. Mirar no milímetro com o mouse
// é tarefa de adulto cansado; mirar num ponto que se acende é tarefa de aluno.
export function pontosDeMira(peca) {
  const pontos = [[0, 0]];
  if (peca.forma.tipo === "retangulo") {
    const { largura, altura } = peca.forma;
    if (largura >= altura * 2.2) {
      for (const furo of furosDaBarra(largura, altura)) {
        if (Math.abs(furo[0]) > 0.01) pontos.push(furo);
      }
    } else {
      pontos.push([-largura / 2 + 8, 0], [largura / 2 - 8, 0], [0, -altura / 2 + 8], [0, altura / 2 - 8]);
    }
  } else if (peca.forma.tipo === "circulo") {
    pontos.push([peca.forma.raio * 0.6, 0], [-peca.forma.raio * 0.6, 0]);
  } else if (peca.forma.tipo === "engrenagem") {
    const g = medidasDaEngrenagem(peca.forma.dentes, peca.forma.modulo);
    pontos.push([g.primitivo * 0.55, 0], [-g.primitivo * 0.55, 0]);
  }
  return pontos;
}

// O ponto da mira mais perto do dedo, se houver um dentro do alcance.
export function miraMaisPerto(peca, pontoNoMundo, alcanceEmMm) {
  let melhor = null;
  let menor = alcanceEmMm;
  for (const mira of pontosDeMira(peca)) {
    const noMundo = paraOMundo(peca, mira);
    const distancia = Math.hypot(noMundo[0] - pontoNoMundo[0], noMundo[1] - pontoNoMundo[1]);
    if (distancia <= menor) {
      menor = distancia;
      melhor = mira;
    }
  }
  return melhor;
}

export function limitesDaCena(cena) {
  if (!cena.pecas.length) return { minX: -300, minY: -200, maxX: 300, maxY: 200 };
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const peca of cena.pecas) {
    const raio = medidasDaForma(peca.forma).raio;
    minX = Math.min(minX, peca.x - raio);
    minY = Math.min(minY, peca.y - raio);
    maxX = Math.max(maxX, peca.x + raio);
    maxY = Math.max(maxY, peca.y + raio);
  }
  return { minX, minY, maxX, maxY };
}

// --- salvar e importar ---------------------------------------------------

export function empacotar(cena) {
  return {
    formato: FORMATO,
    versao: VERSAO_FORMATO,
    geradoEm: new Date().toISOString(),
    nome: cena.nome,
    vista: cena.vista,
    gravidade: cena.gravidade !== false,
    pecas: cena.pecas.map((peca) => ({ ...peca })),
    juntas: cena.juntas.map((junta) => ({ ...junta })),
  };
}

export function desempacotar(conteudo) {
  if (!conteudo || conteudo.formato !== FORMATO) {
    throw new Error("Este arquivo não é uma cena de simulação do BuraDESIGN.");
  }
  const cena = novaCena({
    nome: String(conteudo.nome || "Montagem importada").slice(0, 80),
    vista: conteudo.vista,
    gravidade: conteudo.gravidade !== false,
  });
  const vistas = new Set();
  for (const bruta of conteudo.pecas || []) {
    if (!bruta || typeof bruta !== "object" || !bruta.forma) continue;
    const peca = novaPeca(bruta);
    if (vistas.has(peca.id)) peca.id = novoId("p");
    vistas.add(peca.id);
    cena.pecas.push(peca);
  }
  const existe = (id) => !id || vistas.has(id);
  for (const bruta of conteudo.juntas || []) {
    if (!bruta || typeof bruta !== "object") continue;
    if (!existe(bruta.a) || !existe(bruta.b)) continue;
    cena.juntas.push(novaJunta(bruta));
  }
  // Os nomes novos têm que continuar depois dos importados, senão a próxima
  // peça criada nasce com um id que já existe.
  let maior = 0;
  for (const item of [...cena.pecas, ...cena.juntas]) {
    const numero = Number(String(item.id).replace(/^[a-z]+/i, ""));
    if (Number.isFinite(numero)) maior = Math.max(maior, numero);
  }
  reiniciarContagem(maior);
  return cena;
}
