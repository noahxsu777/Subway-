# Subway x TikTok LIVE

Runner infinito tipo *Subway Surfers* que se conecta a un **TikTok LIVE** usando
la **API de TikTools** ([tik.tools](https://tik.tools)). Cuando los espectadores
envían **regalos**, se disparan **acciones configurables** dentro del juego:
propulsión, aparecer un carro, aparecer un cono, salto/agacharse forzado, imán de
monedas, escudo/invencibilidad y lluvia de obstáculos.

## Cómo funciona

```
TikTok LIVE  ──(tiktok-live-api / tik.tools)──▶  Servidor Node.js
                                                       │  (mapea regalo → acción)
                                                       ▼  Socket.IO
                                                 Navegador (juego Phaser 3 + panel)
```

- **Servidor** (`server/`): Express + Socket.IO. Se conecta a un usuario de
  TikTok LIVE con `tiktok-live-api`, escucha el evento `gift`, busca el mapeo en
  `config/gift-actions.json` y envía la acción al navegador.
- **Juego** (`public/js/game/`): runner de 3 carriles en Phaser 3 (formas
  generadas, sin assets externos).
- **Panel** (`public/js/controlPanel.js`): conectar el usuario de TikTok, editar
  los mapeos regalo→acción y un **simulador** para probar sin estar en directo.

## Instalación

```bash
npm install
cp .env.example .env   # añade tu TIKTOOL_API_KEY (clave gratuita en tik.tools)
npm start
```

Abre <http://localhost:3000>.

> La `TIKTOOL_API_KEY` solo es necesaria para la **conexión real** a un live.
> El **simulador** funciona sin clave.

## Uso

1. **Jugar:** flechas ←/→ para cambiar de carril, ↑ saltar, ↓ agacharse,
   ESPACIO para reiniciar. También funciona con toques/swipes.
2. **Simulador:** pulsa los botones del panel para disparar cada acción.
3. **Mapeos:** asigna un regalo (por nombre) a una acción con parámetros JSON y
   pulsa *Guardar configuración*. Se persiste en `config/gift-actions.json`.
4. **Conexión real:** escribe el `@usuario` de TikTok que esté en directo y pulsa
   *Conectar*. Los regalos reales dispararán sus acciones.

## Acciones disponibles

| Acción | Efecto | Parámetros |
|---|---|---|
| `propulsion` | Boost de velocidad temporal | `duration` (ms), `multiplier` |
| `spawnCar` | Aparece un carro (obstáculo) | `lane` (0-2, o -1 aleatorio) |
| `spawnCone` | Aparece un cono | `lane` |
| `forcedJump` | Fuerza salto o agacharse | `mode` (`jump`/`duck`) |
| `coinMagnet` | Atrae monedas | `duration` (ms) |
| `shield` | Invencibilidad temporal | `duration` (ms) |
| `obstacleRain` | Varios obstáculos a la vez | `count` |

## Notas

- La conexión real depende de la API de TikTools (tier Community gratuito) y de
  que el usuario esté efectivamente en directo.
- Los sprites son formas simples para evitar material con copyright; se pueden
  reemplazar por imágenes reales en `BootScene.js`.
