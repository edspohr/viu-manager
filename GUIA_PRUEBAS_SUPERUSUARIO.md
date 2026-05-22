# Guía de Pruebas — Perfil Superadmin
## VIU Manager · VIU Print

**URL:** https://viu-manager.web.app  
**Versión:** Mayo 2026

---

## Antes de comenzar

Para acceder a esta guía necesitas:

1. Una cuenta de Google o un correo + contraseña con el que te registrarás
2. Que **Edmundo (edmundo@spohr.cl)** te haya asignado el rol **Superadmin** — si ves una pantalla de "Cuenta pendiente", escríbele antes de continuar
3. Acceso a internet y a un navegador moderno (Chrome recomendado)

> **Nota sobre los datos:** La aplicación parte sin órdenes ni clientes. Deberás crearlos tú mismo durante las pruebas. Esto es intencional — valida que el flujo completo funcione desde cero.

---

## Cómo registrarse e iniciar sesión

1. Abre https://viu-manager.web.app
2. Elige una de las dos opciones:
   - **"Continuar con Google"** — usa tu cuenta de Google
   - **Pestaña "Registrarse"** — ingresa nombre, correo y contraseña (mín. 6 caracteres)
3. Una vez creada la cuenta, verás la pantalla **"Cuenta pendiente"**
4. Avisa a Edmundo para que te asigne el rol Superadmin
5. Recarga la página — deberías entrar directamente al panel principal

Para cerrar sesión: haz clic en tu nombre en la esquina inferior izquierda del sidebar → **"Cerrar sesión"**.

---

## Qué puede hacer el Superadmin

El Superadmin tiene acceso completo a todas las funciones de la aplicación. Esta guía te lleva por cada una de ellas en orden lógico.

---

## Módulo 1 — Configuración del catálogo

*Antes de crear órdenes, configura los materiales y precios base.*

### 1.1 Acceder a Configuración
- En el sidebar izquierdo, haz clic en **"Configuración"** (ícono de engranaje)

### 1.2 Pestaña Materiales

El catálogo viene con 9 materiales predeterminados. Verifica que aparecen correctamente y luego:

| Prueba | Pasos | Resultado esperado |
|---|---|---|
| Ver catálogo | Abre la pestaña Materiales | 9 materiales listados (Foam 5MM, Sintra 3MM, etc.) |
| Editar precio | Modifica el Proveedor 1 de cualquier material | El campo acepta el nuevo valor |
| Cambiar proveedor activo | Selecciona "Proveedor 2" o "Promedio" | El precio efectivo se actualiza en tiempo real |
| Agregar material | Haz clic en "Agregar material" al final de la lista | Aparece fila vacía editable |
| Cambiar tipo | En un material nuevo, alterna entre Flexible/Rígido | Solo Rígido muestra campos de dimensiones de plancha |
| Eliminar material | Haz clic en el ícono de papelera de un material nuevo | Desaparece de la lista |
| Guardar | Haz clic en "Guardar cambios" | Toast verde de confirmación |
| Restaurar defaults | Haz clic en "Restaurar Defaults" | Vuelven los valores originales de la pestaña |

### 1.3 Pestaña Clientes

| Prueba | Pasos | Resultado esperado |
|---|---|---|
| Agregar cliente | Haz clic en "Agregar cliente" → completa nombre, tipo, contacto | Aparece en la lista |
| Editar cliente | Modifica el nombre o tipo en línea | Campo editable directo |
| Eliminar cliente | Haz clic en papelera → "Guardar cambios" | Desaparece del catálogo |

### 1.4 Pestaña Terminaciones

- Modifica un multiplicador (ej: sube Troquelado de 1.5 a 1.6)
- Modifica un add-on (ej: sube Ojetillos de $800 a $900)
- Guarda — los cambios se reflejan en los precios de nuevas cotizaciones

### 1.5 Pestaña General

- Modifica el **Margen global** (materiales flexibles) y el **Margen rígido**
- Modifica el **Costo de despacho**
- **Lista de máquinas:** Agrega una máquina nueva escribiendo en el campo → verifica que aparece en el checklist de producción al crear una orden
- Elimina una máquina de la lista

---

## Módulo 2 — Gestión de usuarios

### 2.1 Ver usuarios registrados
1. En el sidebar, haz clic en **"Usuarios"**
2. Verás la lista de todos los usuarios que se han registrado
3. Cada usuario muestra: foto/avatar, nombre, correo, rol actual

### 2.2 Asignar y cambiar roles

| Rol | Para quién es |
|---|---|
| **Superadmin** | Acceso total — puede gestionar usuarios y configuración |
| **Admin** | Crea cotizaciones, mueve órdenes, edita precios, exporta CSV |
| **Operaciones** | Ve el board y calendario, gestiona producción de órdenes asignadas |
| **Cliente** | Ve solo sus propias órdenes (estado y total, sin precios por ítem) |
| **Pendiente** | Sin acceso — en espera de rol |

**Prueba:** Crea una segunda cuenta (en ventana de incógnito) con otro correo → vuelve a tu sesión Superadmin → asígnale el rol Admin → la segunda cuenta debería poder entrar al recargar.

---

## Módulo 3 — Crear una cotización con el AI Cotizador

Este es el módulo central de la aplicación. El objetivo del AI Cotizador es eliminar la transcripción manual: recibes un correo o un archivo del cliente, lo pegas o arrastras, y en segundos tienes una cotización estructurada lista para revisar y convertir en orden.

### 3.1 Con texto libre

1. Haz clic en **"Nueva Cotización"** (botón amarillo en el sidebar)
2. En el área "Solicitud / Correo", pega o escribe un texto como:
   ```
   Necesito 20 carteles de foam de 60x90 cm con ojetillos para la campaña de apertura de Ripley
   ```
3. Haz clic en **"Analizar con Gemini"**

**Qué verificar en el paso "Procesando":**
- Aparece spinner con texto "Extrayendo ítems con IA..."
- Se muestran filas skeleton mientras carga

**Qué verificar en el paso "Revisar":**
- Al menos 1 ítem con dimensiones 60×90 cm, cantidad 20, terminación Ojetillos
- Precio unitario calculado automáticamente (no en cero)
- El campo "Nombre Campaña" tiene un nombre sugerido

---

### 3.2 Detección automática de cliente — cómo funciona y qué puedes hacer

Cuando la IA encuentra un nombre que parece ser un cliente dentro del texto analizado, lo compara contra el catálogo de clientes existente. Aquí puede ocurrir una de dos situaciones:

#### Caso A: El cliente ya existe en el catálogo

El selector de cliente se completa automáticamente. No hay nada más que hacer — puedes continuar con la revisión de la cotización.

#### Caso B: El cliente no existe en el catálogo

Aparece el modal **"Cliente detectado"**. Dice algo como:  
*"Ripley" no existe en el catálogo*

Tienes tres opciones:

**Opción 1 — Crear nuevo cliente**

Úsala cuando el cliente realmente es nuevo para VIU.

1. Haz clic en **"Crear nuevo cliente"**
2. El campo nombre viene prefillado con lo que detectó la IA — puedes editarlo si es necesario
3. Elige el tipo de cliente: **Recurrente**, **Esporádico** o **Complejo**
4. Opcionalmente, agrega un correo o teléfono de contacto
5. Haz clic en **"Crear cliente"**

El cliente queda guardado en el catálogo y queda seleccionado en la cotización actual. No necesitas salir al módulo de configuración.

**Opción 2 — Vincular a cliente existente**

Úsala cuando el cliente ya está en el catálogo pero con un nombre diferente al que escribió el solicitante. Por ejemplo: la IA detectó "Ripley Centro" pero en el catálogo existe solo "Ripley".

1. Haz clic en **"Vincular a cliente existente"**
2. Se muestra un selector con todos los clientes registrados
3. Elige el cliente correcto de la lista
4. Haz clic en **"Vincular"**

La cotización queda asociada al cliente existente. No se crea un duplicado.

**Opción 3 — Continuar sin cambios**

Cierra el modal y deja el campo cliente vacío. Puedes asignarlo manualmente después desde el selector en la pantalla de revisión.

> **Nota práctica:** Este flujo evita duplicar clientes por variaciones de nombre ("Ripley", "Ripley Chile", "Ripley S.A.") y permite construir el catálogo progresivamente desde las mismas cotizaciones, sin trabajo extra.

---

### 3.3 Detección automática de material desconocido — cómo funciona y qué puedes hacer

Cuando la IA extrae un material del texto que no encuentra en el catálogo, interrumpe el flujo con el modal **"Material desconocido"**. Esto ocurre, por ejemplo, si el cliente menciona "Sintra 5mm" y el catálogo solo tiene "Sintra 3MM".

El modal indica el nombre exacto que detectó la IA. Si hay más de un material desconocido en la misma cotización, aparece un badge **"+N más"** — el modal los procesa uno a uno.

Tienes tres opciones:

**Opción 1 — Agregar al catálogo**

Úsala cuando el material es genuinamente nuevo y quieres incorporarlo.

1. Haz clic en **"Agregar al catálogo"**
2. El nombre viene prefillado — edítalo si necesitas ajustar el texto
3. Elige el tipo: **Rígido** o **Flexible** (esto determina cómo se calcula el precio)
4. Haz clic en **"Agregar material"**

El material se crea con precio = $0. Después de terminar la cotización, ve a Configuración → Materiales para ingresar el precio real. Mientras tanto, la cotización puede seguir adelante — el precio del ítem que usa ese material quedará en $0 hasta que lo configures.

**Opción 2 — Mapear a material existente**

Úsala cuando el material ya existe en el catálogo con otro nombre. Es la opción más común: el cliente escribe "foam blanco" y en el catálogo está "Foam 5MM".

1. Haz clic en **"Mapear a material existente"**
2. Se muestra un selector con todos los materiales del catálogo, con su nombre y tipo
3. Elige el equivalente correcto
4. Haz clic en **"Mapear"**

La cotización usa el material existente con su precio ya configurado. El ítem queda correctamente valorizado.

**Opción 3 — Omitir**

Salta este material y lo deja para revisión manual. El ítem queda en la tabla pero el material aparece como no resuelto — puedes editarlo directamente en la tabla antes de crear la orden.

> **Nota práctica:** La primera vez que uses la aplicación con cotizaciones reales, probablemente aparecerán varios materiales desconocidos. Eso es normal — el catálogo se va afinando con el uso. Con el tiempo, las solicitudes de clientes habituales con los materiales ya catalogados pasan directamente a revisión sin interrupciones.

---

### 3.4 Con archivo Excel o CSV

1. Prepara un archivo `.xlsx` o `.csv` con columnas como: Producto, Ancho, Alto, Cantidad
2. En el área de archivos, arrastra el archivo
3. El archivo debe aparecer con ícono verde de hoja de cálculo
4. Haz clic en **"Analizar con Gemini"**
5. **Resultado esperado:** La IA lee el contenido y genera los ítems correspondientes

### 3.5 Con PDF o imagen

- Arrastra un PDF de cotización o una foto de un presupuesto
- La IA interpreta el contenido visual y extrae los ítems
- Los mismos modales de cliente y material desconocido pueden aparecer si la IA detecta elementos nuevos

### 3.6 Editar la cotización antes de crear la orden

En el paso "Revisar" todo es editable. La IA hace una primera pasada razonable, pero el criterio final es tuyo:

| Campo | Cómo editar |
|---|---|
| Descripción | Clic directo en el texto |
| Ancho / Alto | Modifica el número — el precio se recalcula automáticamente |
| Cantidad | Modifica el número — el subtotal se recalcula automáticamente |
| Terminación | Clic en el selector → checkbox con todas las opciones |
| Precio unitario | Editable directamente — se marca en ámbar si fue modificado manualmente |
| Tooltip ⓘ | Pasa el cursor → muestra desglose de cálculo (base cost, multiplicador, addons, planchas) |
| Eliminar ítem | Botón papelera al final de la fila |
| Agregar ítem | "+ Agregar ítem" al pie de la tabla |

> **Validación:** Si cualquier ítem tiene ancho = 0 o alto = 0, el botón "Crear Orden" queda deshabilitado. Debes corregir las medidas antes de continuar.

### 3.7 Crear la orden

1. Verifica: nombre de campaña, fecha de entrega, estado de archivo (Rojo/Amarillo/Verde)
2. Haz clic en **"Crear Orden"**
3. **Resultado esperado:** Toast de confirmación, la orden aparece en la columna "Por Aprobar" del board

---

## Módulo 4 — Kanban Board

### 4.1 Mover órdenes

- Arrastra una orden de una columna a otra
- **Resultado esperado:** La orden se mueve, aparece un toast de confirmación, la tarjeta hace un pequeño rebote al soltar

El flujo de columnas es: **Solicitud → Por Aprobar → En Producción → Despacho → Terminado**

### 4.2 Buscar órdenes

- Escribe en el buscador de la barra superior
- Filtra en tiempo real por nombre de campaña o cliente

### 4.3 Indicadores visuales en las tarjetas

| Visual | Significa |
|---|---|
| Borde izquierdo ámbar | Cliente tiene deuda pendiente |
| Borde dashed ámbar + badge "EXTERNO" | Orden producida por proveedor externo |
| Ícono ✦ (Sparkles) | Orden generada con el AI Cotizador |
| Punto rojo (pulsante) | Archivos pendientes |
| Punto amarillo | Archivos en revisión |
| Punto verde | Archivos aprobados |

---

## Módulo 5 — Detalle de una orden

Haz clic en cualquier tarjeta para abrir el panel. Cierra con la **X** o presionando **Escape**.

### 5.1 Editar precios por ítem

- Haz clic en el campo de precio de cualquier ítem → modifica → presiona Tab o haz clic afuera
- El precio queda guardado y se registra en el historial
- Haz clic en **›** al final de la fila para ver el desglose de cálculo (base cost, multiplicador, addons, planchas)

### 5.2 Sidebar — acciones principales

**Estado de archivo:** Cambia entre Rojo / Amarillo / Verde con los botones del encabezado

**Mover estado:** Botón "Mover a → [siguiente estado]" — avanza la orden al siguiente paso del flujo

**Link de aprobación** (aparece cuando la orden está en "Por Aprobar"):
1. Haz clic en "Copiar link de aprobación"
2. Abre el link en una ventana de incógnito
3. Verifica que muestra: total, fecha de entrega, detalle de ítems (dimensiones + terminaciones, sin precios ni nombres de material)

**Producción externa:**
- Activa el toggle "Externo" → ingresa nombre del proveedor
- Verifica que la tarjeta en el board cambia a borde dashed con badge "EXTERNO"

### 5.3 Checklist de producción

- Asigna una **máquina** del selector (las que configuraste en el Módulo 1)
- Ingresa las **horas de trabajo (HH)**
- Activa **"Turno Extra"** → verifica que aparece el recargo "+25%" y el monto calculado
- Marca y desmarca los 5 ítems del checklist
- La barra de progreso se actualiza en tiempo real

### 5.4 Historial de cambios de la orden

- Al fondo del panel, sección "Historial"
- Debe mostrar los cambios de precio y estado que hayas hecho durante las pruebas
- Formato: valor anterior → nuevo, usuario, fecha y hora

---

## Módulo 6 — Página de aprobación (vista del cliente)

1. Abre una orden en estado "Por Aprobar"
2. Copia el link de aprobación desde el sidebar
3. Abre el link en una **ventana de incógnito** (sin login)

**Qué verificar:**
- [ ] Muestra el total de la orden (solo el total, sin precios por ítem)
- [ ] Muestra fecha de entrega y lista de ítems (dimensiones + terminaciones únicamente)
- [ ] El botón **"Descargar cotización PDF"** abre una vista de impresión con el logo de VIU Print
- [ ] El campo RUN formatea automáticamente mientras escribes (formato XX.XXX.XXX-X)
- [ ] La firma digital funciona: dibuja en el canvas con el mouse
- [ ] El botón "Limpiar firma" borra el canvas
- [ ] Al hacer clic en "Aprobar orden": aparece pantalla verde de confirmación con timestamp
- [ ] Si abres el mismo link nuevamente: muestra directamente "Orden Aprobada"
- [ ] En el panel de detalle del admin: aparece el badge verde "Aprobado — RUN XXXXXXXX-X"

---

## Módulo 7 — Calendario de producción

1. En el sidebar, haz clic en **"Calendario"**
2. Verás una vista semanal — las órdenes aparecen en la columna de su fecha de entrega
3. Navega entre semanas con los botones **‹** y **›**
4. Haz clic en una orden del calendario → se abre el panel de detalle
5. Verifica que las tarjetas muestran: campaña, cliente, dot de estado de archivo, máquina asignada, HH, badge OT si aplica

---

## Módulo 8 — Exportar CSV

1. En el sidebar, haz clic en **"Exportar CSV"**
2. Selecciona un rango de fechas que incluya las órdenes que creaste
3. Haz clic en **"Descargar"**
4. **Resultado esperado:** Se descarga un archivo `.csv`
5. Ábrelo en Excel o Google Sheets — verifica que los caracteres especiales (ñ, tildes) se muestran correctamente
6. Columnas esperadas: ID, Campaña, Cliente, Estado, Total (CLP), Fecha Creación, Fecha Entrega, Aprobación

---

## Módulo 9 — Historial global de cambios

1. En el sidebar, haz clic en **"Historial"**
2. Verás todos los cambios realizados durante tus pruebas
3. **Filtros:** Todos · Precios · Estados
4. **Buscador:** filtra por nombre de orden, campaña o usuario
5. Verifica que los cambios de precio y de estado que hiciste en módulos anteriores aparecen aquí

---

## Resumen de qué registrar durante las pruebas

Por cada módulo, anota:

- ✅ Funciona correctamente
- ⚠️ Funciona con observaciones (describe qué viste)
- ❌ No funciona (describe el error, adjunta captura si puedes)

Envía tu reporte a **edmundo@spohr.cl** al finalizar.

---

*VIU Manager · Uso interno VIU Print · v1.0 Mayo 2026*
