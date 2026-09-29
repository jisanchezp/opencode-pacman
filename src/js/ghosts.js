// ghosts.js
// Comportamientos de persecucion de los fantasmas. Expone getTarget( game, g ):
// la celda objetivo que un kind concreto persigue. No mueve a nadie, solo dice
// hacia donde mirar. Usa DIRS de game.js, que se carga despues (solo se usa
// dentro de funciones, nunca al cargar el archivo).

const GHOST_RELEASE_FRAMES = 90; // frames entre salidas de la pen (1.5s a 60fps)
const SHY_SCARED_DIST = 8;       // celdas: radio de huida del shy
const SHY_CORNER = { x: 1, y: 29 }; // esquina inferior izquierda
// Desempate determinista entre direcciones a igual distancia.
const TURN_PRIORITY = [ 'up', 'left', 'down', 'right' ];

// Celda entera de Pacman. Todos los targets se derivan de ella.
function pacCell( game ) {
  return { x: Math.round( game.pacman.x ), y: Math.round( game.pacman.y ) };
}

// Celda del hunter, que el flanker usa como punto de reflexion. Si la partida
// no tiene hunter, cae a la celda de Pacman.
function hunterCell( game ) {
  const hunter = game.ghosts.find( ( g ) => g.kind === 'hunter' );
  if ( !hunter ) return pacCell( game );
  return { x: Math.round( hunter.x ), y: Math.round( hunter.y ) };
}

// Persecucion directa: la celda de Pacman.
function hunterTarget( game, g ) {
  return pacCell( game );
}

// Corta el camino: 4 celdas por delante de Pacman, en su direccion actual.
function ambusherTarget( game, g ) {
  const p = pacCell( game );
  const d = DIRS[ game.pacman.dir ] || { x: 0, y: 0 };
  return { x: p.x + d.x * 4, y: p.y + d.y * 4 };
}

// Flanquea: refleja el hunter a traves del punto 2 celdas por delante de
// Pacman, buscando el lado opuesto al hunter. Sirve aunque el objetivo caiga
// fuera del laberinto, porque el target solo ordena direcciones legales.
function flankerTarget( game, g ) {
  const p = pacCell( game );
  const d = DIRS[ game.pacman.dir ] || { x: 0, y: 0 };
  const v = { x: p.x + d.x * 2, y: p.y + d.y * 2 };
  const h = hunterCell( game );
  return { x: v.x + ( v.x - h.x ), y: v.y + ( v.y - h.y ) };
}

// shy persigue mientras este lejos y se retira a su esquina cuando Pacman se
// acerca. La distancia es euclidea porque es un radio de cercania, no un
// ranking de direcciones: el ranking sigue siendo Manhattan en game.js.
function shyTarget( game, g ) {
  const p = pacCell( game );
  const dist = Math.hypot( g.x - p.x, g.y - p.y );
  if ( dist > SHY_SCARED_DIST ) return p;
  return { x: SHY_CORNER.x, y: SHY_CORNER.y };
}

const TARGET_FN = {
  hunter: hunterTarget,
  ambusher: ambusherTarget,
  flanker: flankerTarget,
  shy: shyTarget,
};

// Un kind desconocido persigue directo: es la regla por defecto del juego y
// evita que getTarget devuelva undefined.
function getTarget( game, g ) {
  if ( g.state === 'pen' ) return PEN_EXIT;
  return ( TARGET_FN[ g.kind ] || hunterTarget )( game, g );
}

window.getTarget = getTarget;
