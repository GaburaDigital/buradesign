# vendor

As bibliotecas ficam aqui, versionadas dentro do repositório, para que a
aplicação funcione sem internet e sem etapa de compilação.

Ainda vazia na fase 0. O que entra em cada fase:

| Fase | Biblioteca | Para quê |
| --- | --- | --- |
| 1 | Paper.js | caminhos, bezier, remodelar e booleanas em 2D |
| 1 | opentype.js | texto com acentos virando caminho |
| 2 | Three.js | cena 3D, importação e exportação de STL, OBJ e GLB |
| 2 | three-bvh-csg | unir peças e subtrair peças negativas |
| 3 | Blockly | blocos no estilo Scratch 3 (renderer `zelos`) |
| 5 | Rapier | física, juntas e motores |

Regra ao somar uma biblioteca: guarde a versão exata, anote-a nesta tabela,
inclua os arquivos na lista do `sw.js` e suba a `VERSAO` do service worker.
