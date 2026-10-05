# Accesibilidad: convenciones de teclado

Esta página fija cómo se opera con teclado cada patrón de interfaz del
producto, para que dos componentes del mismo tipo no se comporten distinto.

Hoy cubre **menús**. Solapas, combobox (`ComboSelect`) y diálogos tienen cada
uno su propio patrón ARIA y todavía no están escritos acá.

## Menús

**Alcance:** cualquier componente con `role="menu"` que se abre desde un botón.
Hoy el único es `components/ui/ActionsMenu.tsx`, el `…` que aparece por fila en
trayectoria y en la tabla de partidos.

Un `role="menu"` promete el patrón ARIA de menú. Si el componente no lo cumple,
la etiqueta miente: un lector de pantalla anuncia un menú y las flechas no
hacen nada.

### Teclas

Con el menú abierto:

| Tecla | Qué hace |
|---|---|
| `↓` | Siguiente opción. Desde la última, vuelve a la primera. |
| `↑` | Opción anterior. Desde la primera, salta a la última. |
| `Home` | Primera opción. |
| `End` | Última opción. |
| `Enter` | Activa la opción enfocada. Lo hace el navegador, sirve para links y botones por igual. |
| `Espacio` | Activa la opción enfocada. Lo suple el menú: la barra no activa un `<a href>`, y las opciones que navegan son links. |
| `Esc` | Cierra el menú y devuelve el foco al disparador. |
| `Tab` | Cierra el menú y deja que el foco siga al siguiente elemento de la página. |

No hay *type-ahead* — escribir una letra para saltar a una opción. El patrón
ARIA lo marca como opcional y los menús de la app tienen dos o tres opciones.

### Foco

1. **Al abrir**, el foco va a la primera opción. Da igual si se abrió con mouse
   o con teclado: así el menú se comporta siempre igual y la primera flecha ya
   mueve.
2. **Mientras está abierto**, el foco siempre está en una opción.
3. **Al cerrar con `Esc`**, vuelve al disparador. Cerrar con teclado no puede
   dejar el foco tirado en el `<body>`.
4. **Al cerrar con `Tab`**, el foco **no** vuelve al disparador: sigue al
   siguiente elemento de la página, que es adonde el usuario lo mandó.
5. **Al cerrar por click afuera**, el foco no se toca: el click ya lo llevó
   adonde el usuario quiso.

### Roles y marcado

| Elemento | Qué lleva |
|---|---|
| Disparador | `<button>` con `aria-haspopup="menu"`, `aria-expanded` y un `aria-label` que nombre el registro |
| Contenedor | `role="menu"` |
| Cada opción | `role="menuitem"` |

El `aria-label` del disparador va completo y nombra el registro — "Acciones de
tu etapa en Platense" — porque "`…`" no le dice nada a un lector de pantalla
cuando hay uno por fila.

**Roving tabindex:** la opción enfocada lleva `tabindex="0"` y el resto
`tabindex="-1"`. Así un solo `Tab` sale del menú en vez de uno por opción, y el
navegador no ofrece como paradas separadas cosas que ya se recorren con
flechas.

### Quién pone los roles

El menú maneja el teclado y el foco. **El `role="menuitem"` lo pone quien
renderiza la opción**, no el menú.

El componente recibe sus hijos como `children` opacos y heterogéneos: un `Link`
de Next, el botón de un `ConfirmDialog`. Que el menú les inyectara el rol por
DOM lo obligaría a adivinar cuál de los nodos de adentro es la opción.

El menú ubica sus opciones buscando `[role="menuitem"]` dentro de su
contenedor. **Una opción sin ese rol queda fuera de la navegación con flechas, y
nada avisa.** Es lo primero que hay que mirar si una opción nueva no responde.

### Diálogos anidados

Si hay un `[role="alertdialog"]` abierto dentro del menú, **el menú no consume
ninguna tecla**: las flechas, `Home`/`End` y `Escape` son del diálogo.

El item "Eliminar" monta su confirmación adentro del propio menú. Si el menú se
cerrara con ese `Escape`, desmontaría el diálogo junto con su disparador y el
foco quedaría en el `<body>`. El segundo `Escape`, ya con el diálogo cerrado,
sí cierra el menú.

El diálogo tampoco devuelve el foco al confirmar, así que el menú puede quedar
abierto con el foco afuera de sus opciones. Desde ahí las flechas entran por el
extremo: `↓` a la primera, `↑` a la última.

### Decisiones del TL

**El menú se hace a mano, no con Radix.** La nota técnica de FUT-113 pedía
evaluar una primitiva de shadcn/ui o Radix *disponible en el proyecto*, y no hay
ninguna: las dependencias son Next, React, Supabase y Zod, y `components/ui/` es
todo escrito a mano. Traer `@radix-ui/react-dropdown-menu` sería una dependencia
nueva para el único desplegable de la app.

**`Tab` cierra el menú en vez de retener el foco.** Es lo que indica el patrón
ARIA de menú: un menú no es un diálogo modal y no atrapa el foco. Combinado con
el roving tabindex, un solo `Tab` sale del menú y sigue por la página.
