
# Indicador de progreso visual durante el análisis de imagen

## Resumen
Reemplazar el simple spinner "Analizando imagen..." por un indicador de progreso con pasos y animaciones que muestre al usuario las etapas del proceso.

## Cambios

### Archivo: `src/pages/ReservacionDesdeImagen.tsx`

**1. Agregar estado para rastrear la etapa actual del proceso**

Nuevo estado `processingStep` con valores del 0 al 3 que avanza automáticamente con timers durante `processImage`:

| Paso | Texto | Tiempo aprox. |
|------|-------|---------------|
| 0 | Comprimiendo imagen... | 0-2s |
| 1 | Enviando al servidor... | 2-4s |
| 2 | Analizando con IA... | 4-15s |
| 3 | Extrayendo datos... | 15s+ |

**2. Reemplazar el botón con spinner por un panel de progreso**

Cuando `isProcessing` es `true`, en lugar del botón con `Loader2`, mostrar:
- Una barra de progreso animada (componente `Progress` ya existente) que avanza según el paso actual (25%, 50%, 75%, 90%)
- El nombre del paso actual con un icono animado
- Los pasos completados con checkmarks verdes
- Texto informativo: "Esto puede tomar unos segundos"

**3. Actualizar `processImage` para cambiar el paso en cada etapa**

```
processImage:
  setProcessingStep(0)  --> "Comprimiendo imagen..."
  await compressImage(...)
  setProcessingStep(1)  --> "Enviando al servidor..."
  supabase.functions.invoke(...)
  setProcessingStep(2)  --> "Analizando con IA..." (se mueve a 3 tras unos segundos)
  ... resultado recibido
  setProcessingStep(null)
```

## Detalles Técnicos

- Se reutiliza el componente `Progress` de `@/components/ui/progress` ya existente en el proyecto
- Los pasos se definen como un array constante fuera del componente
- Se usa `useEffect` para avanzar automáticamente del paso 2 al 3 tras 8 segundos (simula progreso durante la espera de IA)
- Al completar o fallar, se resetea `processingStep` a `null`
- Las animaciones usan las clases `animate-fade-in` ya definidas en Tailwind
