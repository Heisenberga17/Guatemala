# Guatemala · 16–28 nov 2026

Plan del viaje, editable desde el navegador. Todo lo que cambias se guarda solo en una base
de datos Postgres, así que se ve igual desde cualquier teléfono o computadora.

## Cómo se usa

Abre la página y dale a **Editar** abajo del todo:

- Toca cualquier texto para cambiarlo (títulos, descripciones, precios, notas, emojis).
- **×** borra una tarjeta, una reserva, una nota o un día entero. Lo que venía de fábrica se
  puede recuperar con **Restaurar borrados**.
- Pega un enlace en el campo de abajo de cada día para **agregar una tarjeta**. El nombre y el
  emoji salen del enlace; puedes escribir otro nombre si quieres.
- **🔗** cambia el enlace de una tarjeta.
- Toca el tipo (Romántico / Aventura / Relax) o el estado (Falta reservar / Reservado…) para cambiarlos.

Se guarda solo mientras escribes. **Guardar ahora** (o ⌘S) fuerza el guardado y
**Descargar copia** baja un HTML con todo adentro, para tenerlo sin internet.

Si dos personas editan a la vez, la página avisa antes de pisar los cambios del otro y se
refresca sola al volver a la pestaña.

## Estructura

```
public/index.html   la página entera (sin build, sin framework)
api/state.js        GET y PUT del estado del viaje
scripts/schema.sql  las tablas (se crean solas en el primer arranque)
```

## Variables de entorno

| Variable       | Para qué sirve                                                              |
| -------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL` | Postgres (Neon). La pone sola la integración de Vercel.                      |
| `TRIP_ID`      | Opcional. Por defecto `guatemala-2026`. Cambialo para tener varios viajes.    |
| `EDIT_PIN`     | Opcional pero recomendado: sin este PIN nadie puede guardar cambios.          |

Sin `DATABASE_URL` la página sigue funcionando, pero guarda solo en ese navegador.

## Desarrollo

```bash
npm install
vercel link
vercel env pull .env.development.local
npm run dev        # http://localhost:3000
```

## Historial

Cada guardado deja una versión en la tabla `trip_history` (se guardan las últimas 50), por si
hay que volver atrás:

```sql
select rev, created_at from trip_history where trip_id = 'guatemala-2026' order by rev desc;
```
