// Painel de ajustes. As mudanças valem na hora para o usuário testar, mas só
// ficam guardadas quando ele clica em salvar.

import * as ajustes from "../core/ajustes.js";
import { t, idiomasDisponiveis } from "../core/idioma.js";
import { tocar } from "../core/som.js";
import { abrirPainel, fecharPainel, confirmar, mostrarAviso } from "./painel.js";
import { CHAVE_CACHE } from "../core/registrar-sw.js";

function interruptor(chave, rotulo) {
  const linha = document.createElement("label");
  linha.className = "campo interruptor";
  linha.innerHTML = `<span class="campo__rotulo">${rotulo}</span>`;
  const caixa = document.createElement("input");
  caixa.type = "checkbox";
  caixa.checked = Boolean(ajustes.valor(chave));
  caixa.addEventListener("change", () => {
    ajustes.definir(chave, caixa.checked);
    if (chave === "som" && caixa.checked) tocar("clique");
    marcarPendencia(linha.closest(".painel"));
  });
  linha.append(caixa);
  return linha;
}

function seletor(chave, rotulo, opcoes, ajuda) {
  const campo = document.createElement("div");
  campo.className = "campo";
  campo.innerHTML = `<span class="campo__rotulo" id="rot-${chave}">${rotulo}</span>`;
  const escolha = document.createElement("select");
  escolha.setAttribute("aria-labelledby", `rot-${chave}`);
  for (const opcao of opcoes) {
    const item = document.createElement("option");
    item.value = String(opcao.valor);
    item.textContent = opcao.rotulo;
    if (String(ajustes.valor(chave)) === String(opcao.valor)) item.selected = true;
    escolha.append(item);
  }
  escolha.addEventListener("change", () => {
    const bruto = escolha.value;
    const convertido = opcoes.find((o) => String(o.valor) === bruto)?.valor ?? bruto;
    ajustes.definir(chave, convertido);
    tocar("clique");
    marcarPendencia(campo.closest(".painel"));
  });
  campo.append(escolha);
  if (ajuda) {
    const nota = document.createElement("p");
    nota.className = "campo__ajuda";
    nota.textContent = ajuda;
    campo.append(nota);
  }
  return campo;
}

function marcarPendencia(painel) {
  if (!painel) return;
  const estado = painel.querySelector("[data-estado]");
  if (!estado) return;
  estado.textContent = ajustes.temPendencia() ? t("ajustes.naoSalvo") : "";
}

async function limparCache() {
  const certeza = await confirmar(t("ajustes.confirmarCache"));
  if (!certeza) return;
  ajustes.esquecerGuardados();
  if ("caches" in window) {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter((n) => n.startsWith(CHAVE_CACHE)).map((n) => caches.delete(n)));
  }
  mostrarAviso(t("ajustes.cacheLimpo"), "alerta");
  tocar("salvar");
}

export function abrirAjustes() {
  const corpo = document.createElement("div");

  const aparencia = document.createElement("section");
  aparencia.className = "painel__secao";
  aparencia.innerHTML = `<h3>${t("ajustes.aparencia")}</h3>`;
  aparencia.append(
    seletor("tema", t("ajustes.tema"), [
      { valor: "escuro", rotulo: t("ajustes.temaEscuro") },
      { valor: "claro", rotulo: t("ajustes.temaClaro") },
      { valor: "sistema", rotulo: t("ajustes.temaSistema") },
      { valor: "rosa", rotulo: t("ajustes.temaRosa") },
      { valor: "flash", rotulo: t("ajustes.temaFlash") },
    ]),
    interruptor("som", t("ajustes.somAtivo")),
    seletor("volume", t("ajustes.volume"), [
      { valor: 0.25, rotulo: "Baixo" },
      { valor: 0.5, rotulo: "Médio" },
      { valor: 0.85, rotulo: "Alto" },
    ]),
  );

  const idiomas = idiomasDisponiveis();
  if (idiomas.length > 1) {
    aparencia.append(
      seletor(
        "idioma",
        "Idioma",
        idiomas.map((item) => ({ valor: item.codigo, rotulo: item.nome })),
      ),
    );
  }

  const bancada = document.createElement("section");
  bancada.className = "painel__secao";
  bancada.innerHTML = `<h3>${t("ajustes.oficina")}</h3>`;
  bancada.append(
    seletor("unidade", t("ajustes.unidade"), [
      { valor: "cm", rotulo: "Centímetros (cm)" },
      { valor: "mm", rotulo: "Milímetros (mm)" },
    ]),
    seletor(
      "snap",
      t("ajustes.snap"),
      [
        { valor: 0, rotulo: t("ajustes.semSnap") },
        { valor: 1, rotulo: "1 mm" },
        { valor: 2, rotulo: "2 mm" },
        { valor: 5, rotulo: "5 mm" },
        { valor: 10, rotulo: "10 mm" },
      ],
      "Quanto menor o passo, mais fino o ajuste das peças.",
    ),
    seletor(
      "alcas",
      t("ajustes.alcas"),
      [
        { valor: 1, rotulo: t("ajustes.alcasNormal") },
        { valor: 1.6, rotulo: t("ajustes.alcasGrande") },
        { valor: 2.4, rotulo: t("ajustes.alcasEnorme") },
      ],
      t("ajustes.alcasAjuda"),
    ),
    seletor(
      "opacidadeBase",
      t("ajustes.opacidadeBase"),
      [
        { valor: 0, rotulo: t("ajustes.baseInvisivel") },
        { valor: 0.2, rotulo: t("ajustes.baseFraca") },
        { valor: 0.35, rotulo: t("ajustes.baseMedia") },
        { valor: 0.6, rotulo: t("ajustes.baseForte") },
      ],
      t("ajustes.opacidadeBaseAjuda"),
    ),
    interruptor("salvarSozinho", t("ajustes.salvarSozinho")),
    interruptor("bootRapido", t("ajustes.bootRapido")),
    interruptor("avisoDispositivo", t("ajustes.avisoDispositivo")),
  );

  const dados = document.createElement("section");
  dados.className = "painel__secao";
  dados.innerHTML = `<h3>${t("ajustes.dados")}</h3>
    <p class="campo__ajuda">${t("ajustes.dadosAjuda")}</p>
    <p class="campo__ajuda" data-estado></p>`;

  corpo.append(aparencia, bancada, dados);

  const painel = abrirPainel({
    titulo: t("ajustes.titulo"),
    corpo,
    botoes: [
      {
        rotulo: t("acoes.salvar"),
        variante: "destaque",
        icone: "disquete",
        aoClicar: (alvo) => {
          ajustes.salvar();
          tocar("salvar");
          mostrarAviso(t("ajustes.salvo"));
          marcarPendencia(alvo);
        },
      },
      {
        rotulo: t("acoes.restaurar"),
        aoClicar: () => {
          ajustes.restaurarPadrao();
          fecharPainel({ silencioso: true });
          abrirAjustes();
        },
      },
      { rotulo: t("acoes.limparCache"), variante: "perigo", icone: "lixeira", aoClicar: limparCache },
    ],
  });

  marcarPendencia(painel);
  return painel;
}
