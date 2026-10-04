// Motores e servos, com os números dos bichos de verdade.
//
// A escolha que manda neste arquivo: o slider do aluno controla a VELOCIDADE,
// e o torque é o LIMITE de força que o motor tem para chegar nela. É assim que
// motor de kit funciona. Ligado sem carga, ele vai na velocidade escrita na
// caixa; pendurando peso, ele desacelera; pendurando peso demais, ele para de
// vez e esquenta. Se o torque fosse infinito, nada disso aparecia — o braço
// robótico levantaria um carro e a aula perderia a melhor parte.
//
// Os números vêm das peças que a escola compra:
//
//   Motor amarelo (TT, redução 1:48, 6 V) ... ~200 rpm, ~0,8 kgf·cm
//   Micro servo (SG90) ..................... ~500 °/s, ~1,8 kgf·cm
//   Servo de alto torque (MG996R) .......... ~350 °/s, ~11 kgf·cm
//
// Repare no par do servo: o micro é rápido e fraco, o grande é mais devagar e
// muito mais forte. Essa troca é a lição.

import { kgfcm, rpmParaRad, grausParaRad, radParaRpm, radParaGraus, paraKgfcm } from "./unidades.js";

export const MOTORES = Object.freeze({
  motorAmarelo: {
    id: "motorAmarelo",
    nome: "Motor amarelo (redução 1:48)",
    tipo: "motor",
    rpm: 200,
    torqueKgfcm: 0.8,
    dica: "O motor amarelo do kit. Gira sem parar; serve para roda, esteira e engrenagem.",
  },
  microServo: {
    id: "microServo",
    nome: "Micro servo (SG90)",
    tipo: "servo",
    grausPorSegundo: 500,
    torqueKgfcm: 1.8,
    dica: "Rápido e fraco. Bom para garra leve e direção de carrinho.",
  },
  servoAlto: {
    id: "servoAlto",
    nome: "Servo de alto torque (MG996R)",
    tipo: "servo",
    grausPorSegundo: 350,
    torqueKgfcm: 11,
    dica: "Mais devagar, muito mais forte. É o servo do braço que levanta peso.",
  },
});

export const ORDEM_DOS_ATUADORES = ["motorAmarelo", "microServo", "servoAlto"];

export const FAIXA_DO_SERVO = Object.freeze({ min: 0, max: 180, meio: 90 });

// Dois números que fazem o servo se comportar como servo de verdade.
//
// FREIO é a faixa em que ele desacelera na chegada. Sem ela, o servo corre a
// 500 graus por segundo até o último grau e passa do ponto, voltando num
// tremor que não acaba.
//
// PAROU é a zona morta: perto o bastante já é no lugar. Todo servo de verdade
// tem uma, e é ela que faz ele travar firme em vez de ficar caçando o alvo.
// Dentro dela o servo não corre para lado nenhum — ele pede velocidade zero,
// e pedir velocidade zero com torque disponível é exatamente segurar firme.
const FREIO = 20;
const PAROU = 1.2;

// O quanto falta para o servo chegar onde foi mandado, em graus.
export function erroDoServo(acionamento, anguloAtualEmGraus = 0) {
  const sinal = acionamento.invertido ? -1 : 1;
  const alvo = Math.max(
    acionamento.limiteMin ?? FAIXA_DO_SERVO.min,
    Math.min(acionamento.limiteMax ?? FAIXA_DO_SERVO.max, acionamento.angulo ?? FAIXA_DO_SERVO.meio),
  );
  return sinal * (alvo - FAIXA_DO_SERVO.meio) - anguloAtualEmGraus;
}

export function atuador(id) {
  return MOTORES[id] || null;
}

// O que vai guardado na junta quando ela ganha um motor.
export function novoAcionamento(id) {
  const ficha = atuador(id);
  if (!ficha) return null;
  if (ficha.tipo === "motor") {
    return {
      tipo: "motor",
      modelo: ficha.id,
      // Quanto do máximo o aluno pediu, de -100 a 100.
      aceleracao: 60,
      invertido: false,
    };
  }
  return {
    tipo: "servo",
    modelo: ficha.id,
    // O ângulo pedido, de 0 a 180. 90 é a posição em que a peça foi montada.
    angulo: FAIXA_DO_SERVO.meio,
    limiteMin: FAIXA_DO_SERVO.min,
    limiteMax: FAIXA_DO_SERVO.max,
    invertido: false,
  };
}

export function torqueMaximo(acionamento) {
  const ficha = atuador(acionamento?.modelo);
  return ficha ? kgfcm(ficha.torqueKgfcm) : 0;
}

// A velocidade alvo, em radiano por segundo, já com o sinal certo.
export function velocidadeAlvo(acionamento, anguloAtualEmGraus = 0) {
  const ficha = atuador(acionamento?.modelo);
  if (!ficha) return 0;
  const sinal = acionamento.invertido ? -1 : 1;

  if (ficha.tipo === "motor") {
    const parte = Math.max(-100, Math.min(100, acionamento.aceleracao || 0)) / 100;
    return sinal * parte * rpmParaRad(ficha.rpm);
  }

  // O servo é um motor com cabeça: ele olha onde está, olha onde foi mandado
  // ficar, e corre para lá na velocidade máxima dele. Perto do alvo ele
  // desacelera, e no último grau ele simplesmente para de correr — que é o que
  // faz ele segurar firme em vez de ficar caçando o alvo para sempre.
  const erro = erroDoServo(acionamento, anguloAtualEmGraus);
  if (Math.abs(erro) < PAROU) return 0;
  const maxima = grausParaRad(ficha.grausPorSegundo);
  const parte = Math.max(-1, Math.min(1, erro / FREIO));
  return parte * maxima;
}

// Lê a junta depois do passo e devolve os números que vão para a tela.
//
// Cuidado de quem já tropeçou: o `getMotorTorque` do Planck (como o do Box2D)
// quer o INVERSO do passo, não o passo. Guardado dentro da junta está um
// impulso, e impulso dividido por tempo é que dá torque. Passando o passo em
// vez do inverso, o número sai 3600 vezes menor e o painel jura que o motor
// está folgado justo quando ele está no limite.
export function leituraDoAcionamento(acionamento, junta, passo) {
  const ficha = atuador(acionamento?.modelo);
  if (!ficha || !junta) return null;
  const velocidade = junta.getJointSpeed();
  const torqueUsado = Math.abs(junta.getMotorTorque(1 / passo));
  const limite = torqueMaximo(acionamento);
  const alvo = Math.abs(junta.getMotorSpeed());
  const graus = radParaGraus(junta.getJointAngle()) + FAIXA_DO_SERVO.meio;

  // "Forçando" é o momento de ouro da aula: o atuador está dando tudo o que
  // tem e mesmo assim não faz o serviço. Mas "tudo o que tem" quer dizer uma
  // coisa no motor e outra no servo:
  //
  //   motor -> não chega na velocidade pedida;
  //   servo -> não chega no ÂNGULO pedido.
  //
  // O servo encosta no teto de torque toda vez que corrige a posição, mesmo
  // folgado — então medir torque no servo diria "forçando" sempre, e um aviso
  // que acende sempre não avisa nada.
  const noTeto = limite > 0 && torqueUsado > limite * 0.95;
  const forcando =
    ficha.tipo === "servo"
      ? noTeto && Math.abs(erroDoServo(acionamento, graus - FAIXA_DO_SERVO.meio)) > 8
      : noTeto && alvo > 1e-4 && Math.abs(velocidade) < alvo * 0.75;
  return {
    tipo: ficha.tipo,
    nome: ficha.nome,
    rpm: radParaRpm(velocidade),
    graus,
    torqueKgfcm: paraKgfcm(torqueUsado),
    torqueMaxKgfcm: ficha.torqueKgfcm,
    usoDoTorque: limite > 0 ? Math.min(1, torqueUsado / limite) : 0,
    forcando,
  };
}

// O texto do slider, que muda de nome conforme a peça.
export function rotuloDoControle(acionamento) {
  const ficha = atuador(acionamento?.modelo);
  if (!ficha) return "";
  return ficha.tipo === "motor" ? "Acelerador (%)" : "Ângulo (graus)";
}

export function faixaDoControle(acionamento) {
  const ficha = atuador(acionamento?.modelo);
  if (!ficha) return { min: 0, max: 100, passo: 1, valor: 0 };
  if (ficha.tipo === "motor") {
    return { min: -100, max: 100, passo: 5, valor: acionamento.aceleracao ?? 0 };
  }
  return {
    min: acionamento.limiteMin ?? 0,
    max: acionamento.limiteMax ?? 180,
    passo: 1,
    valor: acionamento.angulo ?? FAIXA_DO_SERVO.meio,
  };
}

export function aplicarControle(acionamento, valor) {
  if (!acionamento) return;
  if (acionamento.tipo === "motor") acionamento.aceleracao = valor;
  else acionamento.angulo = valor;
}
