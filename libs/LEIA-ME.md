# libs

As bibliotecas ficam aqui, versionadas dentro do repositório, para que a
aplicação funcione sem internet e sem etapa de compilação.

O que entra em cada fase, e o que já está aqui:

| Fase | Biblioteca | Versão | Pasta | Para quê |
| --- | --- | --- | --- | --- |
| 1 | Paper.js | 0.12.18 | `paper/` | caminhos, bezier, remodelar e booleanas em 2D |
| 1 | opentype.js | 1.3.4 | `opentype/` | texto com acentos virando caminho |
| 2 | Three.js | 0.169.0 | `three/` | cena 3D, importação e exportação de STL, OBJ e GLB |
| 2 | three-mesh-bvh | 0.7.8 | `csg/` | acelera as booleanas |
| 2 | three-bvh-csg | 0.0.17 | `csg/` | unir peças e subtrair peças negativas |
| 3 | Blockly | 11.2.0 | `blockly/` | blocos no estilo Scratch 3 (renderer `zelos`) |
| 5 | Rapier | — | — | física, juntas e motores |

O Blockly entra como pacote UMD (`blockly.min.js`, expõe `window.Blockly`) mais
o arquivo de mensagens em português (`msg-pt-br.js`), que precisa ser carregado
depois dele. Os dois só são baixados quando o setor de programação abre.

Regra ao somar uma biblioteca: guarde a versão exata, anote-a nesta tabela,
inclua os arquivos na lista do `sw.js` e suba a `VERSAO` do service worker.
