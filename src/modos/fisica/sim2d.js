// A bancada de Simulação Física 2D.
//
// A bancada tem dois estados, e quase tudo nela depende de qual é:
//
//   PARADA  -> o aluno monta. Arrasta peça, põe pino, muda medida. Nada cai.
//   RODANDO -> a física manda. As peças andam, os sliders controlam motor e
//              servo, e o aluno pode empurrar com o dedo para testar.
//
// Parar devolve tudo para onde estava antes de iniciar. Essa é a regra que
// deixa o aluno apertar "Iniciar" sem medo: testar nunca estraga a montagem.
//
// O desenho fica em desenho2d.js, a física em mundo2d.js, os dados em
// cena2d.js. Aqui mora só a interface e a ordem das coisas.

import { carregarEstilo, carregarScript } from "../../core/carregar-script.js";
import { t } from "../../core/idioma.js";
import { tocar } from "../../core/som.js";
import { valor as ajuste } from "../../core/ajustes.js";
import { baixarJSON, escolherArquivo, lerJSON, carimboDeData } from "../../core/arquivos.js";
import { icone } from "../../ui/icones.js";
import { ferramenta as iconeFerramenta } from "../../ui/icones-ferramentas.js";
import { grupoDeFerramentas, fecharMenusFlutuantes } from "../../ui/menu-flutuante.js";
import { campoArrastavel } from "../../ui/campo-numero.js";
import { abrirPainel, fecharPainel, mostrarAviso, confirmar, perguntarTexto } from "../../ui/painel.js";
import { definirDestino, limparDestino } from "../../ui/painel-bolsa.js";

import * as cenaMod from "./cena2d.js";
import * as desenho from "./desenho2d.js";
import * as mundoMod from "./mundo2d.js";
import * as formas from "./formas2d.js";
import * as atuadores from "./atuadores.js";
import * as exemplos from "./exemplos2d.js";
import {
  MATERIAIS,
  ORDEM_DOS_MATERIAIS,
  arredondarPeso,
  pesoEmGramas,
  receitaDoMaterial,
} from "./unidades.js";

const CHAVE_DO_CACHE = "buradesign:fisica2d";

let planck = null;
let decomp = null;

let areaAtual = null;
let raiz = null;
let tela = null;
let barraStatus = null;
let painelLateral = null;
let painelDeControle = null;
let voltarParaOSetor = null;

let cena = cenaMod.novaCena({ nome: "Montagem nova" });
let camera = desenho.novaCamera();
let selecao = new Set();
let juntaSelecionada = null;
let verColisoes = false;

let ferramentaAtual = "selecionar";
let juntaEmCurso = null; // { tipo, primeiro: {peca, ponto} }
let emCurso = null; // o que o desenho precisa saber da ferramenta
let ultimoMundo = [0, 0];

let estado = null; // o mundo de física, quando rodando
let rodando = false;
let pausadaPorAperto = false;
let quadro = 0;
let ultimoInstante = 0;
let posicoesAntesDeIniciar = null;
let jaOfereceuLento = false;

const desligar = [];

// =========================================================================
// Montagem da tela
// =========================================================================

export async function montar(area, setor, aoVoltar) {
  carregarEstilo("styles/livre.css");
  carregarEstilo("styles/fisica.css");
  areaAtual = area;
  voltarParaOSetor = aoVoltar;

  montarEsqueleto(area);

  try {
    planck = await carregarScript("libs/planck/planck.min.js", "planck");
    decomp = await carregarScript("libs/decomp/decomp.min.js", "decomp");
  } catch (erro) {
    console.error(erro);
    mostrarAviso("Não consegui carregar o motor de física.", "erro");
    return;
  }

  ligarPonteiro();
  ligarTeclado();
  ligarRedimensionamento();

  definirDestino((item) => receberDaBolsa(item));
  desligar.push(() => limparDestino());

  const guardada = lerDoCache();
  if (guardada) {
    cena = guardada;
    mostrarAviso("Montagem anterior recuperada.");
  } else {
    cena = cenaMod.novaCena({ nome: "Montagem nova" });
    cenaMod.reiniciarContagem(0);
  }
  enquadrar();
  atualizarTudo();
}

function montarEsqueleto(area) {
  area.innerHTML = "";
  area.classList.add("conteudo--cheio");
  raiz = document.createElement("div");
  raiz.className = "livre fisica";
  raiz.innerHTML = `
    <div class="livre__barra" role="toolbar" aria-label="Ações da simulação"></div>
    <div class="livre__corpo">
      <nav class="livre__ferramentas" aria-label="Caixa de ferramentas"></nav>
      <div class="livre__palco">
        <canvas id="tela-fisica" aria-label="Bancada de simulação"></canvas>
        <div class="palco__canto palco__canto--zoom"></div>
      </div>
      <aside class="livre__painel" aria-label="Propriedades"></aside>
    </div>
    <div class="fisica__controles" aria-label="Controles dos motores"></div>
    <p class="livre__status" aria-live="off"></p>`;
  area.append(raiz);

  tela = raiz.querySelector("#tela-fisica");
  barraStatus = raiz.querySelector(".livre__status");
  painelLateral = raiz.querySelector(".livre__painel");
  painelDeControle = raiz.querySelector(".fisica__controles");

  montarBarra(raiz.querySelector(".livre__barra"));
  montarFerramentas(raiz.querySelector(".livre__ferramentas"));

  const zoom = raiz.querySelector(".palco__canto--zoom");
  zoom.append(
    botao("mais", "Aproximar", () => {
      desenho.aproximar(camera, 1.25);
      redesenhar();
    }),
    botao("menos", "Afastar", () => {
      desenho.aproximar(camera, 1 / 1.25);
      redesenhar();
    }),
    botao("enquadrar", "Enquadrar a montagem", () => {
      enquadrar();
      redesenhar();
    }),
  );

  const atalho = document.createElement("button");
  atalho.type = "button";
  atalho.className = "botao-propriedades";
  atalho.innerHTML = `${iconeFerramenta("regua")}<span>Propriedades</span>`;
  atalho.addEventListener("click", () => raiz.classList.toggle("livre--painel-aberto"));
  raiz.querySelector(".livre__palco").append(atalho);
}

function botao(nomeIcone, rotulo, aoClicar, { usarIconeUI = false, extra = "" } = {}) {
  const alvo = document.createElement("button");
  alvo.type = "button";
  alvo.className = `botao ${extra}`.trim();
  alvo.title = rotulo;
  alvo.setAttribute("aria-label", rotulo);
  alvo.innerHTML = `${usarIconeUI ? icone(nomeIcone) : iconeFerramenta(nomeIcone)}<span class="rotulo-acao">${rotulo}</span>`;
  alvo.addEventListener("click", () => {
    tocar("clique");
    aoClicar(alvo);
  });
  return alvo;
}

function separador() {
  const barra = document.createElement("span");
  barra.className = "separador";
  return barra;
}

function montarBarra(barra) {
  barra.append(
    botao("voltar", t("acoes.voltarSetor"), () => {
      pararSimulacao({ silencioso: true });
      voltarParaOSetor();
    }, { usarIconeUI: true, extra: "com-rotulo botao--destaque" }),
    separador(),
  );

  const iniciar = botao("iniciar", "Iniciar simulação", () => iniciarSimulacao(), {
    extra: "com-rotulo com-rotulo-sempre botao--destaque",
  });
  iniciar.dataset.papel = "iniciar";
  const parar = botao("parar", "Parar simulação", () => pararSimulacao(), {
    extra: "com-rotulo com-rotulo-sempre botao--perigo",
  });
  parar.dataset.papel = "parar";
  parar.hidden = true;

  const lento = botao("lento", "Simular no modo lento", () => alternarLento(), { extra: "com-rotulo" });
  lento.dataset.papel = "lento";

  barra.append(iniciar, parar, lento, separador());

  const vista = botao("alternar2d", "Vista: de lado", () => alternarVista(), { extra: "com-rotulo" });
  vista.dataset.papel = "vista";
  const gravidade = botao("gravidade", "Gravidade ligada", () => alternarGravidade(), { extra: "com-rotulo" });
  gravidade.dataset.papel = "gravidade";
  const colisoes = botao("verColisao", "Visualizar colisões", () => {
    verColisoes = !verColisoes;
    atualizarBarra();
    redesenhar();
    mostrarAviso(verColisoes ? "Mostrando a forma com que o motor de física trabalha." : "Colisões escondidas.");
  }, { extra: "com-rotulo" });
  colisoes.dataset.papel = "colisoes";

  barra.append(vista, gravidade, colisoes, separador());

  barra.append(
    grupoDeFerramentas({
      id: "arquivoFisica",
      icone: "arquivo",
      rotulo: t("acoes.arquivo"),
      modo: "barra",
      extra: "com-rotulo",
      opcoes: [
        { id: "exemplos", icone: "listaDesafios", rotulo: "Montagens prontas", aoEscolher: abrirExemplos },
        { id: "baixar", icone: "exportar", rotulo: "Baixar a cena", aoEscolher: baixarCena },
        { id: "importar", icone: "pasta", rotulo: "Importar cena", aoEscolher: importarCena },
      ],
    }),
    botao("lixo", "Limpar a bancada", limparBancada, { extra: "botao--perigo" }),
    botao("telaCheia", t("acoes.telaCheia"), alternarTelaCheia),
  );
}

const FERRAMENTAS_DA_CAIXA = [
  { id: "selecionar", icone: "seta", rotulo: "Selecionar" },
  { id: "mao", icone: "mao", rotulo: "Mover a vista" },
];

function montarFerramentas(caixa) {
  for (const item of FERRAMENTAS_DA_CAIXA) {
    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = "ferramenta";
    alvo.dataset.ferramenta = item.id;
    alvo.title = item.rotulo;
    alvo.innerHTML = `${iconeFerramenta(item.icone)}<span>${item.rotulo}</span>`;
    alvo.addEventListener("click", () => escolherFerramenta(item.id));
    caixa.append(alvo);
  }

  caixa.append(
    grupoDeFerramentas({
      id: "pecasFisica",
      icone: "pecaBarra",
      rotulo: "Pôr peça",
      opcoes: formas.PECAS.map((peca) => ({
        id: peca.id,
        icone: peca.icone,
        rotulo: peca.nome,
        aoEscolher: () => porPeca(peca.id),
      })),
    }),
    grupoDeFerramentas({
      id: "juntasFisica",
      icone: "juntaPino",
      rotulo: "Pôr restrição",
      opcoes: cenaMod.ORDEM_DAS_JUNTAS.map((id) => {
        const ficha = cenaMod.TIPOS_DE_JUNTA[id];
        return {
          id,
          icone: ficha.icone,
          rotulo: ficha.nome,
          aoEscolher: () => comecarJunta(id),
        };
      }),
    }),
  );

  const fixar = document.createElement("button");
  fixar.type = "button";
  fixar.className = "ferramenta";
  fixar.dataset.ferramenta = "fixar";
  fixar.title = "Fixar ou soltar a peça escolhida";
  fixar.innerHTML = `${iconeFerramenta("fixarNoLugar")}<span>Fixar no lugar</span>`;
  fixar.addEventListener("click", alternarFixado);
  caixa.append(fixar);

  const apagar = document.createElement("button");
  apagar.type = "button";
  apagar.className = "ferramenta";
  apagar.title = "Apagar o que está escolhido";
  apagar.innerHTML = `${iconeFerramenta("lixo")}<span>Apagar</span>`;
  apagar.addEventListener("click", apagarEscolhido);
  caixa.append(apagar);
}

// =========================================================================
// Estado da interface
// =========================================================================

function escolherFerramenta(id) {
  ferramentaAtual = id;
  juntaEmCurso = null;
  emCurso = null;
  for (const alvo of raiz.querySelectorAll("[data-ferramenta]")) {
    alvo.classList.toggle("ferramenta--ativa", alvo.dataset.ferramenta === id);
  }
  raiz.classList.toggle("livre--mao", id === "mao");
  atualizarStatus();
  redesenhar();
}

function atualizarBarra() {
  const achar = (papel) => raiz.querySelector(`[data-papel="${papel}"]`);
  achar("iniciar").hidden = rodando;
  achar("parar").hidden = !rodando;
  achar("lento").classList.toggle("botao--ativo", Boolean(estado?.lento));

  const vista = achar("vista");
  const deLado = cena.vista === "lado";
  vista.title = deLado ? "Vista: de lado" : "Vista: de cima";
  vista.querySelector(".rotulo-acao").textContent = deLado ? "De lado" : "De cima";

  const gravidade = achar("gravidade");
  const ligada = cenaMod.gravidadeLigada(cena);
  gravidade.classList.toggle("botao--ativo", ligada);
  gravidade.disabled = !deLado;
  gravidade.title = deLado
    ? ligada
      ? "Gravidade ligada (clique para desligar)"
      : "Gravidade desligada (clique para ligar)"
    : "Na vista de cima não existe gravidade na tela";
  gravidade.querySelector(".rotulo-acao").textContent = ligada ? "Com gravidade" : "Sem gravidade";

  achar("colisoes").classList.toggle("botao--ativo", verColisoes);
}

function atualizarStatus() {
  const corpos = cenaMod.contarCorpos(cena);
  const motores = cenaMod.juntasComMotor(cena).length;
  const peso = cenaMod.pesoDaCena(cena);

  if (juntaEmCurso) {
    const ficha = cenaMod.TIPOS_DE_JUNTA[juntaEmCurso.tipo];
    if (!juntaEmCurso.primeiro) {
      barraStatus.textContent = `${ficha.nome}: toque na primeira peça, no ponto onde a restrição entra. Esc desiste.`;
    } else if (ficha.id === "engrenar") {
      barraStatus.textContent = "Engrenar: agora toque na outra engrenagem.";
    } else {
      barraStatus.textContent =
        "Agora toque na segunda peça, no ponto dela. Tocando no vazio, a restrição prende na bancada.";
    }
    return;
  }

  const pedacos = [
    `${corpos} peça(s)`,
    `${cena.juntas.length} restrição(ões)`,
    motores ? `${motores} com motor` : "sem motor",
    arredondarPeso(peso),
    rodando ? (estado?.lento ? "RODANDO (lento)" : "RODANDO") : "parada",
  ];
  if (corpos > cenaMod.CORPOS_PARA_ALERTA_CRITICO) {
    pedacos.push(`ATENÇÃO: acima de ${cenaMod.CORPOS_PARA_ALERTA_CRITICO} peças a simulação pode travar o aparelho`);
  } else if (corpos > cenaMod.CORPOS_PARA_AVISAR) {
    pedacos.push("montagem grande: pode ficar lenta");
  }
  barraStatus.textContent = pedacos.join(" · ");
  barraStatus.classList.toggle("livre__status--alerta", corpos > cenaMod.CORPOS_PARA_ALERTA_CRITICO);
}

function atualizarTudo() {
  atualizarBarra();
  atualizarPainel();
  atualizarControles();
  atualizarStatus();
  redesenhar();
  guardarNoCache();
}

function redesenhar() {
  if (!tela) return;
  desenho.desenhar(tela, {
    cena,
    camera,
    selecao,
    juntaSelecionada,
    verColisoes,
    decomp,
    emCurso,
    rodando,
    raizDeEstilo: raiz,
  });
}

function enquadrar() {
  desenho.enquadrar(camera, cena, desenho.tamanhoDaTela(tela));
}

// =========================================================================
// Peças e restrições
// =========================================================================

function meioDaVista() {
  const { largura, altura } = desenho.tamanhoDaTela(tela);
  return desenho.paraOMundoDaTela(camera, [largura / 2, altura / 2], { largura, altura });
}

function porPeca(id) {
  if (rodando) {
    mostrarAviso("Pare a simulação para mexer na montagem.", "alerta");
    return;
  }
  const onde = meioDaVista();
  const peca = cenaMod.pecaDoMenu(id, { x: Math.round(onde[0]), y: Math.round(onde[1]) });
  if (!peca) return;
  // O sólido nasce no chão da vista, não no meio do ar: é parede e piso.
  if (peca.fixado && cena.vista === "lado") peca.y = -peca.forma.altura / 2;
  else subirAteCaber(peca);
  cenaMod.adicionarPeca(cena, peca);
  selecao = new Set([peca.id]);
  juntaSelecionada = null;
  escolherFerramenta("selecionar");
  avisarSeLotou();
  atualizarTudo();
}

// Peça nova não pode nascer dentro de outra. Nascendo dentro, ela só
// aparece no primeiro "Iniciar", quando as duas se empurram e saem voando —
// e aí o aluno acha que a bancada é maluca. Aqui ela sobe até achar lugar.
function subirAteCaber(peca) {
  const meu = formas.medidasDaForma(peca.forma).raio;
  for (let tentativa = 0; tentativa < 30; tentativa += 1) {
    const esbarrando = cena.pecas.find((outra) => {
      const dela = formas.medidasDaForma(outra.forma).raio;
      return Math.hypot(outra.x - peca.x, outra.y - peca.y) < (meu + dela) * 0.75;
    });
    if (!esbarrando) return;
    peca.y = Math.round(esbarrando.y + formas.medidasDaForma(esbarrando.forma).raio + meu + 10);
  }
}

function avisarSeLotou() {
  const corpos = cenaMod.contarCorpos(cena);
  if (corpos === cenaMod.CORPOS_PARA_ALERTA_CRITICO + 1) {
    mostrarAviso(
      `Passou de ${cenaMod.CORPOS_PARA_ALERTA_CRITICO} peças. A simulação pode travar o aparelho — dá para continuar montando, mas vale usar o modo lento.`,
      "erro",
    );
  } else if (corpos === cenaMod.CORPOS_PARA_AVISAR + 1) {
    mostrarAviso(`Passou de ${cenaMod.CORPOS_PARA_AVISAR} peças. A simulação vai ficar mais lenta.`, "alerta");
  }
}

function comecarJunta(tipo) {
  if (rodando) {
    mostrarAviso("Pare a simulação para pôr restrição.", "alerta");
    return;
  }
  if (cena.pecas.length < 1) {
    mostrarAviso("Ponha uma peça primeiro.", "alerta");
    return;
  }
  ferramentaAtual = "junta";
  juntaEmCurso = { tipo, primeiro: null };
  emCurso = { primeiro: null };
  for (const alvo of raiz.querySelectorAll("[data-ferramenta]")) alvo.classList.remove("ferramenta--ativa");
  raiz.classList.remove("livre--mao");
  atualizarStatus();
  redesenhar();
}

// O toque da ferramenta de restrição. O ponto escolhido é o do dedo, mas se
// houver uma mira perto (centro da peça, furo da barra), ele cola nela — mirar
// no milímetro com o mouse é tarefa de adulto cansado.
function tocarComAJunta(pontoNoMundo) {
  const alcance = 10 / camera.zoom;
  const peca = cenaMod.pecaNoPonto(cena, pontoNoMundo);

  if (!juntaEmCurso.primeiro) {
    if (!peca) {
      mostrarAviso("Toque em cima de uma peça.", "alerta");
      return;
    }
    const mira = cenaMod.miraMaisPerto(peca, pontoNoMundo, alcance);
    const ponto = mira || cenaMod.paraAPeca(peca, pontoNoMundo);
    juntaEmCurso.primeiro = { peca: peca.id, ponto: [arredondar(ponto[0]), arredondar(ponto[1])] };
    emCurso = { primeiro: juntaEmCurso.primeiro };
    tocar("encaixe");
    atualizarStatus();
    redesenhar();
    return;
  }

  const primeiro = juntaEmCurso.primeiro;
  const segundaPeca = peca && peca.id !== primeiro.peca ? peca : null;
  const resposta = cenaMod.conferirJunta(cena, {
    tipo: juntaEmCurso.tipo,
    a: primeiro.peca,
    b: segundaPeca?.id || null,
  });
  if (!resposta.pode) {
    mostrarAviso(resposta.motivo, "alerta");
    tocar("bloqueado");
    return;
  }

  let pb;
  if (segundaPeca) {
    const mira = cenaMod.miraMaisPerto(segundaPeca, pontoNoMundo, alcance);
    const local = mira || cenaMod.paraAPeca(segundaPeca, pontoNoMundo);
    pb = [arredondar(local[0]), arredondar(local[1])];
  } else {
    // Prender na bancada: o ponto vale em coordenadas do mundo.
    pb = [arredondar(pontoNoMundo[0]), arredondar(pontoNoMundo[1])];
  }

  const junta = cenaMod.novaJunta({
    tipo: juntaEmCurso.tipo,
    a: primeiro.peca,
    b: segundaPeca?.id || null,
    pa: primeiro.ponto,
    pb,
  });

  if (junta.tipo === "engrenar") {
    // Encostar as duas na distância certa: a soma dos primitivos. Acertar isso
    // no olho é quase impossível, e errado por 2 mm já é engrenagem que range.
    const a = cenaMod.pecaPorId(cena, junta.a);
    const b = cenaMod.pecaPorId(cena, junta.b);
    const certa = cenaMod.distanciaDeEngrenamento(a, b);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const agora = Math.hypot(dx, dy) || 1;
    b.x = a.x + (dx / agora) * certa;
    b.y = a.y + (dy / agora) * certa;
    const pinoDeB = cena.juntas.find((j) => j.tipo === "pino" && j.a === b.id && !j.b);
    if (pinoDeB) pinoDeB.pb = [arredondar(b.x), arredondar(b.y)];
    mostrarAviso(`Engrenadas: centros a ${certa.toFixed(1)} mm, que é a soma dos primitivos.`);
  }
  if (junta.tipo === "trilho") {
    // Um trilho só faz sentido na direção em que a peça deve correr; a reta
    // entre os dois pontos escolhidos é o melhor palpite.
    const de = cenaMod.paraOMundo(cenaMod.pecaPorId(cena, junta.a), junta.pa);
    const ate = segundaPeca ? cenaMod.paraOMundo(segundaPeca, pb) : pb;
    const dx = ate[0] - de[0];
    const dy = ate[1] - de[1];
    if (Math.hypot(dx, dy) > 4) junta.eixo = Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  }

  cenaMod.adicionarJunta(cena, junta);
  juntaEmCurso = null;
  emCurso = null;
  juntaSelecionada = junta.id;
  selecao = new Set();
  tocar("salvar");
  escolherFerramenta("selecionar");
  atualizarTudo();
}

const arredondar = (numero) => Math.round(numero * 10) / 10;

function alternarFixado() {
  if (rodando) {
    mostrarAviso("Pare a simulação para fixar peça.", "alerta");
    return;
  }
  if (!selecao.size) {
    mostrarAviso("Escolha uma peça primeiro.", "alerta");
    return;
  }
  let fixaram = 0;
  for (const id of selecao) {
    const peca = cenaMod.pecaPorId(cena, id);
    if (!peca) continue;
    peca.fixado = !peca.fixado;
    if (peca.fixado) fixaram += 1;
  }
  mostrarAviso(fixaram ? "Peça ancorada: não cai e não sai do lugar." : "Peça solta.");
  atualizarTudo();
}

function apagarEscolhido() {
  if (rodando) {
    mostrarAviso("Pare a simulação para apagar.", "alerta");
    return;
  }
  if (juntaSelecionada) {
    cenaMod.removerJunta(cena, juntaSelecionada);
    juntaSelecionada = null;
    mostrarAviso("Restrição apagada.");
    atualizarTudo();
    return;
  }
  if (!selecao.size) {
    mostrarAviso("Nada escolhido.", "alerta");
    return;
  }
  for (const id of selecao) cenaMod.removerPeca(cena, id);
  selecao = new Set();
  mostrarAviso("Peça apagada, junto com as restrições dela.");
  atualizarTudo();
}

// =========================================================================
// Simulação
// =========================================================================

function iniciarSimulacao() {
  if (rodando) return;
  if (!cena.pecas.length) {
    mostrarAviso("Ponha alguma peça antes de simular.", "alerta");
    return;
  }
  juntaEmCurso = null;
  emCurso = null;
  posicoesAntesDeIniciar = cenaMod.guardarPosicoes(cena);
  jaOfereceuLento = false;
  try {
    estado = mundoMod.criarMundo(cena, { planck, decomp });
  } catch (erro) {
    console.error(erro);
    mostrarAviso("Não consegui montar a simulação desta cena.", "erro");
    estado = null;
    return;
  }
  for (const aviso of estado.avisos) mostrarAviso(aviso, "alerta");
  rodando = true;
  pausadaPorAperto = false;
  ultimoInstante = performance.now();
  quadro = requestAnimationFrame(passoDoQuadro);
  tocar("pronto");
  atualizarBarra();
  atualizarPainel();
  atualizarControles();
  atualizarStatus();
}

function pararSimulacao({ silencioso = false } = {}) {
  if (!rodando && !estado) return;
  cancelAnimationFrame(quadro);
  quadro = 0;
  rodando = false;
  pausadaPorAperto = false;
  mundoMod.destruirMundo(estado);
  estado = null;
  if (posicoesAntesDeIniciar) cenaMod.restaurarPosicoes(cena, posicoesAntesDeIniciar);
  posicoesAntesDeIniciar = null;
  if (!silencioso) {
    tocar("fechar");
    mostrarAviso("Simulação parada. As peças voltaram para onde estavam.");
  }
  if (raiz) atualizarTudo();
}

function passoDoQuadro(agora) {
  if (!rodando || !estado) return;
  const dt = (agora - ultimoInstante) / 1000;
  ultimoInstante = agora;

  if (!pausadaPorAperto) {
    mundoMod.avancar(estado, dt);
    mundoMod.escreverPosicoes(estado);
    atualizarLeituras();
    redesenhar();

    if (estado.apertou && !jaOfereceuLento) {
      jaOfereceuLento = true;
      oferecerModoLento();
    }
  }
  quadro = requestAnimationFrame(passoDoQuadro);
}

// Quando o aparelho não está dando conta, a simulação PARA e pergunta. Deixar
// ela arrastando enquanto o aluno acha que travou é pior do que interromper.
function oferecerModoLento() {
  pausadaPorAperto = true;
  const corpo = document.createElement("div");
  corpo.innerHTML = `
    <p>Este aparelho está apertado para o tamanho desta montagem: a simulação
    está andando mais devagar do que deveria.</p>
    <p class="dica">No modo lento, o tempo da simulação corre a menos da metade
    da velocidade. A conta continua igualmente certa — só passa mais devagar,
    o que também ajuda a ver o mecanismo funcionando. Nenhuma peça atravessa
    outra por causa disso.</p>`;
  abrirPainel({
    titulo: "A simulação está pesada",
    corpo,
    botoes: [
      {
        rotulo: "Simular no modo lento",
        variante: "destaque",
        icone: "lento",
        aoClicar: () => {
          if (estado) {
            estado.lento = true;
            estado.acumulado = 0;
            estado.atrasos = 0;
            estado.quadros = 0;
          }
          pausadaPorAperto = false;
          fecharPainel();
          atualizarBarra();
          atualizarStatus();
          mostrarAviso("Modo lento ligado.");
        },
      },
      {
        rotulo: "Continuar assim",
        aoClicar: () => {
          pausadaPorAperto = false;
          fecharPainel();
        },
      },
      {
        rotulo: "Parar a simulação",
        variante: "perigo",
        aoClicar: () => {
          fecharPainel();
          pararSimulacao();
        },
      },
    ],
    aoFechar: () => {
      pausadaPorAperto = false;
    },
  });
}

function alternarLento() {
  if (!estado) {
    mostrarAviso("O modo lento vale enquanto a simulação está rodando.", "alerta");
    return;
  }
  estado.lento = !estado.lento;
  estado.acumulado = 0;
  mostrarAviso(estado.lento ? "Modo lento ligado." : "Velocidade normal.");
  atualizarBarra();
  atualizarStatus();
}

function alternarVista() {
  if (rodando) {
    mostrarAviso("Pare a simulação para trocar a vista.", "alerta");
    return;
  }
  cena.vista = cena.vista === "lado" ? "cima" : "lado";
  mostrarAviso(
    cena.vista === "lado"
      ? "Vista de lado: a gravidade aponta para baixo da tela. Boa para alavanca e gangorra."
      : "Vista de cima: nada cai. Boa para engrenagem, came e mesa giratória.",
  );
  atualizarTudo();
}

function alternarGravidade() {
  if (cena.vista !== "lado") return;
  if (rodando) {
    mostrarAviso("Pare a simulação para mexer na gravidade.", "alerta");
    return;
  }
  cena.gravidade = !cenaMod.gravidadeLigada(cena);
  mostrarAviso(
    cena.gravidade
      ? "Gravidade ligada."
      : "Gravidade desligada. Bom para estudar engrenagem sem o peso atrapalhando.",
  );
  atualizarTudo();
}

// =========================================================================
// Painel de controle dos motores
// =========================================================================

function atualizarControles() {
  if (!painelDeControle) return;
  painelDeControle.innerHTML = "";
  const comMotor = cenaMod.juntasComMotor(cena);
  painelDeControle.hidden = comMotor.length === 0;
  if (!comMotor.length) return;

  const titulo = document.createElement("h3");
  titulo.textContent = rodando ? "Controles (ao vivo)" : "Controles";
  painelDeControle.append(titulo);

  for (const junta of comMotor) {
    const faixa = atuadores.faixaDoControle(junta.acionamento);
    const peca = cenaMod.pecaPorId(cena, junta.a);
    const linha = document.createElement("div");
    linha.className = "controle";
    linha.dataset.junta = junta.id;

    const nome = document.createElement("span");
    nome.className = "controle__nome";
    nome.innerHTML = `${iconeFerramenta(junta.acionamento.tipo === "servo" ? "servo" : "motor")}<span>${peca?.nome || "peça"}</span>`;

    const barra = document.createElement("input");
    barra.type = "range";
    barra.min = String(faixa.min);
    barra.max = String(faixa.max);
    barra.step = String(faixa.passo);
    barra.value = String(faixa.valor);
    barra.setAttribute("aria-label", `${atuadores.rotuloDoControle(junta.acionamento)} de ${peca?.nome || "peça"}`);
    barra.addEventListener("input", () => {
      atuadores.aplicarControle(junta.acionamento, Number(barra.value));
      numero.textContent = formatarControle(junta.acionamento, Number(barra.value));
      if (!rodando) guardarNoCache();
    });

    const numero = document.createElement("span");
    numero.className = "controle__numero";
    numero.textContent = formatarControle(junta.acionamento, faixa.valor);

    const leitura = document.createElement("span");
    leitura.className = "controle__leitura";
    leitura.dataset.leitura = junta.id;

    linha.append(nome, barra, numero, leitura);
    painelDeControle.append(linha);
  }
}

function formatarControle(acionamento, valorAtual) {
  return acionamento.tipo === "motor" ? `${valorAtual}%` : `${valorAtual}°`;
}

function atualizarLeituras() {
  if (!estado) return;
  for (const leitura of mundoMod.leiturasDosAtuadores(estado)) {
    const alvo = painelDeControle?.querySelector(`[data-leitura="${leitura.junta}"]`);
    if (!alvo) continue;
    const parte =
      leitura.tipo === "motor"
        ? `${leitura.rpm.toFixed(0)} rpm`
        : `${leitura.graus.toFixed(0)}°`;
    alvo.textContent = `${parte} · ${leitura.torqueKgfcm.toFixed(2)}/${leitura.torqueMaxKgfcm} kgf·cm`;
    alvo.classList.toggle("controle__leitura--forcando", leitura.forcando);
    alvo.title = leitura.forcando
      ? "Está dando todo o torque que tem e mesmo assim não dá conta."
      : "Torque usado de torque disponível.";
  }
}

// =========================================================================
// Painel de propriedades
// =========================================================================

function grupo(titulo) {
  const caixa = document.createElement("div");
  caixa.className = "grupo-propriedades";
  if (titulo) {
    const h = document.createElement("h3");
    h.textContent = titulo;
    caixa.append(h);
  }
  return caixa;
}

function dica(texto) {
  const p = document.createElement("p");
  p.className = "dica";
  p.textContent = texto;
  return p;
}

function escolha({ rotulo, opcoes, valorAtual, aoMudar }) {
  const caixa = document.createElement("label");
  caixa.className = "propriedade";
  const nome = document.createElement("span");
  nome.className = "propriedade__nome";
  nome.textContent = rotulo;
  const campo = document.createElement("select");
  for (const [id, texto] of opcoes) {
    const opcao = document.createElement("option");
    opcao.value = id;
    opcao.textContent = texto;
    if (id === valorAtual) opcao.selected = true;
    campo.append(opcao);
  }
  campo.addEventListener("change", () => aoMudar(campo.value));
  caixa.append(nome, campo);
  return caixa;
}

function marca({ rotulo, marcado, aoMudar, titulo = "" }) {
  const caixa = document.createElement("label");
  caixa.className = "propriedade propriedade--marca";
  const nome = document.createElement("span");
  nome.className = "propriedade__nome";
  nome.textContent = rotulo;
  if (titulo) nome.title = titulo;
  const campo = document.createElement("input");
  campo.type = "checkbox";
  campo.checked = Boolean(marcado);
  campo.addEventListener("change", () => aoMudar(campo.checked));
  caixa.append(nome, campo);
  return caixa;
}

function atualizarPainel() {
  if (!painelLateral) return;
  painelLateral.innerHTML = "";

  if (juntaSelecionada) {
    painelDaJunta(cenaMod.juntaPorId(cena, juntaSelecionada));
    return;
  }
  if (selecao.size === 1) {
    painelDaPeca(cenaMod.pecaPorId(cena, [...selecao][0]));
    return;
  }
  if (selecao.size > 1) {
    const caixa = grupo(`${selecao.size} peças escolhidas`);
    caixa.append(dica("Fixar no lugar e Apagar valem para todas. Para mudar medida, escolha uma só."));
    painelLateral.append(caixa);
    return;
  }
  painelDaCena();
}

function painelDaCena() {
  const caixa = grupo("A montagem");
  const nome = document.createElement("label");
  nome.className = "propriedade";
  const campo = document.createElement("input");
  campo.type = "text";
  campo.value = cena.nome;
  campo.maxLength = 60;
  campo.addEventListener("change", () => {
    cena.nome = campo.value.trim() || "Montagem sem nome";
    guardarNoCache();
  });
  nome.append(campo);
  caixa.append(nome);

  const peso = cenaMod.pesoDaCena(cena);
  caixa.append(
    dica(
      `${cenaMod.contarCorpos(cena)} peça(s), ${cena.juntas.length} restrição(ões), ${arredondarPeso(peso)} no total.`,
    ),
  );
  caixa.append(
    dica(
      cena.vista === "lado"
        ? "Vista de lado: a gravidade aponta para baixo da tela."
        : "Vista de cima: você está olhando a mesa do alto, nada cai.",
    ),
  );
  painelLateral.append(caixa);

  const aulas = grupo("Montagens prontas");
  aulas.append(dica("Cada uma tem uma ideia de mecânica dentro e diz o que testar nela."));
  const lista = document.createElement("div");
  lista.className = "fisica__exemplos";
  for (const ficha of exemplos.listaDeExemplos()) {
    lista.append(cartaoDeExemplo(ficha));
  }
  aulas.append(lista);
  painelLateral.append(aulas);
}

// A prévia de cada exemplo é a própria cena dele desenhada pequena. Sai melhor
// do que qualquer ícone: é o mecanismo de verdade, e nunca fica desatualizada.
function cartaoDeExemplo(ficha) {
  const alvo = document.createElement("button");
  alvo.type = "button";
  alvo.className = "fisica__exemplo";
  alvo.title = ficha.ideia;

  const previa = document.createElement("canvas");
  previa.className = "fisica__previa";
  previa.width = 220;
  previa.height = 110;
  alvo.append(previa);

  const nome = document.createElement("span");
  nome.className = "fisica__exemplo-nome";
  nome.textContent = ficha.nome;
  alvo.append(nome);

  alvo.addEventListener("click", () => abrirExemplo(ficha.id));

  // Desenhar depois de o cartão entrar na página, senão as cores do CSS ainda
  // não existem e a prévia sai preta no preto.
  requestAnimationFrame(() => {
    const montado = exemplos.montarExemplo(ficha.id);
    if (!montado) return;
    const cameraDaPrevia = desenho.novaCamera();
    desenho.enquadrar(cameraDaPrevia, montado.cena, { largura: 220, altura: 110 }, 1.12);
    try {
      desenho.desenhar(previa, {
        cena: montado.cena,
        camera: cameraDaPrevia,
        raizDeEstilo: raiz,
      });
    } catch (erro) {
      console.warn("Não consegui desenhar a prévia do exemplo", erro);
    }
  });

  return alvo;
}

function painelDaPeca(peca) {
  if (!peca) return;
  const receita = receitaDoMaterial(peca);
  const ficha = cenaMod.fichaDaPeca(peca);

  const cabeca = grupo(peca.nome);
  const campoNome = document.createElement("label");
  campoNome.className = "propriedade";
  const entrada = document.createElement("input");
  entrada.type = "text";
  entrada.value = peca.nome;
  entrada.maxLength = 40;
  entrada.addEventListener("change", () => {
    peca.nome = entrada.value.trim() || "Peça";
    atualizarTudo();
  });
  campoNome.append(entrada);
  cabeca.append(campoNome);
  cabeca.append(dica(`Pesa ${arredondarPeso(ficha.gramas)} · mede ${ficha.medidas.largura.toFixed(0)} × ${ficha.medidas.altura.toFixed(0)} mm`));
  painelLateral.append(cabeca);

  // --- forma ---
  const forma = grupo("Medidas");
  const campos = {
    largura: { rotulo: "Largura", min: 4, max: 4000, passo: 5 },
    altura: { rotulo: "Altura", min: 4, max: 4000, passo: 5 },
    raio: { rotulo: "Raio", min: 3, max: 1000, passo: 5 },
    dentes: { rotulo: "Dentes", min: formas.LIMITES_DA_ENGRENAGEM.dentesMin, max: formas.LIMITES_DA_ENGRENAGEM.dentesMax, passo: 1, inteiro: true },
    modulo: { rotulo: "Módulo do dente", min: formas.LIMITES_DA_ENGRENAGEM.moduloMin, max: formas.LIMITES_DA_ENGRENAGEM.moduloMax, passo: 0.5 },
  };
  for (const chave of Object.keys(campos)) {
    if (!(chave in peca.forma)) continue;
    const regra = campos[chave];
    forma.append(
      campoArrastavel({
        rotulo: regra.rotulo,
        valorInicial: peca.forma[chave],
        passo: regra.passo,
        min: regra.min,
        max: regra.max,
        inteiro: Boolean(regra.inteiro),
        sufixo: chave === "dentes" ? "" : "mm",
        aoAplicar: (novo) => {
          peca.forma[chave] = novo;
          atualizarTudo();
        },
      }),
    );
  }
  if (peca.forma.tipo === "engrenagem") {
    const g = formas.medidasDaEngrenagem(peca.forma.dentes, peca.forma.modulo);
    forma.append(
      dica(
        `Primitivo ${g.primitivo.toFixed(1)} mm · topo ${g.topo.toFixed(1)} mm. Duas engrenagens só engrenam com o mesmo módulo.`,
      ),
    );
  }
  painelLateral.append(forma);

  // --- lugar ---
  const lugar = grupo("Lugar na bancada");
  for (const [chave, rotulo] of [["x", "X"], ["y", "Y"], ["giro", "Giro"]]) {
    lugar.append(
      campoArrastavel({
        rotulo,
        valorInicial: peca[chave],
        passo: chave === "giro" ? 5 : 10,
        min: chave === "giro" ? -3600 : -100000,
        max: chave === "giro" ? 3600 : 100000,
        sufixo: chave === "giro" ? "graus" : "mm",
        aoAplicar: (novo) => {
          peca[chave] = novo;
          atualizarTudo();
        },
      }),
    );
  }
  painelLateral.append(lugar);

  // --- material ---
  const material = grupo("Material");
  material.append(
    escolha({
      rotulo: "Feita de",
      opcoes: ORDEM_DOS_MATERIAIS.map((id) => [id, MATERIAIS[id].nome]),
      valorAtual: peca.material,
      aoMudar: (novo) => {
        peca.material = novo;
        if (novo === "customizado") {
          // Começa do material anterior, para o aluno mexer a partir de algo
          // que ele já viu funcionar.
          peca.densidade = receita.densidade;
          peca.espessura = receita.espessura;
          peca.atrito = receita.atrito;
          peca.quique = receita.quique;
        } else {
          delete peca.densidade;
          delete peca.espessura;
          if (!peca.borracha) {
            delete peca.atrito;
            delete peca.quique;
          }
        }
        atualizarTudo();
      },
    }),
  );
  if (peca.material === "customizado") {
    const regras = [
      ["densidade", "Peso do material", "g/cm³", 0.05, 25, 0.05, 1000],
      ["espessura", "Espessura", "mm", 0.5, 60, 0.5, 1],
      ["atrito", "Atrito", "0 a 2", 0, 2, 0.05, 1],
      ["quique", "Quique", "0 a 1", 0, 0.95, 0.05, 1],
    ];
    for (const [chave, rotulo, sufixo, min, max, passo, divisor] of regras) {
      material.append(
        campoArrastavel({
          rotulo,
          valorInicial: (peca[chave] ?? receita[chave]) / divisor,
          passo,
          min,
          max,
          sufixo,
          aoAplicar: (novo) => {
            peca[chave] = novo * divisor;
            atualizarTudo();
          },
        }),
      );
    }
    material.append(dica("Água é 1 g/cm³, madeira 0,7, alumínio 2,7, aço 7,8."));
  } else {
    material.append(
      dica(
        `${receita.densidade} kg/m³, ${receita.espessura} mm de espessura, atrito ${receita.atrito}. Uma placa de 100 × 100 mm deste material pesa ${arredondarPeso(pesoEmGramas(10000, receita))}.`,
      ),
    );
  }
  material.append(
    marca({
      rotulo: "Roda de borracha",
      marcado: peca.borracha,
      titulo: "Borracha agarra muito mais no chão. Sem ela, a roda patina.",
      aoMudar: (ligado) => {
        peca.borracha = ligado;
        if (ligado) {
          peca.atrito = 1.1;
          peca.quique = 0.1;
        } else if (peca.material !== "customizado") {
          delete peca.atrito;
          delete peca.quique;
        }
        atualizarTudo();
      },
    }),
  );
  painelLateral.append(material);

  // --- comportamento ---
  const jeito = grupo("Como ela se comporta");
  jeito.append(
    marca({
      rotulo: "Fixada no lugar",
      marcado: peca.fixado,
      titulo: "Peça ancorada não cai nem sai do lugar: é chão, parede e pilar.",
      aoMudar: (ligado) => {
        peca.fixado = ligado;
        atualizarTudo();
      },
    }),
    marca({
      rotulo: "Textura de tijolos",
      marcado: peca.tijolos,
      aoMudar: (ligado) => {
        peca.tijolos = ligado;
        atualizarTudo();
      },
    }),
    escolha({
      rotulo: "Colisão",
      opcoes: [
        ["simples", "Simplificada (rápida)"],
        ["exata", "Exata (pesada)"],
      ],
      valorAtual: peca.colisao,
      aoMudar: (novo) => {
        peca.colisao = novo;
        if (novo === "exata") {
          const partes = formas.esbocoDaColisao(peca.forma, { exata: true, decomp });
          if (formas.complicadoDemais(partes)) {
            mostrarAviso(
              `Esta peça virou ${partes.length} pedaços de colisão. Vai funcionar, mas pesa — na dúvida, volte para a simplificada.`,
              "alerta",
            );
          }
        }
        atualizarTudo();
      },
    }),
    marca({
      rotulo: "Visualizar colisões",
      marcado: verColisoes,
      titulo: "Mostra na tela a forma com que o motor de física realmente trabalha.",
      aoMudar: (ligado) => {
        verColisoes = ligado;
        atualizarTudo();
      },
    }),
  );
  if (peca.forma.tipo === "engrenagem") {
    jeito.append(
      dica(
        "O dente da engrenagem é desenhado de verdade, mas não é ele que colide: a razão entre duas engrenagens é garantida pela restrição Engrenar.",
      ),
    );
  }
  painelLateral.append(jeito);

  const ligadas = cena.juntas.filter((junta) => junta.a === peca.id || junta.b === peca.id);
  if (ligadas.length) {
    const presas = grupo("Restrições nesta peça");
    for (const junta of ligadas) {
      const alvo = document.createElement("button");
      alvo.type = "button";
      alvo.className = "botao botao--curto";
      alvo.innerHTML = `${iconeFerramenta(cenaMod.TIPOS_DE_JUNTA[junta.tipo].icone)}<span>${desenho.nomeDaJunta(junta)}${junta.acionamento ? " (com motor)" : ""}</span>`;
      alvo.addEventListener("click", () => {
        selecao = new Set();
        juntaSelecionada = junta.id;
        atualizarTudo();
      });
      presas.append(alvo);
    }
    painelLateral.append(presas);
  }
}

function painelDaJunta(junta) {
  if (!junta) return;
  const ficha = cenaMod.TIPOS_DE_JUNTA[junta.tipo];
  const pecaA = cenaMod.pecaPorId(cena, junta.a);
  const pecaB = junta.b ? cenaMod.pecaPorId(cena, junta.b) : null;

  const cabeca = grupo(ficha.nome);
  cabeca.append(dica(ficha.dica));
  cabeca.append(
    dica(`Entre ${pecaA?.nome || "?"} e ${pecaB ? pecaB.nome : "a bancada"}.`),
  );
  painelLateral.append(cabeca);

  const pontos = grupo("Os dois pontos");
  pontos.append(
    dica(
      pecaB
        ? "Cada ponto é marcado na sua própria peça. Ao iniciar, as duas se puxam até os pontos se encontrarem."
        : "O primeiro ponto é na peça; o segundo é o lugar da bancada onde ela fica presa.",
    ),
  );
  const nomeDe = (qual) =>
    qual === "pa" ? `Na ${pecaA?.nome || "peça"}` : pecaB ? `Na ${pecaB.nome}` : "Na bancada";
  for (const qual of ["pa", "pb"]) {
    for (const eixo of [0, 1]) {
      pontos.append(
        campoArrastavel({
          rotulo: `${nomeDe(qual)} · ${eixo ? "Y" : "X"}`,
          valorInicial: junta[qual][eixo],
          passo: 5,
          min: -100000,
          max: 100000,
          sufixo: "mm",
          aoAplicar: (novo) => {
            junta[qual][eixo] = novo;
            atualizarTudo();
          },
        }),
      );
    }
  }
  painelLateral.append(pontos);

  if (junta.tipo === "trilho") {
    const trilho = grupo("Direção do trilho");
    trilho.append(
      campoArrastavel({
        rotulo: "Ângulo",
        valorInicial: junta.eixo,
        passo: 5,
        min: -180,
        max: 180,
        sufixo: "graus",
        aoAplicar: (novo) => {
          junta.eixo = novo;
          atualizarTudo();
        },
      }),
      dica("0 corre na horizontal, 90 na vertical."),
    );
    painelLateral.append(trilho);
  }

  if (junta.tipo === "vareta") {
    const vareta = grupo("A vareta");
    const atual =
      junta.comprimento ??
      Math.round(
        Math.hypot(
          (pecaB ? cenaMod.paraOMundo(pecaB, junta.pb) : junta.pb)[0] - cenaMod.paraOMundo(pecaA, junta.pa)[0],
          (pecaB ? cenaMod.paraOMundo(pecaB, junta.pb) : junta.pb)[1] - cenaMod.paraOMundo(pecaA, junta.pa)[1],
        ),
      );
    vareta.append(
      campoArrastavel({
        rotulo: "Comprimento",
        valorInicial: atual,
        passo: 5,
        min: 1,
        max: 100000,
        sufixo: "mm",
        aoAplicar: (novo) => {
          junta.comprimento = novo;
          atualizarTudo();
        },
      }),
      marca({
        rotulo: "Elástica (mola)",
        marcado: junta.elastica,
        titulo: "Marcada, ela cede e devolve. Desmarcada, é uma barra que não cede nada.",
        aoMudar: (ligado) => {
          junta.elastica = ligado;
          atualizarTudo();
        },
      }),
    );
    painelLateral.append(vareta);
  }

  if (junta.tipo === "engrenar" && pecaA && pecaB) {
    const engrenar = grupo("A razão");
    const razao = cenaMod.razaoDoEngrenamento(cena, junta);
    engrenar.append(
      dica(
        `${pecaA.forma.dentes} dentes puxando ${pecaB.forma.dentes}: a segunda dá 1 volta para cada ${razao.toFixed(2)} volta(s) da primeira, no sentido contrário.`,
      ),
      dica(
        razao > 1
          ? `Redução: a segunda gira ${razao.toFixed(2)} vezes mais devagar e, em troca, ${razao.toFixed(2)} vezes mais forte.`
          : `Multiplicação: a segunda gira ${(1 / razao).toFixed(2)} vezes mais rápido e ${(1 / razao).toFixed(2)} vezes mais fraca.`,
      ),
      dica("A razão vem dos dentes, que são número inteiro. Por isso ela nunca escorrega."),
    );
    painelLateral.append(engrenar);
  }

  if (ficha.aceitaMotor) {
    const motor = grupo("Motor neste pino");
    motor.append(
      escolha({
        rotulo: "Atuador",
        opcoes: [
          ["", "Sem motor (gira livre)"],
          ...atuadores.ORDEM_DOS_ATUADORES.map((id) => [id, atuadores.MOTORES[id].nome]),
        ],
        valorAtual: junta.acionamento?.modelo || "",
        aoMudar: (novo) => {
          cenaMod.porMotor(junta, novo || null);
          atualizarTudo();
        },
      }),
    );
    if (junta.acionamento) {
      const modelo = atuadores.atuador(junta.acionamento.modelo);
      motor.append(dica(modelo.dica));
      motor.append(
        dica(
          modelo.tipo === "motor"
            ? `${modelo.rpm} rpm sem carga, ${modelo.torqueKgfcm} kgf·cm de torque. O slider manda a velocidade; o torque é o limite de força que ele tem para chegar nela.`
            : `${modelo.grausPorSegundo}°/s, ${modelo.torqueKgfcm} kgf·cm. O slider manda o ângulo, e 90° é a posição em que a peça foi montada.`,
        ),
      );
      motor.append(
        marca({
          rotulo: "Inverter o sentido",
          marcado: junta.acionamento.invertido,
          aoMudar: (ligado) => {
            junta.acionamento.invertido = ligado;
            atualizarTudo();
          },
        }),
      );
      if (junta.acionamento.tipo === "servo") {
        for (const [chave, rotulo] of [["limiteMin", "Curso: de"], ["limiteMax", "até"]]) {
          motor.append(
            campoArrastavel({
              rotulo,
              valorInicial: junta.acionamento[chave],
              passo: 5,
              min: 0,
              max: 180,
              inteiro: true,
              sufixo: "graus",
              aoAplicar: (novo) => {
                junta.acionamento[chave] = novo;
                junta.acionamento.angulo = Math.max(
                  junta.acionamento.limiteMin,
                  Math.min(junta.acionamento.limiteMax, junta.acionamento.angulo),
                );
                atualizarTudo();
              },
            }),
          );
        }
      }
      motor.append(dica("O slider para controlar fica embaixo da bancada, e funciona com a simulação rodando."));
    }
    painelLateral.append(motor);
  }

  const acoes = grupo("");
  const apagar = document.createElement("button");
  apagar.type = "button";
  apagar.className = "botao botao--perigo";
  apagar.innerHTML = `${iconeFerramenta("lixo")}<span>Apagar esta restrição</span>`;
  apagar.addEventListener("click", () => {
    cenaMod.removerJunta(cena, junta.id);
    juntaSelecionada = null;
    atualizarTudo();
  });
  acoes.append(apagar);
  painelLateral.append(acoes);
}

// =========================================================================
// Ponteiro: arrastar, selecionar, dar zoom
// =========================================================================

function ligarPonteiro() {
  const dedos = new Map();
  let arrastando = null;
  let panorama = null;
  let pincaInicial = null;

  const mundoDo = (evento) => {
    const caixa = tela.getBoundingClientRect();
    return desenho.paraOMundoDaTela(
      camera,
      [evento.clientX - caixa.left, evento.clientY - caixa.top],
      { largura: caixa.width, altura: caixa.height },
    );
  };

  const comecar = (evento) => {
    tela.setPointerCapture?.(evento.pointerId);
    dedos.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    fecharMenusFlutuantes();

    if (dedos.size === 2) {
      // Dois dedos: pinça. O que estava sendo arrastado é solto, senão a peça
      // vai junto com o zoom e sai voando.
      arrastando = null;
      if (estado) mundoMod.soltar(estado);
      const [a, b] = [...dedos.values()];
      pincaInicial = {
        distancia: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        zoom: camera.zoom,
        meio: [(a.x + b.x) / 2, (a.y + b.y) / 2],
        camera: { x: camera.x, y: camera.y },
      };
      panorama = null;
      return;
    }
    if (dedos.size > 2) return;

    const ponto = mundoDo(evento);
    ultimoMundo = ponto;

    if (juntaEmCurso) {
      tocarComAJunta(ponto);
      return;
    }
    if (ferramentaAtual === "mao" || evento.button === 1) {
      panorama = { de: [evento.clientX, evento.clientY], camera: { x: camera.x, y: camera.y } };
      return;
    }

    // Enquanto roda, o dedo empurra a peça de verdade, com uma mola curta.
    // Teletransportar a peça faria ela furar as outras.
    if (rodando && estado) {
      const id = mundoMod.pecaNoPonto(estado, ponto);
      if (id && mundoMod.agarrar(estado, id, ponto)) {
        selecao = new Set([id]);
        juntaSelecionada = null;
        atualizarPainel();
        return;
      }
      panorama = { de: [evento.clientX, evento.clientY], camera: { x: camera.x, y: camera.y } };
      return;
    }

    const peca = cenaMod.pecaNoPonto(cena, ponto);
    if (peca) {
      const juntando = evento.shiftKey || evento.ctrlKey || evento.metaKey;
      if (juntando) {
        if (selecao.has(peca.id)) selecao.delete(peca.id);
        else selecao.add(peca.id);
      } else if (!selecao.has(peca.id)) {
        selecao = new Set([peca.id]);
      }
      juntaSelecionada = null;
      arrastando = {
        de: ponto,
        inicio: [...selecao].map((id) => {
          const alvo = cenaMod.pecaPorId(cena, id);
          return { peca: alvo, x: alvo.x, y: alvo.y };
        }),
      };
      atualizarPainel();
      redesenhar();
      return;
    }

    // Toque no vazio: será que foi numa restrição?
    const junta = juntaNoPonto(ponto);
    if (junta) {
      juntaSelecionada = junta.id;
      selecao = new Set();
      atualizarPainel();
      redesenhar();
      return;
    }
    selecao = new Set();
    juntaSelecionada = null;
    panorama = { de: [evento.clientX, evento.clientY], camera: { x: camera.x, y: camera.y } };
    atualizarPainel();
    redesenhar();
  };

  const mover = (evento) => {
    if (dedos.has(evento.pointerId)) {
      dedos.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    }

    if (pincaInicial && dedos.size === 2) {
      const [a, b] = [...dedos.values()];
      const agora = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const caixa = tela.getBoundingClientRect();
      camera.x = pincaInicial.camera.x;
      camera.y = pincaInicial.camera.y;
      camera.zoom = pincaInicial.zoom;
      desenho.aproximar(
        camera,
        agora / pincaInicial.distancia,
        [pincaInicial.meio[0] - caixa.left, pincaInicial.meio[1] - caixa.top],
        { largura: caixa.width, altura: caixa.height },
      );
      redesenhar();
      return;
    }

    const ponto = mundoDo(evento);
    ultimoMundo = ponto;

    if (juntaEmCurso) {
      const peca = cenaMod.pecaNoPonto(cena, ponto);
      const alcance = 10 / camera.zoom;
      const mira = peca ? cenaMod.miraMaisPerto(peca, ponto, alcance) : null;
      emCurso = {
        primeiro: juntaEmCurso.primeiro,
        cursor: ponto,
        mirando: peca?.id || null,
        encaixe: mira && peca ? cenaMod.paraOMundo(peca, mira) : null,
      };
      redesenhar();
      return;
    }

    if (panorama) {
      camera.x = panorama.camera.x - (evento.clientX - panorama.de[0]) / camera.zoom;
      camera.y = panorama.camera.y + (evento.clientY - panorama.de[1]) / camera.zoom;
      redesenhar();
      return;
    }

    if (rodando && estado?.agarre) {
      mundoMod.arrastar(estado, ponto);
      return;
    }

    if (arrastando) {
      const dx = ponto[0] - arrastando.de[0];
      const dy = ponto[1] - arrastando.de[1];
      const passo = evento.shiftKey ? 0 : passoDoGrid();
      for (const item of arrastando.inicio) {
        item.peca.x = passo ? Math.round((item.x + dx) / passo) * passo : arredondar(item.x + dx);
        item.peca.y = passo ? Math.round((item.y + dy) / passo) * passo : arredondar(item.y + dy);
      }
      atualizarPainel();
      redesenhar();
    }
  };

  const terminar = (evento) => {
    dedos.delete(evento.pointerId);
    tela.releasePointerCapture?.(evento.pointerId);
    if (dedos.size < 2) pincaInicial = null;
    if (arrastando) {
      arrastando = null;
      atualizarTudo();
    }
    panorama = null;
    if (estado) mundoMod.soltar(estado);
  };

  tela.addEventListener("pointerdown", comecar);
  tela.addEventListener("pointermove", mover);
  tela.addEventListener("pointerup", terminar);
  tela.addEventListener("pointercancel", terminar);
  tela.addEventListener("pointerleave", (evento) => {
    if (!dedos.size && juntaEmCurso) {
      emCurso = { primeiro: juntaEmCurso.primeiro };
      redesenhar();
    }
    if (dedos.has(evento.pointerId)) terminar(evento);
  });

  const naRoda = (evento) => {
    evento.preventDefault();
    const caixa = tela.getBoundingClientRect();
    desenho.aproximar(
      camera,
      evento.deltaY < 0 ? 1.12 : 1 / 1.12,
      [evento.clientX - caixa.left, evento.clientY - caixa.top],
      { largura: caixa.width, altura: caixa.height },
    );
    redesenhar();
  };
  tela.addEventListener("wheel", naRoda, { passive: false });
  desligar.push(() => tela.removeEventListener("wheel", naRoda));
}

// Enquanto a montagem está parada, arrastar peça cai no passo escolhido nos
// ajustes. Medida redonda é mais fácil de conferir do que 43,7 mm — e quem
// quiser o milímetro exato segura Shift, que solta o passo.
function passoDoGrid() {
  const passo = Number(ajuste("snap"));
  return Number.isFinite(passo) && passo > 0 ? passo : 0;
}

function juntaNoPonto(ponto) {
  const alcance = 12 / camera.zoom;
  for (let i = cena.juntas.length - 1; i >= 0; i -= 1) {
    const junta = cena.juntas[i];
    const pecaA = cenaMod.pecaPorId(cena, junta.a);
    if (!pecaA) continue;
    const alvos = [cenaMod.paraOMundo(pecaA, junta.pa)];
    if (junta.b) {
      const pecaB = cenaMod.pecaPorId(cena, junta.b);
      if (pecaB) alvos.push(cenaMod.paraOMundo(pecaB, junta.pb));
    } else {
      alvos.push(junta.pb);
    }
    for (const alvo of alvos) {
      if (Math.hypot(alvo[0] - ponto[0], alvo[1] - ponto[1]) <= alcance) return junta;
    }
  }
  return null;
}

function ligarTeclado() {
  const naTecla = (evento) => {
    if (!raiz || !document.contains(raiz)) return;
    const alvo = evento.target;
    if (alvo instanceof HTMLInputElement || alvo instanceof HTMLSelectElement || alvo instanceof HTMLTextAreaElement) {
      return;
    }
    if (evento.key === "Escape") {
      if (juntaEmCurso) {
        juntaEmCurso = null;
        emCurso = null;
        escolherFerramenta("selecionar");
        mostrarAviso("Restrição cancelada.");
      }
      return;
    }
    if (evento.key === "Delete" || evento.key === "Backspace") {
      if (selecao.size || juntaSelecionada) {
        evento.preventDefault();
        apagarEscolhido();
      }
      return;
    }
    if (evento.key === "v" || evento.key === "V") escolherFerramenta("selecionar");
    if (evento.key === "h" || evento.key === "H") escolherFerramenta("mao");
    if (evento.key === "f" || evento.key === "F") {
      enquadrar();
      redesenhar();
    }
  };
  window.addEventListener("keydown", naTecla);
  desligar.push(() => window.removeEventListener("keydown", naTecla));
}

function ligarRedimensionamento() {
  const refazer = () => redesenhar();
  window.addEventListener("resize", refazer);
  desligar.push(() => window.removeEventListener("resize", refazer));
  if (window.ResizeObserver) {
    const observador = new ResizeObserver(refazer);
    observador.observe(raiz.querySelector(".livre__palco"));
    desligar.push(() => observador.disconnect());
  }
}

function alternarTelaCheia() {
  const alvo = raiz.querySelector(".livre__palco");
  if (document.fullscreenElement) document.exitFullscreen?.();
  else alvo.requestFullscreen?.();
}

// =========================================================================
// Exemplos, arquivo e bolsa
// =========================================================================

function abrirExemplos() {
  const corpo = document.createElement("div");
  corpo.className = "fisica__lista-exemplos";
  for (const ficha of exemplos.listaDeExemplos()) {
    const item = document.createElement("article");
    item.className = "fisica__ficha";
    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = "botao botao--destaque";
    alvo.innerHTML = `${iconeFerramenta("iniciar")}<span>${ficha.nome}</span>`;
    alvo.addEventListener("click", () => {
      fecharPainel();
      abrirExemplo(ficha.id);
    });
    const ideia = document.createElement("p");
    ideia.className = "fisica__ideia";
    ideia.textContent = ficha.ideia;
    const teste = document.createElement("p");
    teste.className = "dica";
    teste.textContent = `Para testar: ${ficha.experimento}`;
    item.append(alvo, ideia, teste);
    corpo.append(item);
  }
  abrirPainel({
    titulo: "Montagens prontas",
    corpo,
    botoes: [{ rotulo: t("acoes.fechar"), aoClicar: () => fecharPainel() }],
  });
}

async function abrirExemplo(id) {
  if (cena.pecas.length) {
    const vai = await confirmar("Abrir a montagem pronta troca o que está na bancada agora. Pode?");
    if (!vai) return;
  }
  pararSimulacao({ silencioso: true });
  const montado = exemplos.montarExemplo(id);
  if (!montado) return;
  cena = montado.cena;
  selecao = new Set();
  juntaSelecionada = null;
  enquadrar();
  atualizarTudo();
  mostrarAviso(`${montado.exemplo.nome}: ${montado.exemplo.ideia}`);
  // O que testar nela fica numa janela, porque é texto comprido e é a parte
  // que faz a montagem virar aula em vez de bichinho se mexendo na tela.
  const corpo = document.createElement("div");
  const ideia = document.createElement("p");
  ideia.textContent = montado.exemplo.ideia;
  const teste = document.createElement("p");
  teste.className = "dica";
  teste.textContent = montado.exemplo.experimento;
  corpo.append(ideia, teste);
  abrirPainel({
    titulo: montado.exemplo.nome,
    corpo,
    botoes: [
      {
        rotulo: "Iniciar simulação",
        variante: "destaque",
        icone: "iniciar",
        aoClicar: () => {
          fecharPainel();
          iniciarSimulacao();
        },
      },
      { rotulo: "Fechar", aoClicar: () => fecharPainel() },
    ],
  });
}

async function baixarCena() {
  if (!cena.pecas.length) {
    mostrarAviso("A bancada está vazia.", "alerta");
    return;
  }
  const nome = await perguntarTexto("Baixar a cena", "Nome do arquivo", cena.nome);
  if (!nome) return;
  cena.nome = nome;
  const limpo = nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "cena";
  baixarJSON(`${limpo}_${carimboDeData()}.json`, cenaMod.empacotar(cena));
  tocar("salvar");
  mostrarAviso("Cena baixada.");
  atualizarTudo();
}

async function importarCena() {
  const arquivo = await escolherArquivo(".json,application/json");
  if (!arquivo) return;
  if (cena.pecas.length) {
    const vai = await confirmar("Importar troca o que está na bancada agora. Pode?");
    if (!vai) return;
  }
  try {
    const conteudo = await lerJSON(arquivo);
    pararSimulacao({ silencioso: true });
    cena = cenaMod.desempacotar(conteudo);
    selecao = new Set();
    juntaSelecionada = null;
    enquadrar();
    atualizarTudo();
    tocar("pronto");
    mostrarAviso(`"${cena.nome}" importada: ${cena.pecas.length} peça(s) e ${cena.juntas.length} restrição(ões).`);
  } catch (erro) {
    console.error(erro);
    mostrarAviso(erro.message || "Não consegui ler este arquivo.", "erro");
  }
}

// A bolsa entrega peça 2D: o contorno dela vira um corpo na bancada. É o
// caminho de "desenhei no Criação Livre" para "testei a mecânica".
async function receberDaBolsa(item) {
  if (rodando) {
    mostrarAviso("Pare a simulação para trazer peça da bolsa.", "alerta");
    return false;
  }
  const svg = item?.dados?.svg;
  if (!svg) {
    mostrarAviso("Esta peça da bolsa não tem desenho 2D. Guarde uma peça 2D no Criação Livre.", "alerta");
    return false;
  }
  try {
    // O leitor de SVG é o mesmo do setor de corte: um parser só para todo o
    // aplicativo. Ele entra sob demanda para não pesar a abertura daqui.
    const desvg = await import("../corte/desvg.js");
    const { contornos, motivo } = desvg.contornosDoSVG(svg);
    if (!contornos.length) {
      mostrarAviso("Não achei contorno fechado neste desenho.", "alerta");
      return false;
    }
    const pecas = desvg.separarEmPecas(contornos);
    const onde = meioDaVista();
    let postas = 0;
    let complicadas = 0;
    for (const bruta of pecas) {
      const limites = formas.limitesDoContorno(bruta.contorno);
      if (limites.largura < 2 || limites.altura < 2) continue;
      const meioX = (limites.minX + limites.maxX) / 2;
      const meioY = (limites.minY + limites.maxY) / 2;
      const pontos = formas.simplificarContorno(
        formas.sentidoAntiHorario(bruta.contorno.map(([x, y]) => [x - meioX, y - meioY])),
        0.4,
      );
      const peca = cenaMod.novaPeca({
        nome: `${item.nome}${pecas.length > 1 ? ` ${postas + 1}` : ""}`.slice(0, 40),
        forma: { tipo: "contorno", pontos },
        colisao: "exata",
        x: Math.round(onde[0] + postas * 20),
        y: Math.round(onde[1] + postas * 20),
      });
      const partes = formas.esbocoDaColisao(peca.forma, { exata: true, decomp });
      if (formas.complicadoDemais(partes)) {
        // Contorno complicado demais vira colisão simplificada, com aviso: é
        // melhor uma peça que roda do que uma peça fiel que trava a aula.
        peca.colisao = "simples";
        complicadas += 1;
      }
      cenaMod.adicionarPeca(cena, peca);
      postas += 1;
    }
    if (!postas) {
      mostrarAviso("O desenho é pequeno demais para virar peça.", "alerta");
      return false;
    }
    selecao = new Set();
    avisarSeLotou();
    enquadrar();
    atualizarTudo();
    tocar("pronto");
    let recado = `${postas} peça(s) da bolsa na bancada.`;
    if (complicadas) recado += ` ${complicadas} ficou com colisão simplificada por ser complicada demais.`;
    if (motivo) recado += ` (${motivo})`;
    mostrarAviso(recado);
    return true;
  } catch (erro) {
    console.error(erro);
    mostrarAviso("Não consegui ler o desenho desta peça.", "erro");
    return false;
  }
}

async function limparBancada() {
  if (!cena.pecas.length) return;
  const vai = await confirmar("Limpar a bancada apaga todas as peças e restrições. Pode?");
  if (!vai) return;
  pararSimulacao({ silencioso: true });
  cena = cenaMod.novaCena({ nome: "Montagem nova", vista: cena.vista, gravidade: cena.gravidade });
  cenaMod.reiniciarContagem(0);
  selecao = new Set();
  juntaSelecionada = null;
  camera = desenho.novaCamera();
  atualizarTudo();
  mostrarAviso("Bancada limpa.");
}

// =========================================================================
// Cache do navegador
// =========================================================================

function guardarNoCache() {
  if (rodando) return; // nunca guardar a cena no meio do movimento
  if (!ajuste("salvarSozinho")) return;
  try {
    localStorage.setItem(CHAVE_DO_CACHE, JSON.stringify(cenaMod.empacotar(cena)));
  } catch {
    // sem espaço: a montagem continua na tela, só não é recuperável
  }
}

function lerDoCache() {
  try {
    const bruto = localStorage.getItem(CHAVE_DO_CACHE);
    if (!bruto) return null;
    const conteudo = JSON.parse(bruto);
    const recuperada = cenaMod.desempacotar(conteudo);
    return recuperada.pecas.length ? recuperada : null;
  } catch {
    return null;
  }
}

export function encerrar() {
  pararSimulacao({ silencioso: true });
  fecharMenusFlutuantes();
  for (const parar of desligar.splice(0)) {
    try {
      parar();
    } catch (erro) {
      console.warn("Falha ao desligar a bancada de simulação", erro);
    }
  }
  if (areaAtual) areaAtual.classList.remove("conteudo--cheio");
  areaAtual = null;
  raiz = null;
  tela = null;
  painelLateral = null;
  painelDeControle = null;
  barraStatus = null;
}
