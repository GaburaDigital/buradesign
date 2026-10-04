// Montagens prontas.
//
// Não são missões e não dão nota: são oito bancadas já armadas, cada uma com
// UMA ideia de mecânica dentro. O aluno abre, aperta "Iniciar", mexe nos
// sliders e descobre. Depois ele muda uma medida e descobre de novo — e é aí
// que a aula acontece.
//
// Cada exemplo traz um "experimento": a mudança exata que vale a pena fazer
// nele. "Mexa um pouco e veja" não leva ninguém a lugar nenhum; "troque a
// coroa de 48 para 24 dentes e repare que ele deixa de levantar o peso" leva.
//
// As medidas aqui não são decorativas. Foram escolhidas para que o motor
// amarelo (0,8 kgf·cm) e os dois servos cheguem no limite deles dentro da
// cena — o momento em que o motor não aguenta é a parte que ensina.

import { novaCena, novaPeca, novaJunta, adicionarPeca, adicionarJunta, porMotor, reiniciarContagem } from "./cena2d.js";

function montador(dados) {
  reiniciarContagem(0);
  const cena = novaCena(dados);
  const P = (peca) => adicionarPeca(cena, novaPeca(peca));
  const J = (junta) => adicionarJunta(cena, novaJunta(junta));
  const M = (junta, modelo, valores = {}) => {
    porMotor(junta, modelo);
    Object.assign(junta.acionamento, valores);
    return junta;
  };
  const chao = (largura, x = 0) =>
    P({
      nome: "chão",
      catalogo: "solido",
      forma: { tipo: "retangulo", largura, altura: 60 },
      material: "metal",
      x,
      y: -30,
      fixado: true,
      tijolos: true,
    });
  return { cena, P, J, M, chao };
}

const EXEMPLOS = [
  {
    id: "gangorra",
    nome: "Gangorra",
    ideia: "Braço de força: o que importa não é o peso, é o peso vezes a distância.",
    experimento:
      "Os dois baldes têm o mesmo peso, mas um está a 280 mm do apoio e o outro a 150 mm. Selecione o pino do balde da direita e mude o ponto dele na tábua de 150 para 280: a gangorra equilibra.",
    montar() {
      const { cena, P, J, chao } = montador({ nome: "Gangorra", vista: "lado" });
      chao(1400);
      // A coluna para 10 mm abaixo da tábua de propósito. Encostada nela, a
      // coluna viraria um calço e a gangorra não inclinaria — foi o primeiro
      // jeito que eu montei, e ela ficava teimosamente plana.
      P({
        nome: "coluna",
        catalogo: "solido",
        forma: { tipo: "retangulo", largura: 60, altura: 190 },
        material: "metal",
        x: 0,
        y: 95,
        fixado: true,
        tijolos: true,
      });
      const tabua = P({
        nome: "tábua",
        catalogo: "barra",
        forma: { tipo: "retangulo", largura: 700, altura: 20 },
        x: 0,
        y: 210,
      });
      J({ tipo: "pino", a: tabua.id, pa: [0, 0], pb: [0, 210] });
      const esquerdo = P({
        nome: "balde a 280 mm",
        catalogo: "placa",
        forma: { tipo: "retangulo", largura: 70, altura: 70 },
        material: "metal",
        x: -280,
        y: 175,
      });
      const direito = P({
        nome: "balde a 150 mm",
        catalogo: "placa",
        forma: { tipo: "retangulo", largura: 70, altura: 70 },
        material: "metal",
        x: 150,
        y: 175,
      });
      J({ tipo: "pino", a: esquerdo.id, b: tabua.id, pa: [0, 35], pb: [-280, 0] });
      J({ tipo: "pino", a: direito.id, b: tabua.id, pa: [0, 35], pb: [150, 0] });
      return cena;
    },
  },

  {
    id: "reducao",
    nome: "Redução de engrenagens",
    ideia: "Engrenagem troca velocidade por força. Quatro vezes mais devagar é quatro vezes mais forte.",
    experimento:
      "Do jeito que está, o braço levanta o bloco de alumínio. Apague o engrenamento e ponha o motor direto no pino do braço: o mesmo motor não levanta mais. Depois troque a coroa de 48 para 24 dentes e veja a força cair pela metade.",
    montar() {
      const { cena, P, J, M, chao } = montador({ nome: "Redução de engrenagens", vista: "lado" });
      chao(900);
      const pinhao = P({
        nome: "pinhão 12 dentes",
        catalogo: "engrenagem",
        forma: { tipo: "engrenagem", dentes: 12, modulo: 5 },
        x: 0,
        y: 300,
      });
      const coroa = P({
        nome: "coroa 48 dentes",
        catalogo: "engrenagem",
        forma: { tipo: "engrenagem", dentes: 48, modulo: 5 },
        x: 150,
        y: 300,
      });
      const eixoPinhao = J({ tipo: "pino", a: pinhao.id, pa: [0, 0], pb: [0, 300] });
      // Invertido porque o pinhão girando para um lado faz a coroa girar para
      // o outro — e é a coroa que tem que subir o braço.
      M(eixoPinhao, "motorAmarelo", { aceleracao: 40, invertido: true });
      J({ tipo: "pino", a: coroa.id, pa: [0, 0], pb: [150, 300] });
      J({ tipo: "engrenar", a: pinhao.id, b: coroa.id });

      const braco = P({
        nome: "braço",
        catalogo: "barra",
        forma: { tipo: "retangulo", largura: 180, altura: 20 },
        x: 240,
        y: 300,
      });
      J({ tipo: "solda", a: braco.id, b: coroa.id, pa: [-90, 0], pb: [0, 0] });
      const peso = P({
        nome: "bloco de 60 g",
        catalogo: "placa",
        forma: { tipo: "retangulo", largura: 86, altura: 86 },
        material: "metal",
        x: 330,
        y: 257,
      });
      J({ tipo: "pino", a: peso.id, b: braco.id, pa: [0, 43], pb: [90, 0] });
      return cena;
    },
  },

  {
    id: "trem",
    nome: "Trem de engrenagens",
    ideia: "Engrenagem no meio inverte o sentido, mas não muda a conta da ponta à ponta.",
    experimento:
      "A primeira e a terceira engrenagem têm 16 dentes e giram na mesma velocidade, apesar da de 24 no meio. Troque a do meio por uma de 40 dentes: o sentido e a velocidade das pontas continuam iguais. A do meio só serve para inverter e para vencer distância.",
    montar() {
      const { cena, P, J, M } = montador({ nome: "Trem de engrenagens", vista: "cima" });
      const a = P({ nome: "A: 16 dentes", catalogo: "engrenagem", forma: { tipo: "engrenagem", dentes: 16, modulo: 4 }, x: 0, y: 0 });
      const b = P({ nome: "B: 24 dentes", catalogo: "engrenagem", forma: { tipo: "engrenagem", dentes: 24, modulo: 4 }, x: 80, y: 0 });
      const c = P({ nome: "C: 16 dentes", catalogo: "engrenagem", forma: { tipo: "engrenagem", dentes: 16, modulo: 4 }, x: 160, y: 0 });
      const eixoA = J({ tipo: "pino", a: a.id, pa: [0, 0], pb: [0, 0] });
      M(eixoA, "motorAmarelo", { aceleracao: 60 });
      J({ tipo: "pino", a: b.id, pa: [0, 0], pb: [80, 0] });
      J({ tipo: "pino", a: c.id, pa: [0, 0], pb: [160, 0] });
      J({ tipo: "engrenar", a: a.id, b: b.id });
      J({ tipo: "engrenar", a: b.id, b: c.id });
      return cena;
    },
  },

  {
    id: "braco",
    nome: "Braço robótico de dois servos",
    ideia: "Dois servos em série: cada um manda no seu pedaço, e a mão vai onde a soma dos dois mandar.",
    experimento:
      "Mexa os dois sliders para empurrar o bloco de madeira. Depois troque o servo do ombro de alto torque para micro servo: ele não levanta mais o próprio braço. Esse é o cálculo que todo projeto de braço robótico tem que fazer antes de comprar a peça.",
    montar() {
      const { cena, P, J, M, chao } = montador({ nome: "Braço robótico", vista: "lado" });
      chao(1000);
      // A base para 20 mm abaixo do braço. Encostada nele, ela empurrava o
      // braço para cima e o servo passava a aula inteira brigando com um
      // bloco de concreto.
      P({
        nome: "base",
        catalogo: "solido",
        forma: { tipo: "retangulo", largura: 120, altura: 120 },
        material: "metal",
        x: 0,
        y: 60,
        fixado: true,
        tijolos: true,
      });
      // Braço de alumínio: pesado o bastante para pedir 2,4 kgf·cm no ombro.
      // O servo de alto torque (11) carrega sem sentir; o micro (1,8) não
      // levanta nem o próprio braço — e essa comparação é a aula.
      const braco1 = P({ nome: "braço do ombro", catalogo: "barra", forma: { tipo: "retangulo", largura: 220, altura: 24 }, material: "metal", x: 110, y: 140 });
      const ombro = J({ tipo: "pino", a: braco1.id, pa: [-110, 0], pb: [0, 140] });
      M(ombro, "servoAlto", { angulo: 90 });
      const braco2 = P({ nome: "antebraço", catalogo: "barra", forma: { tipo: "retangulo", largura: 160, altura: 20 }, material: "metal", x: 300, y: 140 });
      const cotovelo = J({ tipo: "pino", a: braco2.id, b: braco1.id, pa: [-80, 0], pb: [110, 0] });
      M(cotovelo, "microServo", { angulo: 90 });
      const mao = P({ nome: "mão", catalogo: "placa", forma: { tipo: "retangulo", largura: 60, altura: 60 }, material: "metal", x: 410, y: 140 });
      J({ tipo: "solda", a: mao.id, b: braco2.id, pa: [-30, 0], pb: [80, 0] });
      P({ nome: "bloco", catalogo: "placa", forma: { tipo: "retangulo", largura: 60, altura: 60 }, x: 470, y: 30 });
      return cena;
    },
  },

  {
    id: "carrinho",
    nome: "Carrinho com dois motores",
    ideia: "Motor na roda, borracha no chão: sem atrito não existe carrinho, só roda girando no lugar.",
    experimento:
      "Acelere os dois motores e suba a rampa. Depois troque as rodas de borracha por rodas comuns (desmarque 'roda de borracha' no painel) e tente de novo: elas patinam. Em seguida ponha uma placa de alumínio em cima do chassi e veja o motor desacelerar na subida.",
    montar() {
      const { cena, P, J, M, chao } = montador({ nome: "Carrinho", vista: "lado" });
      chao(2400, 400);
      P({
        nome: "rampa",
        catalogo: "solido",
        forma: { tipo: "retangulo", largura: 500, altura: 40 },
        material: "metal",
        x: 700,
        y: 55,
        giro: 14,
        fixado: true,
        tijolos: true,
      });
      const chassi = P({ nome: "chassi", catalogo: "placa", forma: { tipo: "retangulo", largura: 240, altura: 30 }, x: -500, y: 68 });
      const traseira = P({
        nome: "roda de trás",
        catalogo: "roda",
        forma: { tipo: "circulo", raio: 38 },
        atrito: 1.1,
        quique: 0.1,
        borracha: true,
        x: -580,
        y: 38,
      });
      const dianteira = P({
        nome: "roda da frente",
        catalogo: "roda",
        forma: { tipo: "circulo", raio: 38 },
        atrito: 1.1,
        quique: 0.1,
        borracha: true,
        x: -420,
        y: 38,
      });
      const m1 = J({ tipo: "pino", a: traseira.id, b: chassi.id, pa: [0, 0], pb: [-80, -30] });
      const m2 = J({ tipo: "pino", a: dianteira.id, b: chassi.id, pa: [0, 0], pb: [80, -30] });
      // Invertido porque roda girando no sentido anti-horário empurra o
      // carrinho para a esquerda, e a rampa está à direita.
      M(m1, "motorAmarelo", { aceleracao: 70, invertido: true });
      M(m2, "motorAmarelo", { aceleracao: 70, invertido: true });
      return cena;
    },
  },

  {
    id: "biela",
    nome: "Biela e manivela",
    ideia: "O mecanismo que transforma giro em vai-e-vem. É o que tem dentro de todo motor a pistão.",
    experimento:
      "O pistão anda 90 mm, que é duas vezes os 45 mm do pino na manivela. Mude o ponto do pino na manivela para 20 mm e meça de novo: o curso vira 40 mm. O curso é sempre o dobro da excentricidade, e isso é geometria, não chute.",
    montar() {
      const { cena, P, J, M, chao } = montador({ nome: "Biela e manivela", vista: "lado" });
      chao(1000, 100);
      const manivela = P({ nome: "manivela", catalogo: "disco", forma: { tipo: "circulo", raio: 55 }, x: 0, y: 300 });
      const eixo = J({ tipo: "pino", a: manivela.id, pa: [0, 0], pb: [0, 300] });
      M(eixo, "motorAmarelo", { aceleracao: 45 });
      const biela = P({ nome: "biela", catalogo: "barra", forma: { tipo: "retangulo", largura: 220, altura: 16 }, x: 155, y: 300 });
      J({ tipo: "pino", a: biela.id, b: manivela.id, pa: [-110, 0], pb: [45, 0] });
      const pistao = P({ nome: "pistão", catalogo: "placa", forma: { tipo: "retangulo", largura: 80, altura: 60 }, x: 305, y: 300 });
      J({ tipo: "pino", a: pistao.id, b: biela.id, pa: [-40, 0], pb: [110, 0] });
      J({ tipo: "trilho", a: pistao.id, pa: [0, 0], pb: [305, 300], eixo: 0 });
      for (const altura of [340, 260]) {
        P({
          nome: "guia do cilindro",
          catalogo: "solido",
          forma: { tipo: "retangulo", largura: 240, altura: 16 },
          material: "metal",
          x: 320,
          y: altura,
          fixado: true,
        });
      }
      return cena;
    },
  },

  {
    id: "came",
    nome: "Came e seguidor",
    ideia: "Um disco fora de centro levanta e abaixa uma peça na medida exata. É a válvula do motor e o came da máquina de costura.",
    experimento:
      "O pino está a 28 mm do centro do disco, e o seguidor sobe 56 mm — o dobro. Mude o pino para 10 mm do centro: o curso cai para 20 mm. Trocando o disco por um triângulo, o movimento deixa de ser suave e passa a dar um tranco.",
    montar() {
      const { cena, P, J, M, chao } = montador({ nome: "Came e seguidor", vista: "lado" });
      chao(800);
      const came = P({ nome: "came", catalogo: "disco", forma: { tipo: "circulo", raio: 60 }, x: 0, y: 200 });
      const eixo = J({ tipo: "pino", a: came.id, pa: [28, 0], pb: [28, 200] });
      M(eixo, "motorAmarelo", { aceleracao: 30 });
      const seguidor = P({ nome: "seguidor", catalogo: "placa", forma: { tipo: "retangulo", largura: 50, altura: 200 }, x: 28, y: 380 });
      J({ tipo: "trilho", a: seguidor.id, pa: [0, 0], pb: [28, 380], eixo: 90 });
      return cena;
    },
  },

  {
    id: "catapulta",
    nome: "Catapulta de contrapeso",
    ideia: "Peso caindo de um lado joga a bola do outro. Energia que estava guardada na altura do contrapeso vira velocidade na bola.",
    experimento:
      "Aperte Iniciar e ela atira sozinha. Depois troque o contrapeso de alumínio por madeira: a bola sobe menos da metade da altura, porque o contrapeso leve guarda menos energia na mesma queda. Em seguida mude o ponto do pino do contrapeso de 210 para 150: o braço de força encurta e o tiro encurta com ele.",
    montar() {
      const { cena, P, J, chao } = montador({ nome: "Catapulta de contrapeso", vista: "lado" });
      // Chão comprido porque a bola vai longe, e bola saindo do chão no meio
      // do voo é a melhor forma de o aluno achar que a bancada tem bug.
      chao(4000, 1400);
      // Sem poste de propósito: o contrapeso passa rente ao eixo quando o
      // braço vira, e qualquer coluna desenhada ali seria uma coluna sendo
      // atravessada. O triângulo de apoio do pino já diz que o eixo está
      // preso na bancada.
      const braco = P({ nome: "braço", catalogo: "barra", forma: { tipo: "retangulo", largura: 480, altura: 20 }, x: 80, y: 520 });
      J({ tipo: "pino", a: braco.id, pa: [120, 0], pb: [200, 520] });
      const cesto = P({ nome: "cesto", catalogo: "barra", forma: { tipo: "retangulo", largura: 70, altura: 20 }, x: -150, y: 540 });
      J({ tipo: "solda", a: cesto.id, b: braco.id, pa: [0, -20], pb: [-230, 0] });
      P({ nome: "bola", catalogo: "disco", forma: { tipo: "circulo", raio: 22 }, x: -150, y: 572 });
      const contrapeso = P({
        nome: "contrapeso",
        catalogo: "placa",
        forma: { tipo: "retangulo", largura: 140, altura: 200 },
        material: "metal",
        x: 290,
        y: 420,
      });
      // Pendurado num pino, o contrapeso fica sempre em pé e dá torque até o
      // fim do curso. Soldado, ele giraria junto com o braço e a força
      // mudaria no caminho.
      J({ tipo: "pino", a: contrapeso.id, b: braco.id, pa: [0, 100], pb: [210, 0] });
      return cena;
    },
  },

  {
    id: "mola",
    nome: "Mola e vareta",
    ideia: "A vareta não cede; a mola cede e devolve. Duas peças iguais, dois comportamentos — e é a mola que faz suspensão, amortecedor e catraca.",
    experimento:
      "Inicie e repare: o peso da esquerda balança e o da direita nem se mexe. A única diferença entre as duas restrições é a marca 'elástica' — marque ela na vareta da direita e esse peso passa a balançar também. Depois mude o comprimento da mola de 120 para 160 mm: o peso passa a descansar mais alto, porque a mola precisa esticar menos para segurar ele.",
    montar() {
      const { cena, P, J, chao } = montador({ nome: "Mola e vareta", vista: "lado" });
      chao(900);
      P({
        nome: "teto",
        catalogo: "solido",
        forma: { tipo: "retangulo", largura: 520, altura: 40 },
        material: "metal",
        x: 0,
        y: 500,
        fixado: true,
        tijolos: true,
      });
      const naMola = P({
        nome: "peso na mola",
        catalogo: "placa",
        forma: { tipo: "retangulo", largura: 70, altura: 70 },
        material: "metal",
        x: -130,
        y: 300,
      });
      J({ tipo: "vareta", a: naMola.id, pa: [0, 35], pb: [-130, 480], comprimento: 120, elastica: true });
      const naVareta = P({
        nome: "peso na vareta",
        catalogo: "placa",
        forma: { tipo: "retangulo", largura: 70, altura: 70 },
        material: "metal",
        x: 130,
        y: 300,
      });
      J({ tipo: "vareta", a: naVareta.id, pa: [0, 35], pb: [130, 480], comprimento: 145 });
      return cena;
    },
  },
];

export function listaDeExemplos() {
  return EXEMPLOS.map(({ id, nome, ideia, experimento }) => ({ id, nome, ideia, experimento }));
}

export function exemploPorId(id) {
  return EXEMPLOS.find((exemplo) => exemplo.id === id) || null;
}

export function montarExemplo(id) {
  const exemplo = exemploPorId(id);
  if (!exemplo) return null;
  const cena = exemplo.montar();
  cena.nome = exemplo.nome;
  return { cena, exemplo };
}
