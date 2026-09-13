// Painel lateral. Muda conforme a seleção: sem nada selecionado mostra a
// mesa, com uma peça mostra os parâmetros e o ajuste fino, com várias mostra
// alinhamento e combinação.

import { cena, deMm, paraMm, unidade, definirSelecao } from "./estado.js";
import { DEFINICOES, regerar, converterEmCaminho } from "./formas.js";
import * as texto from "./texto.js";
import * as combinar from "./combinar.js";
import * as organizar from "./organizar.js";
import * as selecao from "./selecao.js";
import * as remodelar from "./remodelar.js";
import { redefinirMesa } from "./mesa.js";
import { registrar } from "./historico.js";
import { ferramenta } from "../../ui/icones-ferramentas.js";
import { fala } from "../../ui/aliens.js";
import { mostrarAviso } from "../../ui/painel.js";
import { tocar } from "../../core/som.js";

let area = null;

export function ligarPainel(elemento) {
  area = elemento;
}

function campoNumero(rotulo, valorAtual, aoAplicar, opcoes = {}) {
  const caixa = document.createElement("label");
  caixa.className = "propriedade";
  const nome = document.createElement("span");
  nome.textContent = opcoes.semUnidade ? rotulo : `${rotulo} (${unidade()})`;
  const campo = document.createElement("input");
  campo.type = "number";
  campo.value = String(Number(valorAtual.toFixed(opcoes.inteiro ? 0 : 2)));
  campo.step = opcoes.inteiro ? "1" : unidade() === "cm" ? "0.1" : "1";
  if (opcoes.min !== undefined) campo.min = String(opcoes.min);
  if (opcoes.max !== undefined) campo.max = String(opcoes.max);
  const aplicar = () => {
    const numero = Number(campo.value);
    if (!Number.isFinite(numero)) return;
    aoAplicar(numero);
  };
  campo.addEventListener("change", aplicar);
  campo.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      aplicar();
    }
  });
  caixa.append(nome, campo);
  return caixa;
}

function campoOpcoes(rotulo, valorAtual, opcoes, aoMudar) {
  const caixa = document.createElement("label");
  caixa.className = "propriedade";
  const nome = document.createElement("span");
  nome.textContent = rotulo;
  const escolha = document.createElement("select");
  for (const opcao of opcoes) {
    const item = document.createElement("option");
    item.value = String(opcao.valor);
    item.textContent = opcao.rotulo;
    if (String(opcao.valor) === String(valorAtual)) item.selected = true;
    escolha.append(item);
  }
  escolha.addEventListener("change", () => aoMudar(escolha.value));
  caixa.append(nome, escolha);
  return caixa;
}

function botao(icone, rotulo, aoClicar, extra = "") {
  const alvo = document.createElement("button");
  alvo.type = "button";
  alvo.className = `botao ${extra}`;
  alvo.title = rotulo;
  alvo.setAttribute("aria-label", rotulo);
  alvo.innerHTML = `${ferramenta(icone)}<span class="rotulo-acao">${rotulo}</span>`;
  alvo.addEventListener("click", () => {
    tocar("clique");
    aoClicar();
  });
  return alvo;
}

function grupo(titulo) {
  const secao = document.createElement("section");
  secao.className = "grupo-propriedades";
  if (titulo) {
    const cabecalho = document.createElement("h3");
    cabecalho.textContent = titulo;
    secao.append(cabecalho);
  }
  return secao;
}

function linhaBotoes(...botoes) {
  const linha = document.createElement("div");
  linha.className = "linha-botoes";
  linha.append(...botoes);
  return linha;
}

// --- Blocos ------------------------------------------------------------

function blocoMesa() {
  const secao = grupo("Mesa de corte");
  const { largura, altura, grid } = cena.mesa;
  secao.append(
    campoNumero("Largura", deMm(largura), (numero) =>
      redefinirMesa({ ...cena.mesa, largura: paraMm(numero) }),
    ),
    campoNumero("Altura", deMm(altura), (numero) =>
      redefinirMesa({ ...cena.mesa, altura: paraMm(numero) }),
    ),
    campoNumero("Grid", deMm(grid), (numero) =>
      redefinirMesa({ ...cena.mesa, grid: paraMm(numero) }),
    ),
  );
  return secao;
}

function blocoParametros(item) {
  const definicao = DEFINICOES[item.data.tipo];
  if (!definicao) return null;
  const secao = grupo(definicao.nome);
  for (const [chave, campo] of Object.entries(definicao.params)) {
    const atual = item.data.params[chave];
    if (campo.opcoes) {
      secao.append(
        campoOpcoes(campo.rotulo, atual, campo.opcoes, (novo) => {
          const novoItem = regerar(item, { [chave]: novo });
          definirSelecao([novoItem]);
          registrar();
          desenhar();
        }),
      );
      continue;
    }
    const emUnidade = campo.semUnidade ? atual : deMm(atual);
    secao.append(
      campoNumero(
        campo.rotulo,
        emUnidade,
        (numero) => {
          const valorMm = campo.semUnidade ? numero : paraMm(numero);
          const limitado = Math.max(campo.min, Math.min(campo.max, valorMm));
          const novoItem = regerar(item, {
            [chave]: campo.inteiro ? Math.round(limitado) : limitado,
          });
          definirSelecao([novoItem]);
          registrar();
          desenhar();
        },
        { semUnidade: campo.semUnidade, inteiro: campo.inteiro, min: campo.min, max: campo.max },
      ),
    );
  }
  return secao;
}

function blocoTexto(item) {
  const secao = grupo("Texto");
  const params = item.data.params;

  const campo = document.createElement("label");
  campo.className = "propriedade";
  const nome = document.createElement("span");
  nome.textContent = "Conteúdo";
  const entrada = document.createElement("input");
  entrada.type = "text";
  entrada.value = params.texto;
  entrada.addEventListener("change", async () => {
    const novo = await texto.regerar(item, { texto: entrada.value });
    definirSelecao([novo]);
    registrar();
    desenhar();
  });
  campo.append(nome, entrada);
  secao.append(campo);

  secao.append(
    campoOpcoes(
      "Fonte",
      params.familia,
      texto.familias().map((familia) => ({ valor: familia.id, rotulo: familia.nome })),
      async (novo) => {
        const item2 = await texto.regerar(item, { familia: novo });
        definirSelecao([item2]);
        registrar();
        desenhar();
      },
    ),
    campoNumero(
      "Tamanho",
      deMm(params.tamanho),
      async (numero) => {
        const item2 = await texto.regerar(item, { tamanho: Math.max(2, paraMm(numero)) });
        definirSelecao([item2]);
        registrar();
        desenhar();
      },
    ),
  );

  const estilos = linhaBotoes(
    botao("texto", params.negrito ? "Tirar negrito" : "Negrito", async () => {
      const item2 = await texto.regerar(item, { negrito: !params.negrito });
      definirSelecao([item2]);
      registrar();
      desenhar();
    }),
    botao("texto", params.italico ? "Tirar itálico" : "Itálico", async () => {
      const item2 = await texto.regerar(item, { italico: !params.italico });
      definirSelecao([item2]);
      registrar();
      desenhar();
    }),
  );
  secao.append(estilos);
  return secao;
}

function blocoAjusteFino(item) {
  const secao = grupo("Ajuste fino");
  const caixa = item.bounds;
  secao.append(
    campoNumero("Centro X", deMm(item.position.x), (numero) => {
      item.position = new cena.paper.Point(paraMm(numero), item.position.y);
      selecao.atualizarGuias();
      registrar();
    }),
    campoNumero("Centro Y", deMm(item.position.y), (numero) => {
      item.position = new cena.paper.Point(item.position.x, paraMm(numero));
      selecao.atualizarGuias();
      registrar();
    }),
    campoNumero("Largura", deMm(caixa.width), (numero) => {
      const alvo = Math.max(0.5, paraMm(numero));
      item.scale(alvo / item.bounds.width, 1, item.bounds.center);
      selecao.atualizarGuias();
      registrar();
      desenhar();
    }),
    campoNumero("Altura", deMm(caixa.height), (numero) => {
      const alvo = Math.max(0.5, paraMm(numero));
      item.scale(1, alvo / item.bounds.height, item.bounds.center);
      selecao.atualizarGuias();
      registrar();
      desenhar();
    }),
    campoNumero(
      "Giro",
      item.data.rotacao || 0,
      (numero) => {
        const delta = numero - (item.data.rotacao || 0);
        item.rotate(delta, item.bounds.center);
        item.data.rotacao = numero % 360;
        selecao.atualizarGuias();
        registrar();
        desenhar();
      },
      { semUnidade: true },
    ),
  );
  const nota = document.createElement("p");
  nota.className = "dica";
  nota.textContent = "Giro em graus. Enter aplica o número.";
  secao.append(nota);
  return secao;
}

function blocoAparencia(item) {
  const secao = grupo("Aparência");
  const paleta = document.createElement("div");
  paleta.className = "paleta";
  for (const cor of ["#8fb8de", "#a9d6a0", "#f2d06b", "#e8a598", "#c5a6e0", "#9fd8d2", "#d9d9d9"]) {
    const tinta = document.createElement("button");
    tinta.type = "button";
    tinta.className = "tinta";
    tinta.style.background = cor;
    tinta.title = "Cor de preenchimento";
    tinta.setAttribute("aria-label", `Pintar de ${cor}`);
    tinta.addEventListener("click", () => {
      item.data.cor = cor;
      if (!item.data.negativo) {
        item.fillColor = cor;
        item.fillColor.alpha = 0.85;
      }
      registrar();
      desenhar();
    });
    paleta.append(tinta);
  }
  secao.append(paleta);
  const nota = document.createElement("p");
  nota.className = "dica";
  nota.textContent = "A cor ajuda a enxergar. No corte sai só o contorno.";
  secao.append(nota);
  return secao;
}

function blocoAcoesPeca(itens) {
  const secao = grupo("Peça");
  const negativos = itens.every((item) => item.data.negativo);
  secao.append(
    linhaBotoes(
      botao("negativo", negativos ? "Voltar a positiva" : "Marcar negativa", () => {
        combinar.alternarNegativo(itens);
        desenhar();
      }),
      botao("unir", "Combinar", () => {
        if (!combinar.podeCombinar(itens)) {
          mostrarAviso("Selecione pelo menos duas peças para combinar.", "alerta");
          return;
        }
        const resultado = combinar.combinar(itens);
        if (!resultado) {
          mostrarAviso("A combinação apagou tudo. Reposicione as peças e tente de novo.", "alerta");
          tocar("erro");
        }
        desenhar();
      }),
      botao("desunir", "Desunir", () => {
        if (!combinar.podeDesunir(itens)) {
          mostrarAviso("Só dá para desunir uma peça que foi combinada.", "alerta");
          return;
        }
        combinar.desunir(itens[0]);
        desenhar();
      }),
    ),
    linhaBotoes(
      botao("caminho", "Virar caminho", () => {
        for (const item of itens) converterEmCaminho(item);
        registrar();
        desenhar();
      }),
      botao("frente", "Trazer para frente", () => organizar.ordenar(itens, "frente")),
      botao("tras", "Mandar para trás", () => organizar.ordenar(itens, "tras")),
      botao("lixo", "Apagar", () => {
        selecao.apagarSelecao();
        desenhar();
      }, "botao--perigo"),
    ),
  );
  return secao;
}

function blocoOrganizar(itens) {
  const secao = grupo("Organizar");
  secao.append(
    linhaBotoes(
      botao("alinharEsquerda", "Alinhar à esquerda", () => organizar.alinhar(itens, "esquerda")),
      botao("alinharCentroH", "Centralizar na horizontal", () => organizar.alinhar(itens, "centroH")),
      botao("alinharDireita", "Alinhar à direita", () => organizar.alinhar(itens, "direita")),
    ),
    linhaBotoes(
      botao("alinharTopo", "Alinhar ao topo", () => organizar.alinhar(itens, "topo")),
      botao("alinharMeioV", "Centralizar na vertical", () => organizar.alinhar(itens, "meioV")),
      botao("alinharBase", "Alinhar à base", () => organizar.alinhar(itens, "base")),
    ),
    linhaBotoes(
      botao("distribuirH", "Distribuir na horizontal", () => organizar.distribuir(itens, "horizontal")),
      botao("distribuirV", "Distribuir na vertical", () => organizar.distribuir(itens, "vertical")),
      botao("enquadrar", "Centralizar na mesa", () => organizar.centralizarNaMesa(itens)),
    ),
  );
  return secao;
}

function blocoRemodelar() {
  const secao = grupo("Remodelar");
  const nota = document.createElement("p");
  nota.className = "dica";
  nota.textContent = remodelar.alvoAtual()
    ? "Clique nos pontos para marcar. Arraste a linha para curvar."
    : "Clique numa peça para editar os pontos dela.";
  secao.append(
    nota,
    linhaBotoes(
      botao("caminho", "Fazer curva", () => {
        if (!remodelar.fazerCurva()) mostrarAviso("Marque ao menos um ponto.", "alerta");
      }),
      botao("nos", "Fazer canto", () => {
        if (!remodelar.fazerCanto()) mostrarAviso("Marque ao menos um ponto.", "alerta");
      }),
      botao("lixo", "Apagar ponto", () => {
        if (!remodelar.apagarNos()) mostrarAviso("Marque ao menos um ponto.", "alerta");
      }),
    ),
  );
  return secao;
}

// --- Montagem ----------------------------------------------------------

export function desenhar() {
  if (!area) return;
  area.innerHTML = "";
  const itens = cena.selecao;

  if (cena.ferramenta === "remodelar") {
    area.append(blocoRemodelar());
    return;
  }

  if (!itens.length) {
    const boasVindas = document.createElement("div");
    boasVindas.innerHTML = fala(
      "zorp",
      "Escolhe uma forma ali na caixa e clica na mesa. Se errar, Ctrl+Z conserta. Eu erro o tempo todo.",
    );
    area.append(boasVindas, blocoMesa());
    return;
  }

  if (itens.length === 1) {
    const item = itens[0];
    const parametros =
      item.data.tipo === "texto" ? blocoTexto(item) : blocoParametros(item);
    if (parametros) area.append(parametros);
    area.append(blocoAjusteFino(item), blocoAparencia(item), blocoAcoesPeca(itens));
    return;
  }

  const resumo = grupo(`${itens.length} peças selecionadas`);
  area.append(resumo, blocoOrganizar(itens), blocoAcoesPeca(itens));
}
