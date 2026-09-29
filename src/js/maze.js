// maze.js
// Laberinto 28x31 fiel a la geometria del nivel 1 de Pac-Man.
// Se escribe como 31 strings de 28 chars (legible) y se parsea a numeros.
//   '#' pared(1) · '.' dot(2) · ' ' vacio transitable(0) · '-' puerta pen(3)
// Coordenadas: celda (x,y), origen arriba-izquierda. x in [0,27], y in [0,30].
// Simetrico respecto al eje vertical central (entre cols 13 y 14).

const MAZE_STR = [
  '############################', // 0  borde
  '#............##............#', // 1
  '#.####.#####.##.#####.####.#', // 2
  '#.####.#####.##.#####.####.#', // 3
  '#.####.#####.##.#####.####.#', // 4
  '#..........................#', // 5
  '#.####.##.########.##.####.#', // 6
  '#.####.##.########.##.####.#', // 7
  '#......##....##....##......#', // 8
  '######.#####.##.#####.######', // 9
  '######.#####.##.#####.######', // 10
  '######.##..........##.######', // 11
  '######.##.###--###.##.######', // 12  puerta pen cols 13-14
  '######.##.#      #.##.######', // 13  interior pen
  '          #      #          ', // 14  tunel (extremos abiertos) + pen
  '######.##.#      #.##.######', // 15  interior pen
  '######.##.########.##.######', // 16  fondo pen
  '######.##..........##.######', // 17
  '######.#####.##.#####.######', // 18
  '######.#####.##.#####.######', // 19
  '#............##............#', // 20
  '#.####.#####.##.#####.####.#', // 21
  '#.####.#####.##.#####.####.#', // 22
  '#...##................##...#', // 23  fila inicio Pacman (13,23)
  '###.##.##.########.##.##.###', // 24
  '###.##.##.########.##.##.###', // 25
  '#......##....##....##......#', // 26
  '#.##########.##.##########.#', // 27
  '#.##########.##.##########.#', // 28
  '#..........................#', // 29
  '############################', // 30  borde
];

function parseTile( ch ) {
  if ( ch === '#' ) return 1;
  if ( ch === '.' ) return 2;
  if ( ch === '-' ) return 3;
  return 0; // espacio = vacio transitable
}

// Matriz numerica pristina (no se muta; cada partida copia esto).
const MAZE = MAZE_STR.map( ( row ) => row.split( '' ).map( parseTile ) );

const TUNNEL_ROW = 14;
// La pen se define con estas cajas; si editas las filas de MAZE_STR
// que forman la pen, actualizalas aqui tambien.
const PEN_BOX = { x0: 11, x1: 17, y0: 12, y1: 15 }; // incluye la fila de la puerta
const PEN_EXIT = { x: 13, y: 11 };                  // celda transitable justo encima de la puerta
function isInPen( x, y ) {
  return x >= PEN_BOX.x0 && x <= PEN_BOX.x1 && y >= PEN_BOX.y0 && y <= PEN_BOX.y1;
}
const PACMAN_START = { x: 13, y: 23 };
// 4 fantasmas. El orden del array es tambien el orden de salida de la pen:
// reordenarlo cambia la dificultad del nivel sin tocar ningun otro archivo.
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'hunter' },   // el primero en salir
  { x: 14, y: 14, kind: 'ambusher' },
  { x: 13, y: 15, kind: 'flanker' },
  { x: 14, y: 15, kind: 'shy' },
];

window.MAZE = MAZE;
window.TUNNEL_ROW = TUNNEL_ROW;
window.PEN_BOX = PEN_BOX;
window.PEN_EXIT = PEN_EXIT;
window.isInPen = isInPen;
window.PACMAN_START = PACMAN_START;
window.GHOST_STARTS = GHOST_STARTS;
