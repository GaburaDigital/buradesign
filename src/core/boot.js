// Abertura do sistema. É o único momento de animação automática da aplicação.
// Pode ser pulada com qualquer tecla ou toque, e desligada nos Ajustes.

import { t } from "./idioma.js";
import { valor } from "./ajustes.js";
import { tocar } from "./som.js";

const RITMO = 190;

function reduzMovimento() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function escrever(area, linhas) {
  area.innerHTML = linhas
    .map((linha) => {
      if (linha.endsWith("OK")) {
        return `${linha.slice(0, -2)}<span class="ok">OK</span>`;
      }
      return linha;
    })
    .join("\n");
}

export function executar({ pecasNaBolsa = 0 } = {}) {
  const tela = document.getElementById("boot");
  const area = document.getElementById("boot-linhas");
  const dica = document.getElementById("boot-dica");

  const linhas = t("boot.linhas").map((linha) =>
    linha.replace("{bolsa}", pecasNaBolsa ? `${pecasNaBolsa} PEÇAS` : "VAZIA"),
  );

  return new Promise((resolver) => {
    let encerrado = false;
    let relogio = null;
    let espera = null;

    const encerrar = () => {
      if (encerrado) return;
      encerrado = true;
      window.removeEventListener("keydown", encerrar);
      tela.removeEventListener("pointerdown", encerrar);
      if (relogio) clearInterval(relogio);
      if (espera) clearTimeout(espera);
      tela.hidden = true;
      resolver();
    };

    if (valor("bootRapido")) {
      tela.hidden = true;
      resolver();
      return;
    }

    window.addEventListener("keydown", encerrar);
    tela.addEventListener("pointerdown", encerrar);
    tocar("boot");

    if (reduzMovimento()) {
      escrever(area, linhas);
      dica.classList.add("visivel");
      espera = setTimeout(encerrar, 1600);
      return;
    }

    let indice = 0;
    relogio = setInterval(() => {
      indice += 1;
      escrever(area, linhas.slice(0, indice));
      if (indice < linhas.length) {
        if (linhas[indice - 1].trim()) tocar("tecla");
        return;
      }
      clearInterval(relogio);
      relogio = null;
      dica.classList.add("visivel");
      tocar("pronto");
      espera = setTimeout(encerrar, 1400);
    }, RITMO);
  });
}
