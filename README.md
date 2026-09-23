# programas-ia

Páginas de presentación de talleres de IA de N Company, **antes** de la sesión, para que el cliente
las difunda entre los asistentes. Es el complemento de
[herramientas-ia](https://github.com/jfuentesibanez/herramientas-ia), que se entrega **después**.

Cada sesión es una única página HTML autocontenida (imágenes y logos incrustados en base64):
se puede publicar en GitHub Pages, enviar por correo o abrir en local.

## Estructura

```
cliente/sesion/index.html   # la página
cliente/sesion/og.jpg       # imagen 1200×630 para la vista previa al compartir
```

Sesiones:

| Carpeta | Sesión | Estado |
|---|---|---|
| `roche/tarragona/` | Taller de IA · Roche · 22 abr 2025 (ejemplo de partida) | celebrada |
| `roche/barcelona-2026-11/` | Taller de IA · Roche · 23 nov 2026 · ICO, L'Hospitalet · 16:00–19:30 | publicada (código de material pendiente) |

URL una vez publicado: `https://jfuentesibanez.github.io/programas-ia/<cliente>/<sesion>/`

## Qué incluye cada página

- **Hero** con imagen, logo del cliente y, debajo, la cuenta atrás ("Faltan 12 días", "Mañana",
  "En curso", "Sesión celebrada") que se actualiza sola. Título, fecha, horario y lugar.
- **Barra de acciones** fija: descargar `.ics`, abrir en Google Calendar y cómo llegar (Google Maps).
  No hay botón de compartir: son sesiones cerradas a las que invita el cliente.
- **Cinta "Borrador · no difundir"** (`draft: true` en `SESSION`) mientras falten datos por confirmar.
- **Mapa de la sesión**: barra con un tramo por bloque, proporcional a su duración. Al pasar el ratón
  se ilumina el bloque correspondiente y al pulsar se abre y se hace scroll hasta él.
- **Programa** en línea de tiempo, con cada bloque desplegable (resumen, puntos y nombres de las
  herramientas, sin enlaces: el listado con enlaces se entrega después en herramientas-ia).
  Botón "Expandir todo". El día del taller marca en verde el bloque en curso.
- **Antes de venir** (trae tu ordenador, sin experiencia previa), **lugar** y **facilitador**.
- **CTA "Guarda la fecha"** y pie con el logo secundario del cliente y el código de material.
- **Estilos de impresión**: al imprimir o "Guardar como PDF" se abren todos los bloques y se ocultan
  los botones, para seguir teniendo el PDF de siempre si hace falta.

## Crear una nueva sesión

1. Copia la carpeta de una sesión existente: `cp -r roche/tarragona cliente/sesion`.
2. En `index.html`, edita el objeto `SESSION` al principio del `<script>`: título, fecha, horario,
   lugar, facilitador, bloques (hora inicio/fin, tipo `block` o `soft`, resumen, puntos, herramientas)
   y código de referencia. Deja `draft: true` hasta tener todos los datos. Todo lo demás se genera solo.
3. Retematiza con los tokens del bloque `:root` (`--brand`, `--brand-dark`, `--brand-soft`, `--brand-tint`).
4. Sustituye los logos y la imagen del hero (están en base64 en `src="data:..."`):
   logo blanco en el hero, logo secundario en el pie y favicon.
5. Cambia las metaetiquetas `og:*` del `<head>` (título, descripción, URL) y regenera `og.jpg`.
6. Comprueba la página en local y publica.

Los horarios se interpretan en la zona `SESSION.timeZone` (por defecto `Europe/Madrid`), así el
`.ics` y el enlace de Google Calendar salen correctos aunque cambie el horario de verano.
