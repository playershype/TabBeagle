# TabBeagle — auditoría del sistema, 2026-10-13

Estado: registro de auditoría. No es certificación de seguridad ni de producción. Todo lo marcado como "reportado" viene del dueño del producto y no fue verificado por el asistente.

Alcance: repositorio (`codex/android-splash-v01`, HEAD `f7d5bb4`), documentación de M1, workflows de GitHub Actions, base de datos TEST (`gaileljkciseopfgwsbc`, solo lectura), advisors de Supabase TEST. No se tocó producción, no se cambió configuración de Supabase, no se publicó nada.

## 1. Resumen

- Repositorio limpio y sincronizado con `origin`.
- CI reciente en verde: APK (`build-splash-apk.yml`, ejecución #9 sobre `c5cb9db`), deploy a Railway TEST y chequeos de perfil de cliente.
- Ningún secreto ni `service_role` en el código. `.env*` ignorado; solo `.env.example` versionado.
- Las únicas menciones al proyecto de producción son pruebas negativas que verifican que la app lo rechace.
- Base TEST: la factura T-01 existe una sola vez, con una fila en `ar_cases` y un evento de auditoría que la referencia.
- Riesgos abiertos antes de producción: 7 funciones `SECURITY DEFINER` ejecutables por usuarios autenticados, 35 advisories npm en Android (22 altas), protección de contraseñas filtradas desactivada, redirect de auth no verificado, y documentación desalineada (Expo 51 vs 54).

## 2. Hallazgos por prioridad

### Alta

**H1. Funciones `SECURITY DEFINER` ejecutables por `authenticated`** (advisor Supabase, WARN, 7 hallazgos):
`archive_customer`, `create_customer`, `create_customer_profile`, `create_invoice`, `create_organization`, `is_organization_member`, `update_customer_profile`.
Riesgo: si alguna no valida internamente `auth.uid()` y pertenencia a la organización, un usuario podría operar sobre otra organización.
Acción: revisar el cuerpo de cada función; confirmar que validan membresía; revocar `EXECUTE` a `anon`/`authenticated` donde no sea necesario. Probar con dos cuentas de organizaciones distintas antes de cambiar nada. Requiere decisión del dueño antes de tocar la base, aunque sea TEST.

**H2. Protección contra contraseñas filtradas desactivada** (advisor, WARN). Ya estaba abierta. Está en el plan gratuito. Decisión pendiente: aceptar el riesgo en TEST y documentarlo, o activarla al pasar a un plan de pago.

**H3. Vulnerabilidades npm en Android: 35 abiertas** (22 altas, 13 moderadas, 0 críticas). Según el manifiesto RC1, solo PostCSS fue corregido. Bloquea producción hasta que se remedie o se acepte formalmente.

**H4. Redirect de auth no verificado.** El esquema `tabbeaglerc01://auth/callback` debe estar en la lista de redirects permitidos de Supabase TEST. Sin eso, el enlace de reset o de magic link no completa el flujo. Ya hubo una página en blanco reportada el 2026-10-12. Requiere que el dueño revise el panel de Supabase TEST; no se cambia desde el asistente.

### Media

**M1. Documentación desalineada.** `docs/development/MILESTONE-1.md` dice Expo 51 / RN 0.74.5. El código usa Expo ~54, RN 0.81.5, React 19.1. Hay que reconciliar la documentación con el código.

**M2. Límite de correos de Supabase.** El correo de reset devolvió "temporarily limited" por los intentos repetidos. Opción para TEST: SMTP propio (por ejemplo Resend, plan gratuito). Requiere cuenta del dueño.

**M3. Workflows de laboratorio.** Hay 13 workflows `m1-*` y varios `*-lab`, algunos con acceso a Supabase en vivo (`m1-live-auth-readonly`, `m1-two-users-live-https`). No verifiqué qué secretos usan ni a qué proyecto apuntan. Pendiente revisar que ninguno use credenciales de producción.

**M4. Prueba de auditoría de creación pendiente.** El evento de auditoría de T-01 existe, pero no se confirmó que sea `INVOICE_CREATED` (o su equivalente).

**M5. Expiración de la prueba de Railway.** Último reporte: ~26 días o $4.87 de crédito. Verificar la fecha exacta en el panel y decidir plan antes de que expire. Ningún plan pagado sin aprobación.

### Baja

**B1. Archivos binarios versionados en la raíz:** `tabbeagle-mobile.zip`, `tabbeagle-mobile-wip.zip` y `TabBeagle-V0.1-Android-SOURCE-1` (contenido: "NEW VERSION"). El README dice que se conservan como procedencia. Decidir si se mueven a un directorio de archivo.

**B2. Evidencia de M1 incompleta:** falta captura de arranque en frío (punto 2) y de la factura tras reabrir (punto 5). Recomendado, no bloqueante si el dueño acepta el registro reportado.

**B3. Documentos legales en borrador** (privacidad y términos). No publicar sin revisión de abogado en EE. UU.

**B4. `early_access_leads` con RLS activado y sin políticas** (advisor INFO). Es la tabla de leads en el proyecto TEST, que el dueño decidió combinar con la de pruebas. Confirmar que el comportamiento sin políticas es intencional.

## 3. Verificado en esta auditoría

| Control | Resultado |
|---|---|
| Árbol de trabajo | Limpio, sincronizado con `origin/codex/android-splash-v01` |
| Último APK verde | Ejecución #9, `c5cb9db`, éxito |
| Último deploy Railway | Éxito (2026-10-12 18:23 UTC) |
| Chequeos de perfil de cliente | Éxito |
| Referencias a producción `kbidusxzzuwmxsukqvpm` | Solo pruebas negativas (`non-TEST`) |
| Secretos en el repositorio | Ninguno encontrado (búsqueda de `service_role`, claves `sk_`, JWT) |
| Archivos `.apk`, `.aab`, `.jks`, `.keystore` versionados | Ninguno (excluidos en `.gitignore`) |
| T-01 en TEST | 1 factura, 1 `ar_cases`, 1 evento de auditoría que la referencia |
| Pruebas de backend | 12/12 reportadas por el manifiesto; CI reciente en verde |

No verificado en esta auditoría: que el hash del APK coincida con el artefacto (el dueño lo reportó), resultados de las pruebas de móvil en local (el entorno no tiene `tsx`), y el contenido de los logs de Supabase.

## 4. Decisiones que necesitan al dueño

1. ¿Aprobar la revisión y revocación de las 7 funciones `SECURITY DEFINER` (H1)?
2. ¿Aceptar la contraseña filtrada sin protección en TEST, o planear el plan de pago (H2)?
3. ¿Mantener T-01 en el texto del gate o cambiar a TEST-001 (punto 4 de M1)?
4. ¿Aprobar SMTP propio para TEST (M2)?
5. ¿Plan de Railway antes de que expire la prueba (M5)?
6. ¿Dónde se archivan los zips de la raíz (B1)?

## 5. Cola de trabajo, en orden

1. Cerrar M1: verificar redirect de Supabase TEST (H4), repetir la prueba de reset con el APK nuevo, confirmar el evento de auditoría de creación (M4).
2. Revisar H1 con dos cuentas de prueba, sin tocar producción.
3. Auditar workflows `m1-*` y `*-lab` (M3).
4. Reconciliar documentación Expo (M1) y remediar o aceptar las 35 advisories (H3). Esto es un milestone aparte.
5. Decidir M2 (SMTP) y M5 (Railway).
6. Definir alcance de M2 después de cerrar M1.

## 6. Etapa recurrente: auditoría de sistema

Se ejecuta antes de cerrar cada milestone y cada dos semanas mientras el proyecto esté en TEST.

Checklist:
- Estado del repositorio y ramas; archivos binarios o secretos nuevos.
- Últimas ejecuciones de CI y de deploy; fallas repetidas.
- Advisors de seguridad y rendimiento de Supabase TEST (solo lectura).
- Búsqueda de referencias al proyecto de producción fuera de pruebas negativas.
- Búsqueda de secretos y `service_role` en código y documentación.
- Desalineaciones entre documentación y código (versiones, endpoints, gates).
- Evidencia de cada punto de gate: registrado, reportado o pendiente. Nunca marcar como verificado algo que no se verificó.
- Decisiones nuevas a registrar en el log.

Salida: esta misma carpeta, un archivo nuevo por fecha, y actualización de la cola de trabajo.
