// Texto em 3D. O contorno vem da mesma fonte usada no 2D, pelo opentype.js,
// e vira volume por extrusão. Acentos do português inclusos.

import * as THREE from "three";
import { carregarScript } from "../../core/carregar-script.js";
import { carregarCatalogo, familias } from "../livre/texto.js";
import { aplicarUVsDeCaixa, garantirOrientacao } from "./solidos.js";

export const PADRAO = {
  texto: "Oficina",
  familia: "poppins",
  tamanho: 20,
  extrusao: 6,
  negrito: false,
};

const fontesAbertas = new Map();

export async function preparar() {
  await carregarScript("libs/opentype/opentype.min.js", "opentype");
  await carregarCatalogo();
}

function arquivoDa(familiaId, negrito) {
  const familia = familias().find((f) => f.id === familiaId) || familias()[0];
  if (!familia) return null;
  const escolhido = negrito ? familia.arquivos.negrito : familia.arquivos.normal;
  return `assets/fontes/${escolhido || familia.arquivos.normal}`;
}

function abrirFonte(caminho) {
  if (fontesAbertas.has(caminho)) return fontesAbertas.get(caminho);
  const promessa = new Promise((resolver, rejeitar) => {
    window.opentype.load(caminho, (erro, fonte) => {
      if (erro) rejeitar(erro);
      else resolver(fonte);
    });
  });
  fontesAbertas.set(caminho, promessa);
  return promessa;
}

// O opentype entrega o desenho com o Y para baixo, como no SVG.
// O caminho é montado exatamente como veio: espelhar o Y aqui invertia o
// sentido dos contornos e a montagem das tampas saía quebrada, com o miolo
// das letras preenchido. O desenho é endireitado depois, girando meia volta
// no eixo X, que é rotação e não espelho: as faces continuam certas.
function caminhoParaFormas(desenho) {
  const trilha = new THREE.ShapePath();
  for (const comando of desenho.commands) {
    switch (comando.type) {
      case "M":
        trilha.moveTo(comando.x, comando.y);
        break;
      case "L":
        trilha.lineTo(comando.x, comando.y);
        break;
      case "C":
        trilha.bezierCurveTo(comando.x1, comando.y1, comando.x2, comando.y2, comando.x, comando.y);
        break;
      case "Q":
        trilha.quadraticCurveTo(comando.x1, comando.y1, comando.x, comando.y);
        break;
      default:
        break;
    }
  }
  return trilha.toShapes(true);
}

export async function geometriaDeTexto(params) {
  const dados = { ...PADRAO, ...(params || {}) };
  const caminho = arquivoDa(dados.familia, dados.negrito);
  if (!caminho) throw new Error("Nenhuma fonte registrada.");
  const fonte = await abrirFonte(caminho);
  const desenho = fonte.getPath(dados.texto || " ", 0, 0, dados.tamanho);
  const formas = caminhoParaFormas(desenho);
  if (!formas.length) return null;

  const geometria = new THREE.ExtrudeGeometry(formas, {
    depth: Math.max(0.4, dados.extrusao),
    bevelEnabled: false,
    curveSegments: 8,
  });
  // Meia volta no eixo X: o texto fica em pé e legível, sem espelhamento.
  geometria.rotateX(Math.PI);
  geometria.center();
  garantirOrientacao(geometria);
  aplicarUVsDeCaixa(geometria);
  return geometria;
}
