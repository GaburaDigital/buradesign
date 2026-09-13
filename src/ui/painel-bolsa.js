// Painel da Bolsa. É a mesma bolsa em todos os setores.

import * as bolsa from "../core/bolsa.js";
import { t } from "../core/idioma.js";
import { tocar } from "../core/som.js";
import { baixarJSON, escolherArquivo, lerJSON, carimboDeData } from "../core/arquivos.js";
import { icone } from "./icones.js";
import { fala } from "./aliens.js";
import { abrirPainel, confirmar, mostrarAviso, perguntarTexto } from "./painel.js";

// O setor de desenho aberto registra aqui como receber uma peça da bolsa.
// Sem setor aberto, o botão de colocar na mesa não aparece.
let destino = null;

export function definirDestino(funcao) {
  destino = typeof funcao === "function" ? funcao : null;
}

export function limparDestino() {
  destino = null;
}

function quando(marca) {
  try {
    return new Date(marca).toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

async function desenharLista(area) {
  const itens = await bolsa.listar();
  area.innerHTML = "";

  if (!itens.length) {
    const vazio = document.createElement("div");
    vazio.className = "vazio";
    vazio.innerHTML = `<p>${t("bolsa.vazia")}</p>`;
    const demo = document.createElement("button");
    demo.type = "button";
    demo.className = "botao";
    demo.textContent = t("bolsa.demonstracao");
    demo.addEventListener("click", async () => {
      await bolsa.adicionar({
        nome: t("bolsa.itemDemo"),
        tipo: "peca3d",
        origem: "demonstracao",
        dados: { forma: "cubo", ladoMm: 20 },
      });
      tocar("clique");
      desenharLista(area);
    });
    vazio.append(demo);
    area.append(vazio);
    return;
  }

  const lista = document.createElement("ul");
  lista.className = "bolsa-lista";
  for (const item of itens) {
    const linha = document.createElement("li");
    linha.className = "bolsa-item";
    linha.innerHTML = `${icone("cubo")}
      <div class="bolsa-item__dados">
        <div class="bolsa-item__nome">${item.nome}</div>
        <div class="bolsa-item__meta">${bolsa.TIPOS[item.tipo]} · ${quando(item.criadoEm)}</div>
      </div>`;
    if (destino) {
      const colocar = document.createElement("button");
      colocar.type = "button";
      colocar.className = "botao botao--destaque";
      colocar.title = t("acoes.colocarNaMesa");
      colocar.setAttribute("aria-label", `${t("acoes.colocarNaMesa")}: ${item.nome}`);
      colocar.innerHTML = `${icone("baixar")}<span class="rotulo-acao">${t("acoes.colocarNaMesa")}</span>`;
      colocar.addEventListener("click", () => {
        const deu = destino(item);
        if (deu === false) {
          mostrarAviso(t("bolsa.semDestino"), "alerta");
          tocar("erro");
          return;
        }
        tocar("pronto");
        mostrarAviso(t("bolsa.colocada"));
      });
      linha.append(colocar);
    }

    const apagar = document.createElement("button");
    apagar.type = "button";
    apagar.className = "botao botao--icone botao--perigo";
    apagar.setAttribute("aria-label", `${t("acoes.remover")}: ${item.nome}`);
    apagar.innerHTML = icone("lixeira");
    apagar.addEventListener("click", async () => {
      await bolsa.remover(item.id);
      mostrarAviso(t("bolsa.removida"));
      tocar("clique");
      desenharLista(area);
    });
    linha.append(apagar);
    lista.append(linha);
  }
  area.append(lista);
}

export function abrirBolsa() {
  const corpo = document.createElement("div");
  corpo.innerHTML = fala("krux", t("bolsa.resumo"));
  const area = document.createElement("div");
  corpo.append(area);
  desenharLista(area);

  return abrirPainel({
    titulo: t("bolsa.titulo"),
    corpo,
    botoes: [
      {
        rotulo: t("acoes.exportar"),
        icone: "baixar",
        aoClicar: async () => {
          const nome = await perguntarTexto(
            t("acoes.exportar"),
            t("bolsa.nomeArquivo"),
            "bolsa_buradesign",
          );
          if (nome === null) return;
          const pacote = await bolsa.exportar();
          const limpo =
            nome
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-zA-Z0-9_-]+/g, "_")
              .slice(0, 40) || "bolsa_buradesign";
          baixarJSON(`${limpo}_${carimboDeData()}.json`, pacote);
          tocar("salvar");
          mostrarAviso(t("bolsa.baixada"));
        },
      },
      {
        rotulo: t("acoes.importar"),
        icone: "enviar",
        aoClicar: async () => {
          const arquivo = await escolherArquivo();
          if (!arquivo) return;
          try {
            const conteudo = await lerJSON(arquivo);
            const somados = await bolsa.importar(conteudo);
            mostrarAviso(t("bolsa.importadas", { n: somados }));
            tocar("pronto");
            desenharLista(area);
          } catch {
            mostrarAviso(t("bolsa.erroArquivo"), "erro");
            tocar("erro");
          }
        },
      },
      {
        rotulo: t("acoes.esvaziar"),
        variante: "perigo",
        icone: "lixeira",
        aoClicar: async () => {
          const certeza = await confirmar(t("bolsa.confirmarEsvaziar"));
          if (!certeza) return;
          await bolsa.esvaziar();
          mostrarAviso(t("bolsa.esvaziada"), "alerta");
          abrirBolsa();
        },
      },
    ],
  });
}
