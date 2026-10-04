// O motor de física 2D: a cena virando corpos de verdade.
//
// Este arquivo é o único que fala com o Planck. Tudo mais no setor trabalha em
// milímetros e graus e não sabe que existe um Box2D embaixo. Essa fronteira é
// de propósito: no dia em que o motor trocar, troca só aqui.
//
// Três cuidados moram neste arquivo, e cada um tem motivo:
//
//   1. PASSO FIXO. A física anda de 1/60 em 1/60 de segundo, sempre, mesmo que
//      a tela esteja a 30 ou a 144 quadros. Passo variável faz a mesma
//      montagem dar resultado diferente em computador diferente — e numa sala
//      de aula, "no meu deu outra coisa" acaba com a lição.
//   2. TETO DE PASSOS POR QUADRO. Se o aparelho não dá conta, a conta de
//      tempo atrasado cresce, o navegador tenta compensar fazendo mais passos,
//      atrasa mais, e entra na espiral que trava a máquina. Aqui o teto é 3
//      passos: passado isso, o tempo que sobrou é jogado fora e a simulação
//      anda devagar em vez de travar.
//   3. DEVAGAR E CERTO, NUNCA RÁPIDO E ERRADO. Quando aperta, a resposta é
//      reduzir o tempo simulado por segundo — nunca aumentar o passo. Passo
//      grande é o que faz peça atravessar peça.

import {
  mm,
  paraMm,
  GRAVIDADE,
  POR_METRO,
  grausParaRad,
  radParaGraus,
  receitaDoMaterial,
  densidadeDeArea,
} from "./unidades.js";
import { colisoesDaForma } from "./formas2d.js";
import {
  gravidadeLigada,
  razaoDoEngrenamento,
  pecaPorId,
} from "./cena2d.js";
import { velocidadeAlvo, torqueMaximo, leituraDoAcionamento } from "./atuadores.js";

export const PASSO = 1 / 60;
export const PASSOS_POR_QUADRO = 3;
// No modo lento, cada segundo de verdade vale menos de meio segundo de
// simulação. Dá menos trabalho por segundo e, de brinde, dá para ver a
// engrenagem engrenando.
export const FATOR_LENTO = 0.4;

// Quantos quadros atrasados, dentro de uma janela, contam como "este aparelho
// não está dando conta".
const JANELA_DE_APERTO = 120;
const ATRASOS_PARA_APERTAR = 24;

let ajustado = false;

// As tolerâncias do Box2D vêm afinadas para um mundo onde 1 unidade é 1 metro.
// A nossa unidade é 10 cm, então duas delas precisam de conversa.
function ajustarTolerancias(planck) {
  if (ajustado || !planck?.Settings) return;
  const S = planck.Settings;
  // Abaixo desta velocidade relativa, bater não quica. O padrão é 1 m/s.
  S.velocityThreshold = 1 * POR_METRO;
  // O quanto um corpo pode andar num passo antes de ser freado à força. O
  // padrão de 2 unidades viraria 20 cm por passo na nossa régua, e uma peça em
  // queda livre comprida batia nesse teto.
  S.maxTranslation = 4;
  ajustado = true;
}

export function criarMundo(cena, { planck, decomp = null } = {}) {
  if (!planck) throw new Error("criarMundo precisa do planck.");
  ajustarTolerancias(planck);
  const { World, Vec2 } = planck;

  const gravidade = gravidadeLigada(cena) ? new Vec2(0, -GRAVIDADE) : new Vec2(0, 0);
  const mundo = new World({ gravity: gravidade });
  // O corpo do mundo: é nele que "fixar no lugar" e "pino no mundo" se
  // apoiam. Existe sempre, mesmo quando ninguém usa.
  const terra = mundo.createBody();

  const corpos = new Map();
  const avisos = [];

  for (const peca of cena.pecas) {
    const receita = receitaDoMaterial(peca);
    const corpo = mundo.createBody({
      type: peca.fixado ? "static" : "dynamic",
      position: new Vec2(mm(peca.x), mm(peca.y)),
      angle: grausParaRad(peca.giro),
      // Deixar a peça dormir quando ela para economiza muito processamento, e
      // qualquer toque acorda ela de novo.
      allowSleep: true,
    });
    let formas = [];
    try {
      formas = colisoesDaForma(peca.forma, { planck, decomp, exata: peca.colisao === "exata" });
    } catch (erro) {
      console.warn(`Não consegui montar a colisão de ${peca.nome}`, erro);
    }
    if (!formas.length) {
      avisos.push(`${peca.nome} ficou sem forma de colisão e vai passar pelas outras peças.`);
    }
    const densidade = Math.max(1e-4, densidadeDeArea(receita));
    for (const forma of formas) {
      corpo.createFixture({
        shape: forma,
        density: densidade,
        friction: Math.max(0, receita.atrito),
        restitution: Math.max(0, Math.min(0.95, receita.quique)),
      });
    }
    corpo.setUserData({ peca: peca.id });
    corpos.set(peca.id, corpo);
  }

  const juntas = new Map();
  // Engrenar depende dos pinos já existirem, então vem na segunda passada.
  const engrenar = [];

  for (const junta of cena.juntas) {
    if (junta.tipo === "engrenar") {
      engrenar.push(junta);
      continue;
    }
    const montada = montarJunta(mundo, planck, terra, corpos, cena, junta, avisos);
    if (montada) juntas.set(junta.id, montada);
  }

  for (const junta of engrenar) {
    const a = corpos.get(junta.a);
    const b = corpos.get(junta.b);
    const pinoA = pinoDaPeca(cena, juntas, junta.a);
    const pinoB = pinoDaPeca(cena, juntas, junta.b);
    if (!a || !b || !pinoA || !pinoB) {
      avisos.push("Um engrenamento ficou de fora: cada engrenagem precisa do seu pino.");
      continue;
    }
    try {
      const feito = mundo.createJoint(
        new planck.GearJoint({}, a, b, pinoA, pinoB, razaoDoEngrenamento(cena, junta)),
      );
      juntas.set(junta.id, feito);
    } catch (erro) {
      console.warn("Engrenamento recusado pelo motor", erro);
      avisos.push("Um engrenamento não pôde ser montado.");
    }
  }

  return {
    planck,
    mundo,
    terra,
    corpos,
    juntas,
    avisos,
    cena,
    acumulado: 0,
    lento: false,
    passosDados: 0,
    quadros: 0,
    atrasos: 0,
    apertou: false,
    agarre: null,
  };
}

function pontoLocal(planck, ponto) {
  return new planck.Vec2(mm(ponto?.[0] || 0), mm(ponto?.[1] || 0));
}

function pinoDaPeca(cena, juntas, idDaPeca) {
  for (const junta of cena.juntas) {
    if (junta.tipo !== "pino") continue;
    if (junta.a !== idDaPeca && junta.b !== idDaPeca) continue;
    const montada = juntas.get(junta.id);
    if (montada) return montada;
  }
  return null;
}

// Uma convenção só para todas as juntas, e ela vem de uma pergunta prática:
// quando o motor liga, QUEM gira?
//
// A resposta que o aluno espera é "a peça que eu toquei primeiro". Então a
// primeira peça clicada é sempre o corpo B da junta (o que o motor empurra), e
// a segunda ponta — a outra peça, ou a própria bancada — é o corpo A (o apoio).
// Com isso o ângulo da junta cresce quando a primeira peça gira no sentido
// anti-horário, o torque do motor vai para ela, e o trilho corre na direção
// escrita em relação ao apoio, que é o que faz sentido para uma gaveta.
function montarJunta(mundo, planck, terra, corpos, cena, junta, avisos) {
  const { Vec2 } = planck;
  const movel = corpos.get(junta.a);
  const pecaMovel = pecaPorId(cena, junta.a);
  if (!movel || !pecaMovel) return null;

  const noMundo = !junta.b;
  const apoio = noMundo ? terra : corpos.get(junta.b);
  if (!apoio) return null;

  // O ponto na peça móvel está nas coordenadas dela. O ponto do apoio está
  // nas coordenadas da outra peça — ou, quando o apoio é a bancada, nas
  // coordenadas do mundo, que para o corpo da terra é a mesma coisa.
  const naPeca = pontoLocal(planck, junta.pa);
  const noApoio = pontoLocal(planck, junta.pb);
  const referencia = movel.getAngle() - apoio.getAngle();

  try {
    if (junta.tipo === "pino") {
      const def = {
        localAnchorA: noApoio,
        localAnchorB: naPeca,
        referenceAngle: referencia,
      };
      if (junta.acionamento) {
        def.enableMotor = true;
        def.motorSpeed = 0;
        def.maxMotorTorque = torqueMaximo(junta.acionamento);
        if (junta.acionamento.tipo === "servo") {
          // O servo foi montado no meio do curso: o 90 dele é a posição em que
          // a peça está agora. Assim o aluno monta o braço onde quer o meio e
          // o servo anda 90 graus para cada lado.
          def.enableLimit = true;
          def.lowerAngle = grausParaRad((junta.acionamento.limiteMin ?? 0) - 90);
          def.upperAngle = grausParaRad((junta.acionamento.limiteMax ?? 180) - 90);
        }
      }
      return mundo.createJoint(new planck.RevoluteJoint(def, apoio, movel));
    }

    if (junta.tipo === "solda") {
      return mundo.createJoint(
        new planck.WeldJoint(
          { localAnchorA: noApoio, localAnchorB: naPeca, referenceAngle: referencia },
          apoio,
          movel,
        ),
      );
    }

    if (junta.tipo === "trilho") {
      const a = grausParaRad(junta.eixo || 0);
      return mundo.createJoint(
        new planck.PrismaticJoint(
          {
            localAnchorA: noApoio,
            localAnchorB: naPeca,
            localAxisA: new Vec2(Math.cos(a), Math.sin(a)),
            referenceAngle: referencia,
          },
          apoio,
          movel,
        ),
      );
    }

    if (junta.tipo === "vareta") {
      const pontoNoMundoA = apoio.getWorldPoint(noApoio);
      const pontoNoMundoB = movel.getWorldPoint(naPeca);
      const comprimento = Number.isFinite(junta.comprimento)
        ? mm(junta.comprimento)
        : Vec2.distance(pontoNoMundoA, pontoNoMundoB);
      const def = {
        localAnchorA: noApoio,
        localAnchorB: naPeca,
        length: Math.max(mm(1), comprimento),
      };
      if (junta.elastica) {
        // Mola de 2,5 Hz e quase sem amortecimento: ela balança por alguns
        // segundos antes de parar, que é o tempo de o aluno olhar. Com o
        // amortecimento alto que eu tinha posto antes, ela dava um solavanco
        // e morria — parecia uma vareta meio solta, não uma mola.
        def.frequencyHz = 2.5;
        def.dampingRatio = 0.08;
      }
      return mundo.createJoint(new planck.DistanceJoint(def, apoio, movel));
    }
  } catch (erro) {
    console.warn("Restrição recusada pelo motor", erro);
    avisos.push(`Uma restrição de ${junta.tipo} não pôde ser montada.`);
  }
  return null;
}

export function destruirMundo(estado) {
  if (!estado?.mundo) return;
  soltar(estado);
  for (const corpo of estado.corpos.values()) {
    try {
      estado.mundo.destroyBody(corpo);
    } catch {
      // mundo já desmontado
    }
  }
  estado.corpos.clear();
  estado.juntas.clear();
  estado.mundo = null;
}

// --- o passo -------------------------------------------------------------

export function avancar(estado, segundosDeVerdade) {
  if (!estado?.mundo) return { passos: 0, atrasou: false };
  const fator = estado.lento ? FATOR_LENTO : 1;
  // Um quarto de segundo é o teto do que entra de uma vez. Quando a aba volta
  // de segundo plano, o navegador entrega um salto de vários segundos; sem
  // este teto, a montagem toda explodia nesse instante.
  estado.acumulado += Math.min(Math.max(segundosDeVerdade, 0), 0.25) * fator;

  let passos = 0;
  while (estado.acumulado >= PASSO && passos < PASSOS_POR_QUADRO) {
    comandarAtuadores(estado);
    estado.mundo.step(PASSO);
    estado.acumulado -= PASSO;
    passos += 1;
    estado.passosDados += 1;
  }

  const atrasou = estado.acumulado >= PASSO;
  if (atrasou) {
    // Jogar o tempo que sobrou fora é o que impede a espiral: a simulação fica
    // devagar, e devagar é melhor do que travada.
    estado.acumulado = 0;
    estado.atrasos += 1;
  }

  estado.quadros += 1;
  if (estado.quadros >= JANELA_DE_APERTO) {
    if (!estado.lento && estado.atrasos >= ATRASOS_PARA_APERTAR) estado.apertou = true;
    estado.quadros = 0;
    estado.atrasos = 0;
  }
  return { passos, atrasou };
}

function comandarAtuadores(estado) {
  for (const junta of estado.cena.juntas) {
    if (!junta.acionamento) continue;
    const montada = estado.juntas.get(junta.id);
    if (!montada || typeof montada.setMotorSpeed !== "function") continue;
    const anguloAtual = radParaGraus(montada.getJointAngle());
    montada.setMotorSpeed(velocidadeAlvo(junta.acionamento, anguloAtual));
    montada.setMaxMotorTorque(torqueMaximo(junta.acionamento));
  }
}

// Depois do passo, as peças da cena passam a morar onde os corpos estão. A
// tela desenha a cena, então ela não precisa saber que houve física.
export function escreverPosicoes(estado) {
  if (!estado?.mundo) return;
  for (const peca of estado.cena.pecas) {
    const corpo = estado.corpos.get(peca.id);
    if (!corpo) continue;
    const p = corpo.getPosition();
    peca.x = paraMm(p.x);
    peca.y = paraMm(p.y);
    peca.giro = radParaGraus(corpo.getAngle());
  }
}

export function leiturasDosAtuadores(estado) {
  const saida = [];
  for (const junta of estado.cena.juntas) {
    if (!junta.acionamento) continue;
    const montada = estado.juntas.get(junta.id);
    const leitura = leituraDoAcionamento(junta.acionamento, montada, PASSO);
    if (leitura) saida.push({ junta: junta.id, ...leitura });
  }
  return saida;
}

export function numeroDeContatos(estado) {
  if (!estado?.mundo) return 0;
  let quantos = 0;
  for (let contato = estado.mundo.getContactList(); contato; contato = contato.getNext()) {
    if (contato.isTouching()) quantos += 1;
  }
  return quantos;
}

export function corposAcordados(estado) {
  if (!estado?.mundo) return 0;
  let quantos = 0;
  for (const corpo of estado.corpos.values()) {
    if (corpo.isAwake() && corpo.isDynamic()) quantos += 1;
  }
  return quantos;
}

// --- a mão do aluno ------------------------------------------------------
//
// Poder empurrar a peça com o dedo enquanto roda é metade da diversão: é assim
// que se descobre se a alavanca aguenta. A pegada é uma mola curta até o dedo,
// e não um teletransporte — teletransportar a peça faz ela furar as outras.

export function agarrar(estado, idDaPeca, ponto) {
  if (!estado?.mundo) return false;
  const corpo = estado.corpos.get(idDaPeca);
  if (!corpo || !corpo.isDynamic()) return false;
  soltar(estado);
  const { Vec2, MouseJoint } = estado.planck;
  const alvo = new Vec2(mm(ponto[0]), mm(ponto[1]));
  try {
    estado.agarre = estado.mundo.createJoint(
      new MouseJoint(
        { maxForce: 1200 * corpo.getMass() + 20, frequencyHz: 5, dampingRatio: 0.9, target: alvo },
        estado.terra,
        corpo,
        alvo,
      ),
    );
  } catch (erro) {
    console.warn("Não consegui agarrar a peça", erro);
    return false;
  }
  corpo.setAwake(true);
  return Boolean(estado.agarre);
}

export function arrastar(estado, ponto) {
  if (!estado?.agarre) return;
  estado.agarre.setTarget(new estado.planck.Vec2(mm(ponto[0]), mm(ponto[1])));
}

export function soltar(estado) {
  if (!estado?.agarre) return;
  try {
    estado.mundo.destroyJoint(estado.agarre);
  } catch {
    // já saiu
  }
  estado.agarre = null;
}

// Qual peça está embaixo do ponto. Usa a colisão de verdade, então clicar no
// buraco do meio de um anel não pega o anel — o que é o certo.
export function pecaNoPonto(estado, ponto) {
  if (!estado?.mundo) return null;
  const alvo = new estado.planck.Vec2(mm(ponto[0]), mm(ponto[1]));
  let achada = null;
  estado.mundo.queryAABB(
    new estado.planck.AABB(
      new estado.planck.Vec2(alvo.x - mm(1), alvo.y - mm(1)),
      new estado.planck.Vec2(alvo.x + mm(1), alvo.y + mm(1)),
    ),
    (fixture) => {
      if (!fixture.testPoint(alvo)) return true;
      const dados = fixture.getBody().getUserData();
      if (dados?.peca) {
        achada = dados.peca;
        return false;
      }
      return true;
    },
  );
  return achada;
}
