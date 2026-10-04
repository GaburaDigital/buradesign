// A janela de gravação.
//
// Mostra a peça escolhida vista de cima, do jeito que ela vai sair da
// cortadora — com os dentes, as abas e os rasgos. É de propósito: o aluno
// precisa ver que o nome dele não pode ficar em cima de um dente, senão o
// encaixe vai embora junto com a letra.
//
// A marcação se arrasta em cima do desenho, e todo número dela também está no
// painel ao lado, para quem quer posicionar por medida.

import { carregarScript } from "../../core/carregar-script.js";
import { escolherArquivo, lerTexto } from "../../core/arquivos.js";
import { tocar } from "../../core/som.js";
import { t } from "../../core/idioma.js";
import * as bolsa from "../../core/bolsa.js";
import { abrirPainel, fecharPainel, mostrarAviso, perguntarTexto } from "../../ui/painel.js";
import { campoArrastavel } from "../../ui/campo-numero.js";
import * as marcas from "./marcas.js";
import { contornosDoSVG } from "./desvg.js";

const FONTES = [
  { id: "poppins", nome: "Redonda", normal: "poppins-regular.ttf", negrito: "poppins-bold.ttf" },
  { id: "caladea", nome: "Com serifa", normal: "caladea-regular.ttf", negrito: "caladea-bold.ttf" },
  { id: "mono", nome: "Terminal", normal: "mono-regular.ttf", negrito: "mono-bold.ttf" },
];

const fontesAbertas = new Map();

async function abrirFonte(id, negrito) {
  const ficha = FONTES.find((f) => f.id === id) || FONTES[0];
  const arquivo = `assets/fontes/${negrito ? ficha.negrito : ficha.normal}`;
  if (fontesAbertas.has(arquivo)) return fontesAbertas.get(arquivo);
  await carregarScript("libs/opentype/opentype.min.js", "opentype");
  const promessa = new Promise((resolver, rejeitar) => {
    window.opentype.load(arquivo, (erro, fonte) => (erro ? rejeitar(erro) : resolver(fonte)));
  });
  fontesAbertas.set(arquivo, promessa);
  return promessa;
}

// O texto vira contorno pela própria fonte, o que garante os acentos do
// português e um caminho pronto para a máquina.
export async function contornosDoTexto({ texto, fonte = "poppins", negrito = false, tamanho = 12 }) {
  const arquivo = await abrirFonte(fonte, negrito);
  const caminho = arquivo.getPath(texto || " ", 0, 0, tamanho);
  const bruto = marcas.contornosDoCaminho(caminho.commands);
  return marcas.centrarNaOrigem(marcas.virarParaCima(bruto));
}

// --- Desenho da prévia ---------------------------------------------------

const CORTE = "#101010";
const GRAVACAO = "#e03131";
const ESCOLHIDA = "#2f7fe0";

function caminho(pontos, fechar = true) {
  if (!pontos.length) return "";
  return `${pontos.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")}${fechar ? " Z" : ""}`;
}

function desenharPeca(peca, listaDeMarcas, escolhida) {
  const m = peca.limites;
  const folga = Math.max(4, Math.max(m.largura, m.altura) * 0.04);
  const partes = [caminho(peca.contorno)];
  for (const furo of peca.furos || []) partes.push(caminho(furo));

  const gravadas = [];
  for (const marca of listaDeMarcas) {
    const cor = marca.id === escolhida ? ESCOLHIDA : GRAVACAO;
    for (const traco of marcas.tracosDaMarca(marca)) {
      gravadas.push(
        `<path d="${caminho(traco, traco.length > 2)}" fill="none" stroke="${cor}" stroke-width="0.35" vector-effect="non-scaling-stroke"/>`,
      );
    }
  }

  // O y da chapa cresce para cima e o do SVG para baixo; o grupo virado
  // resolve isso de uma vez, em vez de virar cada ponto na mão.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(m.minU - folga).toFixed(2)} ${(-m.maxV - folga).toFixed(2)} ${(m.largura + folga * 2).toFixed(2)} ${(m.altura + folga * 2).toFixed(2)}" role="img" aria-label="Peça vista de cima">
  <g transform="scale(1,-1)">
    <path d="${partes.join(" ")}" fill="#ffffff" fill-rule="evenodd" stroke="${CORTE}" stroke-width="0.4" vector-effect="non-scaling-stroke"/>
    ${gravadas.join("\n    ")}
  </g>
</svg>`;
}

// --- A janela ------------------------------------------------------------

// `pecas` é a lista das peças planificadas das chapas escolhidas, na ordem.
// `aoGravar(idDaChapa, marcas)` é chamado quando o aluno confirma.
export function abrirGravacao({ pecas, aoGravar, aoFim }) {
  if (!pecas.length) {
    mostrarAviso("Escolha uma peça para gravar.", "alerta");
    return;
  }

  let indice = 0;
  let marcasDaPeca = [];
  let escolhida = null;
  let ultimasCopiadas = null;
  // Abrir outro painel fecha este, e o "aoFechar" dispara junto. Estas duas
  // travas dizem se o fechamento foi de verdade ou só uma troca de tela.
  let trocandoDeJanela = false;
  let descartado = false;

  const corpo = document.createElement("div");
  corpo.className = "gravar";
  const previa = document.createElement("div");
  previa.className = "gravar__previa";
  const lado = document.createElement("div");
  previa.className = "gravar__previa";
  lado.className = "gravar__lado";
  corpo.append(previa, lado);

  const pecaAtual = () => pecas[indice];

  function redesenhar() {
    previa.innerHTML = desenharPeca(pecaAtual(), marcasDaPeca, escolhida);
    montarLado();
  }

  // --- arrastar a marcação em cima do desenho ---------------------------
  previa.addEventListener("pointerdown", (evento) => {
    const svg = previa.querySelector("svg");
    if (!svg || !escolhida) return;
    const marca = marcasDaPeca.find((item) => item.id === escolhida);
    if (!marca) return;
    const caixa = svg.getBoundingClientRect();
    const vista = svg.getAttribute("viewBox").split(/\s+/).map(Number);
    const paraMm = (clienteX, clienteY) => ({
      x: vista[0] + ((clienteX - caixa.left) / caixa.width) * vista[2],
      y: -(vista[1] + ((clienteY - caixa.top) / caixa.height) * vista[3]),
    });
    const inicio = paraMm(evento.clientX, evento.clientY);
    const partida = { x: marca.x, y: marca.y };
    svg.setPointerCapture?.(evento.pointerId);
    const mover = (mexeu) => {
      const agora = paraMm(mexeu.clientX, mexeu.clientY);
      marca.x = Math.round((partida.x + agora.x - inicio.x) * 10) / 10;
      marca.y = Math.round((partida.y + agora.y - inicio.y) * 10) / 10;
      previa.innerHTML = desenharPeca(pecaAtual(), marcasDaPeca, escolhida);
    };
    const soltar = () => {
      previa.removeEventListener("pointermove", mover);
      previa.removeEventListener("pointerup", soltar);
      redesenhar();
    };
    previa.addEventListener("pointermove", mover);
    previa.addEventListener("pointerup", soltar);
  });

  // --- coluna de controles ----------------------------------------------
  function campo(rotulo, valor, aoAplicar, opcoes = {}) {
    return campoArrastavel({ rotulo, valorInicial: valor, aoAplicar, ...opcoes });
  }

  function botao(rotulo, aoClicar, extra = "") {
    const alvo = document.createElement("button");
    alvo.type = "button";
    alvo.className = `botao ${extra}`.trim();
    alvo.textContent = rotulo;
    alvo.addEventListener("click", aoClicar);
    return alvo;
  }

  // Atenção: abrir outro painel fecha este. Toda saída daqui — tenha dado
  // certo ou não — precisa reabrir a janela, senão o aluno responde a
  // pergunta e a gravação some da tela.
  async function inserirTexto() {
    trocandoDeJanela = true;
    const texto = await perguntarTexto("Inserir texto", "O que gravar na peça:", "GABURA");
    if (texto === null || !texto.trim()) {
      abrirJanela();
      return;
    }
    try {
      const base = await contornosDoTexto({ texto, tamanho: 12 });
      const marca = marcas.novaMarca({
        tipo: "texto",
        texto,
        fonte: "poppins",
        negrito: false,
        tamanho: 12,
        base,
        x: pecaAtual().limites.largura / 2,
        y: pecaAtual().limites.altura / 2,
      });
      marcasDaPeca.push(marca);
      escolhida = marca.id;
      tocar("clique");
    } catch (erro) {
      tocar("erro");
      mostrarAviso(erro.message || "Não consegui abrir a fonte.", "erro");
    }
    abrirJanela();
  }

  async function inserirCaminho() {
    trocandoDeJanela = true;
    const itens = (await bolsa.listar()).filter((item) => item?.dados?.svg);
    if (!itens.length) {
      mostrarAviso("Não há desenho 2D na bolsa. Guarde um lá no Design 2D primeiro.", "alerta");
      abrirJanela();
      return;
    }
    const escolha = document.createElement("div");
    escolha.className = "corte__formulario";
    for (const item of itens) {
      escolha.append(
        botao(item.nome, () => {
          fecharPainel({ silencioso: true });
          usarDesenho(item);
        }),
      );
    }
    abrirPainel({ titulo: "Trazer desenho da bolsa", corpo: escolha, botoes: [
      { rotulo: t("acoes.cancelar"), aoClicar: () => { fecharPainel({ silencioso: true }); abrirJanela(); } },
    ] });
  }

  function usarDesenho(item) {
    try {
      const { contornos } = contornosDoSVG(item.dados.svg);
      if (!contornos.length) throw new Error("Esse desenho veio vazio.");
      const marca = marcas.novaMarca({
        tipo: "caminho",
        nome: item.nome,
        base: marcas.centrarNaOrigem(contornos),
        x: pecaAtual().limites.largura / 2,
        y: pecaAtual().limites.altura / 2,
      });
      marcasDaPeca.push(marca);
      escolhida = marca.id;
      tocar("clique");
    } catch (erro) {
      tocar("erro");
      mostrarAviso(erro.message || "Não consegui ler esse desenho.", "erro");
    }
    abrirJanela();
  }

  function montarLado() {
    lado.innerHTML = "";
    const titulo = document.createElement("p");
    titulo.className = "dica";
    titulo.textContent = `Peça ${indice + 1} de ${pecas.length}: ${pecaAtual().nome} · ${Math.round(pecaAtual().limites.largura)} × ${Math.round(pecaAtual().limites.altura)} mm`;
    lado.append(titulo);

    const linha = document.createElement("div");
    linha.className = "linha-botoes";
    linha.append(
      botao("Inserir texto", inserirTexto),
      botao("Inserir caminho 2D", inserirCaminho),
    );
    lado.append(linha);

    if (!marcasDaPeca.length) {
      const vazio = document.createElement("p");
      vazio.className = "dica";
      vazio.textContent = "Nenhuma gravação nesta peça ainda.";
      lado.append(vazio);
    }

    // Lista das marcações, para escolher qual está sendo mexida.
    if (marcasDaPeca.length > 1) {
      const lista = document.createElement("div");
      lista.className = "linha-botoes";
      for (const marca of marcasDaPeca) {
        lista.append(
          botao(
            marca.tipo === "texto" ? `"${marca.texto}"` : marca.nome,
            () => {
              escolhida = marca.id;
              redesenhar();
            },
            marca.id === escolhida ? "botao--destaque botao--curto" : "botao--curto",
          ),
        );
      }
      lado.append(lista);
    }

    const marca = marcasDaPeca.find((item) => item.id === escolhida);
    if (marca) {
      if (marca.tipo === "texto") {
        lado.append(
          campo("Tamanho da letra (mm)", marca.tamanho, async (n) => {
            marca.tamanho = n;
            marca.base = await contornosDoTexto(marca);
            redesenhar();
          }, { min: 3, max: 200, passo: 1 }),
        );
        const fontes = document.createElement("div");
        fontes.className = "linha-botoes";
        for (const ficha of FONTES) {
          fontes.append(
            botao(
              ficha.nome,
              async () => {
                marca.fonte = ficha.id;
                marca.base = await contornosDoTexto(marca);
                redesenhar();
              },
              marca.fonte === ficha.id ? "botao--destaque botao--curto" : "botao--curto",
            ),
          );
        }
        lado.append(fontes);
      } else {
        lado.append(
          campo("Tamanho (%)", Math.round(marca.escala * 100), (n) => {
            marca.escala = Math.max(5, n) / 100;
            redesenhar();
          }, { min: 5, max: 400, passo: 5 }),
        );
      }

      lado.append(
        campo("Posição X (mm)", marca.x, (n) => {
          marca.x = n;
          redesenhar();
        }, { min: -500, max: 2000, passo: 1 }),
        campo("Posição Y (mm)", marca.y, (n) => {
          marca.y = n;
          redesenhar();
        }, { min: -500, max: 2000, passo: 1 }),
        campo("Giro (graus)", marca.giro, (n) => {
          marca.giro = n;
          redesenhar();
        }, { min: -180, max: 180, passo: 5 }),
      );

      const opcoes = document.createElement("div");
      opcoes.className = "linha-botoes";
      opcoes.append(
        botao(
          "Espelhar",
          () => {
            marca.espelhado = !marca.espelhado;
            redesenhar();
          },
          marca.espelhado ? "botao--destaque botao--curto" : "botao--curto",
        ),
        botao(
          marca.preenchido ? "Preenchido" : "Só contorno",
          () => {
            marca.preenchido = !marca.preenchido;
            redesenhar();
          },
          marca.preenchido ? "botao--destaque botao--curto" : "botao--curto",
        ),
        botao(
          "Tirar",
          () => {
            marcasDaPeca = marcasDaPeca.filter((item) => item.id !== marca.id);
            escolhida = marcasDaPeca.length ? marcasDaPeca[marcasDaPeca.length - 1].id : null;
            redesenhar();
          },
          "botao--perigo botao--curto",
        ),
      );
      lado.append(opcoes);

      if (marca.preenchido) {
        lado.append(
          campo("Espaço entre riscos (mm)", marca.passoDoRisco, (n) => {
            marca.passoDoRisco = Math.max(0.2, n);
            redesenhar();
          }, { min: 0.2, max: 5, passo: 0.1 }),
        );
      }

      if (marcas.marcaEscapa(marca, pecaAtual().contorno)) {
        const alerta = document.createElement("p");
        alerta.className = "dica dica--alerta";
        alerta.textContent =
          "Esta gravação passa da borda da peça. O que sair fora não vai ser gravado.";
        lado.append(alerta);
      }
    }

    if (ultimasCopiadas && ultimasCopiadas.length) {
      lado.append(
        botao("Copiar a gravação da peça anterior", () => {
          marcasDaPeca = ultimasCopiadas.map((item) => marcas.novaMarca({ ...item }));
          escolhida = marcasDaPeca.length ? marcasDaPeca[0].id : null;
          redesenhar();
        }, "botao--curto"),
      );
    }
  }

  function guardar() {
    aoGravar(pecaAtual().id, marcasDaPeca);
    ultimasCopiadas = marcasDaPeca.map((item) => ({ ...item }));
  }

  function abrirJanela() {
    trocandoDeJanela = false;
    redesenhar();
    const botoes = [
      {
        rotulo: "Gravar",
        variante: "destaque",
        aoClicar: () => {
          guardar();
          tocar("salvar");
          trocandoDeJanela = true;
          fecharPainel({ silencioso: true });
          aoFim?.();
        },
      },
    ];
    if (indice < pecas.length - 1) {
      botoes.push({
        rotulo: "Próxima peça",
        aoClicar: () => {
          guardar();
          indice += 1;
          marcasDaPeca = [];
          escolhida = null;
          trocandoDeJanela = true;
          fecharPainel({ silencioso: true });
          abrirJanela();
        },
      });
    }
    botoes.push({
      rotulo: "Descartar",
      variante: "perigo",
      aoClicar: () => {
        descartado = true;
        marcasDaPeca = [];
        aoGravar(pecaAtual().id, []);
        fecharPainel({ silencioso: true });
        aoFim?.();
      },
    });

    // Fechar no X guarda, em vez de jogar fora. Esta janela é um editor, não
    // uma pergunta: quem posicionou o texto e fechou quer o texto gravado.
    // Antes o X descartava tudo em silêncio, e a gravação parecia sumir.
    abrirPainel({
      titulo: "Gravação",
      corpo,
      botoes,
      aoFechar: () => {
        if (descartado || trocandoDeJanela) return;
        guardar();
        aoFim?.();
      },
    });
  }

  abrirJanela();
}

// Importar um SVG como peça de corte.
export async function importarSVG() {
  const arquivo = await escolherArquivo(".svg");
  if (!arquivo) return null;
  const texto = await lerTexto(arquivo);
  const { contornos, medida, motivo } = contornosDoSVG(texto);
  if (!contornos.length) {
    mostrarAviso("Não achei desenho nenhum nesse arquivo.", "erro");
    return null;
  }
  return { contornos, medida, motivo, nome: arquivo.name.replace(/\.svg$/i, "") };
}
