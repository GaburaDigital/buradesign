// Guardar e sair do modo 3D: projeto no navegador e em arquivo, importação de
// STL, OBJ e GLB, exportação em STL e envio de peças para a Bolsa.

import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { STLExporter } from "three/addons/exporters/STLExporter.js";
import { cena3d } from "./cena.js";
import { serializar, reconstruir, pecaImportada, remover } from "./pecas.js";
import * as deposito from "../../core/deposito.js";
import { adicionar as guardarNaBolsa } from "../../core/bolsa.js";
import { baixarTexto, baixarJSON, carimboDeData } from "../../core/arquivos.js";
import { nomeDeArquivo } from "../livre/projeto.js";

export const FORMATO = "buradesign.projeto";
export const VERSAO = 1;
export const ID_CACHE = "livre3d:atual";

export function empacotar(nome) {
  return {
    formato: FORMATO,
    versao: VERSAO,
    modo: "livre3d",
    nome: nome || "Projeto sem nome",
    base: { ...cena3d.base },
    pecas: cena3d.grupoPecas.children.map((peca) => serializar(peca)),
    salvoEm: new Date().toISOString(),
  };
}

export function desempacotar(pacote) {
  if (!pacote || pacote.formato !== FORMATO || pacote.modo !== "livre3d") {
    throw new Error("Este arquivo não é um projeto 3D do BuraDESIGN.");
  }
  limparMesa();
  if (pacote.base) cena3d.base = { ...cena3d.base, ...pacote.base };
  for (const registro of pacote.pecas || []) reconstruir(registro);
  return cena3d.base;
}

export function limparMesa() {
  cena3d.selecao = [];
  for (const peca of cena3d.grupoPecas.children.slice()) remover(peca);
}

export async function salvarNoCache(nome) {
  const pacote = empacotar(nome);
  await deposito.guardar("projetos", {
    id: ID_CACHE,
    nome: pacote.nome,
    modo: "livre3d",
    criadoEm: Date.now(),
    pacote,
  });
  return pacote;
}

export async function salvarComNome(nome) {
  const pacote = empacotar(nome);
  const registro = {
    id: deposito.novoId("projeto3d"),
    nome: pacote.nome,
    modo: "livre3d",
    criadoEm: Date.now(),
    pacote,
  };
  await deposito.guardar("projetos", registro);
  return registro;
}

export async function listarSalvos() {
  const todos = await deposito.listar("projetos");
  return todos.filter((registro) => registro.modo === "livre3d" && registro.id !== ID_CACHE);
}

export async function lerDoCache() {
  try {
    const guardado = await deposito.buscar("projetos", ID_CACHE);
    return guardado ? guardado.pacote : null;
  } catch {
    return null;
  }
}

export function baixarProjeto(nome) {
  baixarJSON(`${nomeDeArquivo(nome || "projeto_3d")}_${carimboDeData()}.burad.json`, empacotar(nome));
}

// --- Exportar para impressão ------------------------------------------

export function montarSTL({ apenasSelecao = false } = {}) {
  const alvos = apenasSelecao && cena3d.selecao.length ? cena3d.selecao : cena3d.grupoPecas.children;
  const grupo = new THREE.Group();
  for (const peca of alvos) {
    if (peca.userData.negativo) continue;
    peca.updateMatrixWorld(true);
    const copia = new THREE.Mesh(peca.geometry.clone(), new THREE.MeshBasicMaterial());
    copia.applyMatrix4(peca.matrixWorld);
    grupo.add(copia);
  }
  if (!grupo.children.length) return null;
  const texto = new STLExporter().parse(grupo, { binary: false });
  for (const filho of grupo.children.slice()) {
    filho.geometry.dispose();
    filho.material.dispose();
  }
  return texto;
}

export function exportarSTL(opcoes = {}) {
  const texto = montarSTL(opcoes);
  if (!texto) return null;
  baixarTexto(
    `${nomeDeArquivo(opcoes.nome || "modelo_3d")}_${carimboDeData()}.stl`,
    texto,
    "model/stl",
  );
  return texto;
}

// --- Importar modelos --------------------------------------------------

export async function importarArquivo(arquivo) {
  const nome = arquivo.name.replace(/\.[^.]+$/, "");
  const extensao = arquivo.name.split(".").pop().toLowerCase();

  if (extensao === "stl") {
    const dados = await arquivo.arrayBuffer();
    return [pecaImportada(new STLLoader().parse(dados), nome)];
  }
  if (extensao === "obj") {
    const texto = await arquivo.text();
    const objeto = new OBJLoader().parse(texto);
    return juntarMalhas(objeto, nome);
  }
  if (extensao === "glb" || extensao === "gltf") {
    const dados = await arquivo.arrayBuffer();
    const carregador = new GLTFLoader();
    const resultado = await carregador.parseAsync(dados, "");
    return juntarMalhas(resultado.scene, nome);
  }
  throw new Error("Formato não reconhecido. Use STL, OBJ ou GLB.");
}

function juntarMalhas(raiz, nome) {
  const criadas = [];
  raiz.updateMatrixWorld(true);
  raiz.traverse((filho) => {
    if (!filho.isMesh || !filho.geometry) return;
    const geometria = filho.geometry.clone();
    geometria.applyMatrix4(filho.matrixWorld);
    criadas.push(pecaImportada(geometria, nome));
  });
  if (!criadas.length) throw new Error("Não achei nenhuma peça nesse arquivo.");
  return criadas;
}

// --- Bolsa -------------------------------------------------------------

export async function enviarParaBolsa(nome) {
  if (!cena3d.selecao.length) return null;
  const registros = cena3d.selecao.map((peca) => serializar(peca));
  const caixa = new THREE.Box3();
  for (const peca of cena3d.selecao) caixa.expandByObject(peca);
  const tamanho = caixa.getSize(new THREE.Vector3());

  return guardarNaBolsa({
    nome: nome || "Peça 3D",
    tipo: "peca3d",
    origem: "livre3d",
    dados: {
      pecas: registros,
      larguraMm: Number(tamanho.x.toFixed(2)),
      alturaMm: Number(tamanho.y.toFixed(2)),
      profundidadeMm: Number(tamanho.z.toFixed(2)),
      previa: fotografar(),
    },
  });
}

// Foto da cena para virar miniatura na bolsa.
export function fotografar() {
  try {
    cena3d.renderizador.render(cena3d.cena, cena3d.camera);
    return cena3d.renderizador.domElement.toDataURL("image/png");
  } catch {
    return "";
  }
}

export function colocarDaBolsa(item) {
  const registros = item?.dados?.pecas;
  if (!Array.isArray(registros) || !registros.length) return false;
  const criadas = registros.map((registro) => reconstruir(registro)).filter(Boolean);
  cena3d.selecao = criadas;
  return criadas.length > 0;
}

// Ponte com o 2D: o contorno do que encosta na base vira caminho.
export function contornosNaBase() {
  const contornos = [];
  for (const peca of cena3d.grupoPecas.children) {
    if (peca.userData.negativo) continue;
    peca.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(peca);
    if (caixa.min.y > 0.6) continue;
    contornos.push({
      nome: peca.userData.nome,
      x: caixa.min.x,
      y: caixa.min.z,
      largura: caixa.max.x - caixa.min.x,
      altura: caixa.max.z - caixa.min.z,
    });
  }
  return contornos;
}
