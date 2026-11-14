# Contexto para continuar el proyecto

> Resumen para cualquier sesión nueva de Claude (o persona) que retome el trabajo.
> Léelo completo antes de tocar código. Actualizado: 14 nov 2026.

## 1. Qué es

"La aventura de Angie": un juego web de plataformas 2D con el que Brayan le pedirá a Angie que sea su novia.
- Angie recorre 4 etapas de su historia, encuentra un cofre en cada una y gana una llave al superar el minijuego que hay dentro.
- Con las 4 llaves abre el tesoro final, donde está la pregunta "¿Quieres ser mi novia?".

| | |
|---|---|
| Idioma | Español |
| Tono | Romántico, tierno, humor ligero |
| Duración | 8–12 min |

- **Diseño completo y decisiones:** [`propuesta/PROPUESTA.md`](propuesta/PROPUESTA.md). Ahí está la sección 0 con las decisiones y la 6 con todas las opciones; se eligieron todas las ★.
- **Arte de concepto:** [`propuesta/concepto/`](propuesta/concepto/).
- **Capturas del juego actual:** [`propuesta/capturas/`](propuesta/capturas/).

## 2. Lo que el usuario pidió y NO quiere (importante)

- **Estética:** "pintado a tinta", con los gráficos inspirados en *Hollow Knight* y el ambiente en *Sōsō no Frieren*. Se toman cualidades, nunca elementos copiados.
  - Capas con niebla y paralaje.
  - Siluetas oscuras en primer plano.
  - Contorno de tinta en lo jugable.
  - Luces suaves.
  - La referencia visual obligatoria es `propuesta/concepto/02-etapas.png`; el juego debe verse así.
- **Nada que recuerde a Mario Bros:** ni bloques, ni enemigos que se pisan, ni monedas, ni banderas, ni tubos, ni hongos. El usuario se molestó dos veces por esto.
- **Plataformas:** celular en vertical y PC en horizontal.
  - Alto fijo de 844 y ancho adaptable de 390 a 1560.
  - Controles táctiles solo en pantallas táctiles; en PC teclado y mouse.
- **Entrega por fases:** espera la confirmación del usuario entre fases. Al terminar cada fase, explica en 3 líneas cómo probarla.
- **Git:**
  - Una rama por fase (`fase-N/...`).
  - Los commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  - Los PR los hará el usuario más adelante. GitHub CLI está instalado en `C:\Program Files\GitHub CLI\gh.exe`, pero **aún no ha iniciado sesión**.
  - El repositorio será **privado**, para que Angie no lo encuentre.
  - Las fotos personales están en `.gitignore`.
- **Restricciones técnicas:**
  - Phaser 3 desde CDN (3.90.0) y JavaScript vanilla, sin bundlers.
  - Gráficos generados por código (SVG en `arte.js`).
  - Botones de 48 px como mínimo, 60 fps y cero errores en consola.

## 3. Estado actual

| Fase | Contenido | Rama | Estado |
|---|---|---|---|
| 1 | Rediseño visual: Angie con animaciones, portada, mapa en pergamino, HUD, PC, 4 niveles ilustrados con zarzas, sombras, faroles y páginas de diario | `fase-1/base-visual` | Hecha, sin PR |
| 2 | Salto de pétalo (doble salto) desde la etapa II; minijuego 1 (frasco de los recuerdos) y 2 (naipes del farol) dentro de los cofres | `fase-2/etapas-1-2` (sale de la fase 1) | Hecha, sin PR |
| 3 | Planear con la capa (etapa III), plataformas de luz (etapa IV), niveles III y IV rediseñados; minijuego 3 (tablero del claro, ajedrez) y 4 (vitral, rompecabezas) | `fase-3/etapas-3-4` (sale de la fase 2) | Hecha, sin PR, **rama actual** |
| 4 | Cofre final, trivia, pergamino, propuesta, música, pulido | — | Pendiente |

`main` solo tiene el estado inicial (prototipo v1 + propuesta).

## 4. Qué falta

### Fase 3 (hecha)

- **Planear:** mantener el salto mientras cae limita la caída a `VEL_PLANEO` (cuadro 13 de Angie). Activo desde la etapa III (`this.planear = i >= 2`). Con salto simple + planeo se cruza el claro de 14 columnas de la etapa III; sin planear no.
- **Plataformas de luz** (`luz` en `NIVELES`, ciclo `CICLO_LUZ`): encendidas 2,4 s (parpadean al final) y apagadas 1,2 s; no se encienden con Angie dentro.
- **`avisoFarol`** en un nivel: texto que aparece al encender el primer farol (lo usa la etapa III para recordar el planeo).
- **Minijuego 3 (`Mini3`):** módulo `Ajedrez` con jugadas legales (sin enroque ni al paso, corona a dama). Acepta la 1.ª jugada de `CFG.ajedrez.solucion` y como 2.ª cualquier jugada que dé mate.
- **Minijuego 4 (`Mini4`):** 30 movimientos de mezcla, flechas en PC, botón "Ver vitral" (3 s). Sin foto usa la textura `vitral`.

### Fase 4

- **Cofre final** (hoy la escena `Cofre` es provisional), en el campo de flores bajo la luna (ver `propuesta/concepto/04-propuesta.png`):
  1. El cofre tiembla y aparecen 4 cerraduras; cada llave vuela a la suya.
  2. Trivia de 3 preguntas (`CFG.trivia`), con reintento si falla.
  3. El cofre se abre con una columna de luz y sale un pergamino con `CFG.final.leyenda` en efecto máquina de escribir.
- **Pregunta "¿Quieres ser mi novia?":**
  - **"Sí":** el campo florece en ola y suben luciérnagas y corazones; cambia la música y aparece la pantalla final con la foto y el mensaje.
  - **"No":** huye a una posición aleatoria con cada `touchstart` o `pointerdown`. Tras 5 intentos se encoge y cambia de texto (`CFG.final.textosNo`). Al final se convierte en otro "Sí".
- **Audio (opción ★ B):**
  - Ambiente generado por código con timbres de cuento (caja de música, arpa, campanas) y sonido ambiente por etapa.
  - Tema emotivo para la propuesta.
  - mp3 opcionales desde `CFG.musica`.
- **Pulido:** prueba de duración (8–12 min) y de rendimiento.

### Mejoras anotadas (no urgentes)

- **Cámara en PC:** muestra mucho nivel a la vez y Angie se ve pequeña. Se podría acercar la cámara en pantallas anchas, pero ojo: los objetos con `scrollFactor 0` no funcionan bien con zoom en Phaser.
- **Nitidez:** el canvas es de 844 px de alto, así que en pantallas de alta densidad se ve algo suave.

## 5. Arquitectura

| Archivo | Contenido |
|---|---|
| `index.html` | Viewport sin zoom, fuentes Cormorant Garamond y Nunito, Phaser por CDN |
| `config.js` | Todo lo personal y editable: nombres, recuerdos, fotos, ajedrez, trivia, textos finales, mp3 |
| `arte.js` | Módulo `Arte`: genera SVG por código |
| `game.js` | Todo lo demás (detalle abajo) |

**`arte.js`:**
- `Arte.catalogo()` contiene las texturas que se cargan al inicio: Angie con 13 cuadros, portada, mapa, sellos, íconos, objetos de nivel, frasco, naipes, etc.
- `Arte.nivelArte(i, def)` genera las capas de una etapa (`n_astro`, `n_lejos`, `n_medio`, `n_campo`, `n_terreno`). Se crean al entrar al nivel; `arteEtapaCargada` indica cuál está en memoria.

**`game.js`, en orden:**
- Tamaño adaptable (`W` variable y `H = 844`; `aplicarTamano` solo entre escenas).
- `Guardado` (localStorage) y `Sonido` (Web Audio).
- Utilidades: `texto`, `boton`, `aviso`, `foto`, `tarjetaMensaje`, `botonCasa`, `ganarLlave`, `fondoEtapa`.
- Escenas: `Boot`, `HUD` (siempre encima), `Intro`, `Mapa`, `Nivel` (una instancia por etapa: `Etapa1`..`Etapa4`), `Mini1`..`Mini4`, `CofrePendiente`.

**Cómo están hechos los niveles:**
- Los niveles se diseñan en la tabla `NIVELES`, con una cuadrícula de 40 px y el suelo a y = 600. La cuadrícula de colisión es invisible: lo que se ve es el terreno SVG generado a partir de la misma tabla.
- **Física:** gravedad 1500 y salto de −660 (≈145 px de alto y 4,5 columnas). El doble salto da −580 extra. Planeando la caída se limita a 115 px/s.
- **Ayudas al jugador:**
  - Margen para saltar justo después de salir del borde (`coyote`).
  - Salto memorizado si se toca un instante antes de aterrizar (`buffer`).
  - Las plataformas móviles llevan a Angie a mano: se le suma el desplazamiento de la plataforma.
- **Zonas de contacto altas** (para que cuenten aunque ella pase saltando por encima): páginas del diario, faroles y cofre.

## 6. Cómo probar

```bash
python -m http.server 5173 --bind 127.0.0.1
```

En `.claude/launch.json` está configurado como `juego` en el puerto 5173 (el 8080 está bloqueado en este Windows).

**Atajos de prueba** (detalle en el README):

| Atajo | Qué hace |
|---|---|
| `?reset` | Borra el progreso |
| `?etapa=N` | Abre ese nivel |
| `?escena=Mapa`, `Mini1`..`Mini4`, `Cofre` | Abre esa escena |
| `?auto` | Salta las tarjetas de instrucciones y derrota |
| `?captura` | Sin fundidos (para capturas) |
| `?diario` | Abre la primera página del diario |
| `?caras` | Naipes boca arriba |

**Bot de prueba de niveles:**
- Se usó un bot inyectado por JavaScript que corre a la derecha y salta ante paredes, huecos y obstáculos. Espera las plataformas móviles y deja de avanzar sobre ellas.
- Reemplaza `escena.teclas` por un objeto `{izq, der, arriba, a, d, w, espacio}` con `isDown`.
- Cada nivel debe poder completarlo el bot con 3/3 páginas.
- Si el panel del navegador integrado está oculto, la página se congela: hay que mostrarlo antes de medir.

**Capturas:**
- Se toman con Edge headless: `msedge --headless=new --use-angle=d3d11 --enable-gpu --virtual-time-budget=20000 --window-size=1366,768 --screenshot=... "http://localhost:5173/?etapa=1&captura"`.
- En tamaño celular el headless deja el canvas descentrado: es un artefacto suyo, no del juego.
- Las animaciones con tween no avanzan bien en headless, por eso existe `?captura`.

**Fotos:** aún no hay ninguna; la carpeta `assets/fotos/` solo tiene `LEEME.txt`. Los 404 de fotos en consola son esperados hasta que el usuario las agregue.
