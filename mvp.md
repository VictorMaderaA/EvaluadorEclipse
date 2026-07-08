# Propuesta general de proyecto: MVP para selección de puntos de observación del eclipse en España

## Objetivo del proyecto

Construir una aplicación MVP centrada en España para ayudar a comparar y priorizar puntos de observación del próximo eclipse mediante una puntuación probabilística basada en previsión meteorológica, nubosidad por capas, geometría solar y contexto de relieve. La aplicación no pretende predecir con exactitud si una nube concreta tapará el Sol, sino estimar qué puntos ofrecen mejor probabilidad relativa de observación en función de la dirección y altura del Sol, junto con el estado previsto de la atmósfera en la franja relevante[1][2].

El sistema debe ser útil en dos fases temporales distintas. En la fase previa, cuando todavía no exista una previsión fiable para el día del eclipse, debe permitir consultar la evolución de los próximos 3 días para entender cómo cambia la calidad esperada de cada punto y validar que el modelo, la interfaz y el ranking son útiles[1]. En la fase de afinado final, conforme se acerque el eclipse, debe permitir fijar manualmente la fecha y hora del evento para evaluar cada punto contra la ventana concreta del eclipse y las previsiones horarias disponibles para ese tramo[3][1].

## Problema que resuelve

Elegir un buen sitio para ver un eclipse no depende solo de estar dentro de la franja correcta. También importa si el horizonte útil está orientado hacia el azimut del Sol, si la altitud solar hace que ciertas capas de nubosidad sean más críticas, y si la previsión local y regional sugiere una atmósfera favorable en el intervalo relevante[3][1][2].

Las aplicaciones existentes suelen resolver bien una parte del problema, pero no necesariamente la combinación práctica que necesita un usuario que quiera comparar una lista de puntos y decidir dónde desplazarse. Algunas herramientas aportan datos del eclipse y meteorología en España, mientras otras ayudan con posición solar, elevación o visualización del relieve, pero el valor del proyecto está en unificarlas en un flujo orientado a la decisión[3][1][4][5][2].

## Alcance funcional del MVP

El MVP debe centrarse en un conjunto de puntos definidos de antemano, no en búsqueda libre total sobre cualquier coordenada. Esta decisión reduce mucho la complejidad técnica, mejora la calidad del ranking y encaja mejor con una implementación acelerada por agente de código en un plazo corto[1][4].

Funcionalidades objetivo para la primera versión:

- Cargar una lista de puntos candidatos en España con nombre, coordenadas, elevación base, notas logísticas y etiqueta de región.
- Consultar previsión meteorológica horaria para cada punto durante los próximos 3 días[1].
- Calcular para cada punto la posición solar, al menos con altitud y azimut, para cada instante evaluado[2].
- Obtener o enriquecer la elevación del punto mediante API de elevación y usar ese dato en el análisis[4].
- Calcular una puntuación general de observación por punto.
- Mostrar ranking de puntos con explicación resumida del score.
- Permitir fijar manualmente una fecha y hora objetivo, especialmente pensando en el día del eclipse.
- Mostrar evolución temporal de la puntuación de cada punto para detectar tendencias.
- Incluir una vista de mapa 2D con capas básicas y marcadores por score.

Fuera de alcance para el MVP inicial:

- Predicción exacta de obstrucción por nube individual.
- Modelado detallado de edificios, árboles u obstáculos urbanos.
- Simulación óptica avanzada del disco solar.
- 3D complejo con análisis de skyline en tiempo real.
- Cobertura global fuera de España.

## Enfoque de producto

La propuesta debe presentarse como un sistema de **ranking probabilístico de observación**, no como un veredicto binario. Esa formulación es importante porque los modelos meteorológicos ofrecen información muy útil para comparar alternativas, pero no garantizan el comportamiento exacto de la nubosidad a escala visual fina[1][6].

El producto tiene sentido si responde bien a preguntas del tipo: “¿qué punto tiene mejor pinta hoy o mañana?”, “¿cómo ha cambiado el ranking en las últimas actualizaciones?”, y “para la hora exacta del eclipse, qué puntos mantienen mejor probabilidad relativa de visión despejada?”[1][2].

## Modelo conceptual de estimación

La idea central consiste en transformar la geometría de observación en una evaluación meteorológica dirigida. En vez de limitarse a leer la nubosidad total del punto, el sistema debe usar el azimut y la altitud del Sol para definir un corredor de observación aproximado hacia la zona del cielo donde estará el eclipse[2].

Sobre esa base, el score puede considerar varios elementos:

- Nubosidad total del punto.
- Nubosidad baja, media y alta del punto[1].
- Muestreo meteorológico en varios puntos del corredor alineado con el azimut solar.
- Penalización adicional cuando la altitud solar sea baja, porque en esa situación las nubes bajas y la atmósfera cercana al horizonte tienden a afectar más a la observación[2].
- Elevación del punto y, si se implementa, un indicador simple de horizonte orográfico despejado mediante relieve[4][5].
- Grado de acuerdo entre modelos o entre forecast principal y ensemble mean, cuando sea posible[6].

Este enfoque permite producir una puntuación explicable: no “verás el eclipse”, sino “este punto tiene mejor probabilidad relativa porque la dirección del Sol está menos penalizada por nubosidad prevista y el relieve es más favorable”[1][2].

## Evolución temporal en los próximos 3 días

Mientras no exista una previsión útil para la fecha real del eclipse, la aplicación puede aportar valor mostrando cómo evoluciona el ranking en una ventana corta, por ejemplo los próximos 3 días. Open-Meteo ofrece previsiones horarias adecuadas para este tipo de análisis y puede alimentar una vista temporal por punto o por región[1].

Esto sirve para validar varias cosas a la vez:

- Si el score responde de forma coherente a cambios horarios.
- Si ciertos puntos muestran patrones sistemáticamente mejores o peores.
- Si la interfaz permite comparar tendencias y no solo instantáneas.
- Si la lógica de explicabilidad del ranking resulta comprensible para el usuario final.

En esta etapa la aplicación no está diciendo nada definitivo del eclipse real; está validando el comportamiento del motor de scoring, del mapa y del ranking usando datos frescos y comparables.

## Modo de afinado para el día del eclipse

Conforme se acerque la fecha del eclipse, la aplicación debe activar un modo más orientado al evento. En ese modo, el usuario podrá fijar manualmente la fecha y hora objetivo del eclipse para que toda la evaluación se recalcule respecto a ese instante y a su franja horaria asociada[3][1].

Ese modo debe permitir al menos:

- Fijar fecha y hora objetivo.
- Definir una ventana de análisis, por ejemplo desde 60 minutos antes hasta 15 minutos después.
- Recalcular azimut y altitud solar exactos para ese momento[2].
- Leer la previsión horaria más cercana disponible para cada punto[1].
- Reordenar automáticamente el ranking según el score específico del evento.
- Comparar cómo cambia el ranking entre distintas actualizaciones del forecast.

Este modo será el que convierta la herramienta en una ayuda operativa real cuando queden pocos días para decidir desplazamiento, alojamiento o plan alternativo.

## Fuentes de datos recomendadas

### Meteorología y nubosidad

Open-Meteo es una base muy adecuada para el MVP porque ofrece forecast horario, múltiples modelos y variables de nubosidad de forma pública y relativamente directa de integrar[1][7]. También dispone de variantes por modelo y ensemble mean, lo que puede ser útil para añadir una capa de robustez o confianza al score[8][9][6].

Variables de interés inicial:

- `cloud_cover`
- `cloud_cover_low`
- `cloud_cover_mid`
- `cloud_cover_high`
- `visibility` si está disponible para el modelo seleccionado
- `relative_humidity_2m` o variables auxiliares, si se comprueba que mejoran la heurística[1]

### Elevación

La Elevation API de Open-Meteo encaja bien para enriquecer los puntos sin aumentar mucho la complejidad del MVP. Permite obtener elevación para coordenadas concretas y es suficiente para una primera versión del score[4].

### Posición solar

SunCalc es una librería pequeña y suficiente para calcular altitud y azimut solar para una coordenada y un instante dados. Para el MVP no parece necesario ir a soluciones astronómicas más complejas[2].

### Relieve y visualización opcional

Si se quiere enriquecer la experiencia visual, Mapbox Terrain-RGB ofrece una base razonable para datos de elevación y visualización de relieve. Sin embargo, esta parte debería tratarse como opcional o de fase 2 salvo que se confirme que aporta mucho valor al ranking del MVP[5][10].

## Propuesta de scoring v1

El scoring debe ser simple, explicable y fácil de recalibrar. No conviene empezar con un modelo excesivamente sofisticado; es mejor una primera versión con pocos componentes bien entendidos y pesos ajustables.

Una propuesta inicial:

1. Score meteorológico base del punto.
2. Penalización o bonificación por nubosidad por capas.
3. Ajuste por dirección solar usando puntos muestreados en el corredor hacia el Sol.
4. Ajuste por altitud solar, dando más peso a nubes bajas cuando el Sol esté más cerca del horizonte[1][2].
5. Ajuste por elevación o relieve simple[4].
6. Ajuste por confianza del modelo, si se añade ensemble mean[6].

Ejemplo conceptual de pesos iniciales:

| Componente | Peso inicial orientativo | Motivo |
|---|---:|---|
| Nubosidad del punto | 35% | Señal base rápida de calidad local[1] |
| Nubosidad por capas | 25% | Mejora la lectura respecto al total[1] |
| Corredor hacia el Sol | 25% | Introduce direccionalidad real[2] |
| Relieve/elevación | 10% | Añade contexto físico básico[4] |
| Confianza del modelo | 5% | Útil si hay ensemble o contraste de modelos[6] |

La fórmula exacta no debe cerrarse en esta propuesta. El objetivo de la primera iteración es que el agente de código implemente una versión parametrizable y que el calibrado se haga con datos reales de uso y revisión manual.

## UX propuesta para el MVP

La experiencia debe estar orientada a comparar puntos con rapidez. No hace falta una interfaz muy compleja; lo importante es que el usuario pueda pasar de un mapa general a un ranking entendible y, desde ahí, al detalle de cada punto.

Pantallas o bloques principales recomendados:

- **Mapa general** con puntos coloreados por score.
- **Ranking lateral o inferior** con orden automático de mejor a peor.
- **Ficha de punto** con score, evolución temporal y explicación del resultado.
- **Selector temporal** con modos “próximas 72 horas” y “fecha/hora fija”.
- **Panel de configuración** para fijar la hora del eclipse cuando llegue el momento.

Elementos de explicación visibles por punto:

- Score total.
- Tendencia frente a horas anteriores.
- Nubosidad total.
- Nubosidad baja/media/alta.
- Azimut y altitud solar en el instante analizado[2].
- Indicador simple de confianza del forecast, si se implementa.
- Motivo resumido del ranking, por ejemplo: “mejor equilibrio entre nubosidad baja y dirección solar”.

## Enfoque geográfico para España

La propuesta debe optimizarse específicamente para España y para el próximo eclipse, no como plataforma genérica global desde el principio. Eso permite simplificar datos, UX y decisiones de producto.

Recomendaciones concretas para el enfoque España:

- Empezar con regiones claramente relevantes para observación del eclipse.
- Definir puntos candidatos curados manualmente, con preferencia por lugares altos o con horizonte despejado.
- Añadir metadatos prácticos por punto, como acceso, dificultad, aparcamiento o notas logísticas, aunque no entren en el score principal.
- Preparar el sistema para trabajar con la fecha y la hora del eclipse en España cuando se active el modo de afinado[3].

Este recorte geográfico mejora la calidad del MVP y reduce mucho el tiempo de implementación.

## Arquitectura técnica sugerida

Para una primera entrega rápida, la arquitectura debería ser sencilla y con mínima dependencia operativa.

Propuesta razonable:

- Frontend web con mapa interactivo.
- Capa de servicios ligera para consumir APIs públicas y normalizar respuestas.
- Motor de scoring desacoplado, testeable y configurable.
- Dataset versionado de puntos candidatos en JSON o similar.
- Cache temporal en memoria o estrategia de refresco simple para evitar llamadas redundantes.

A nivel de componentes lógicos:

- `points-catalog`: catálogo de puntos definidos.
- `forecast-provider`: integración con Open-Meteo[1].
- `solar-engine`: cálculo de azimut y altitud solar con SunCalc[2].
- `elevation-provider`: enriquecimiento de elevación[4].
- `score-engine`: cálculo del ranking.
- `timeline-view`: evolución de score por hora.
- `map-view`: capa visual de puntos.

## Riesgos y decisiones importantes

### Riesgo de sobrepromesa

El principal riesgo es comunicar el sistema como si pudiera saber con precisión si el Sol quedará visible desde un punto concreto. El producto debe insistir en que ofrece una comparación probabilística entre puntos, basada en modelos y heurísticas, no una garantía[1][6].

### Riesgo de complejidad excesiva

Si se intenta añadir desde el principio relieve 3D, skyline, edificios, routing, capas complejas y múltiples modelos simultáneos, es fácil que el MVP se diluya. La primera meta debe ser ranking útil y explicable; el resto son mejoras posteriores[5].

### Riesgo de scoring opaco

Si el score final no se puede explicar con una frase simple, será difícil confiar en él. Por eso es mejor empezar con pocos factores y mostrar siempre los componentes principales del resultado[1][2].

## Fases de desarrollo recomendadas

La propuesta no desglosa todavía los issues exactos de implementación, pero sí deja claro un orden natural para convertir el proyecto en entregables pequeños y verificables.

### Fase 0: validación funcional del enfoque

- Confirmar conjunto inicial de puntos en España.
- Probar manualmente consultas de forecast, elevación y cálculo solar.
- Validar que los datos necesarios existen y se alinean bien temporalmente[1][4][2].

### Fase 1: motor base del MVP

- Ingesta de puntos.
- Integración meteorológica.
- Integración de elevación.
- Cálculo solar.
- Score base parametrizable.
- Ranking simple.

### Fase 2: interfaz operativa

- Mapa con marcadores.
- Lista/ranking.
- Detalle por punto.
- Selector de horizonte temporal de 72 horas.
- Explicación del score.

### Fase 3: modo eclipse

- Fecha/hora fija.
- Ventana horaria configurable.
- Recalculo orientado al evento.
- Comparativa entre actualizaciones del forecast.

### Fase 4: refinado y mejoras

- Ensemble/confianza.
- Corredor direccional más afinado.
- Relieve opcional o visualización 3D.
- Ajuste fino de pesos y heurísticas.

## Qué debería salir de esta propuesta

Tras revisar esta propuesta, el siguiente paso lógico es convertirla en varios issues muy concretos orientados al MVP. Cada issue debería reabrir un análisis más profundo sobre su parte correspondiente antes de implementarse, para reducir dudas y afinar alcance, edge cases y decisiones técnicas.

Los primeros issues probablemente deberían cubrir:

- Definición del catálogo inicial de puntos.
- Diseño del contrato interno de datos del forecast.
- Implementación del motor de scoring v1.
- Vista de ranking y detalle.
- Modo temporal de 72 horas.
- Modo fecha/hora fija para el eclipse.
- Estrategia de explicabilidad del score.

## Criterios de éxito del MVP

El MVP puede considerarse exitoso si cumple estas condiciones:

- Permite comparar varios puntos españoles de forma clara.
- Ofrece una puntuación coherente y relativamente estable ante cambios razonables del forecast[1].
- Muestra evolución temporal útil en la ventana de próximos 3 días[1].
- Puede fijar una fecha y hora objetivo para el modo eclipse[3][2].
- Explica por qué un punto queda mejor rankeado que otro.
- Es lo bastante simple como para que un agente de código pueda iterar sobre él en ciclos cortos.

## Conclusión

La idea es sólida para un MVP si se enfoca como un sistema español de ranking probabilístico de puntos de observación, apoyado en APIs públicas y una lógica de scoring explicable. Open-Meteo, SunCalc y una capa básica de elevación cubren gran parte del valor inicial sin necesidad de entrar desde el inicio en modelados demasiado complejos[1][4][2].

La mejor estrategia es construir primero una versión muy clara y operativa que compare puntos, muestre evolución de los próximos 3 días y permita activar más adelante un modo específico para la fecha y hora del eclipse. A partir de ahí, la definición de issues concretos y reanálisis por fases permitirá afinar el MVP con bajo riesgo y buena velocidad de entrega[3][1][6].
