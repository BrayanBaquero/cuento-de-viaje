# La aventura de Angie

Juego de plataformas 2D para web (celular y PC), hecho con Phaser 3 y JavaScript sin bundlers.
Angie viaja por cuatro paisajes de nuestra historia, consigue cuatro llaves y abre el tesoro final.

- Diseño, decisiones y arte de concepto: [`propuesta/PROPUESTA.md`](propuesta/PROPUESTA.md)
- Contenido personal (nombres, recuerdos, trivia, textos): [`config.js`](config.js)
- Fotos: carpeta `assets/fotos/` (ver `LEEME.txt`). No se suben al repositorio.

## Cómo probarlo

```bash
python -m http.server 5173 --bind 127.0.0.1
```

Abre `http://localhost:5173`. Si agregas `?reset` al final de la dirección, el progreso guardado se borra.

| | Celular | PC |
|---|---|---|
| Moverse | Botones ◀ ▶ | ← → o A D |
| Saltar | Botón de salto | Espacio, W o ↑ |
| Empezar o continuar | Toque | Enter o clic |
| Volver al mapa | Botón de casa | Esc |
| Silencio | Botón de altavoz | M |

### Atajos de prueba (solo para desarrollo)

| Parámetro | Efecto |
|---|---|
| `?reset` | Borra el progreso guardado |
| `?etapa=1..4` | Abre directamente un nivel |
| `?escena=Mapa`, `Mini1`, `Mini2`, `Cofre` | Abre directamente esa escena |
| `?auto` | Salta las tarjetas de instrucciones y de derrota |
| `?captura` | Sin fundidos ni animaciones de entrada (para capturas) |
| `?diario` | Muestra la primera página del diario al entrar a un nivel |
| `?caras` | Naipes de la memoria boca arriba |

## Archivos

| Archivo | Qué contiene |
|---|---|
| `index.html` | Página, fuentes y bloqueo de zoom |
| `config.js` | Todo lo editable |
| `arte.js` | Ilustraciones vectoriales (SVG) generadas por código |
| `game.js` | Escenas, niveles, física, HUD y sonido |

## Flujo de trabajo

Cada fase se desarrolla en una rama `fase-N/...` y se entrega con un Pull Request hacia `main`.
