# NestJS Starter Template

Template de backend NestJS con infraestructura reusable lista para arrancar.

Arrancá un proyecto nuevo sin perder tiempo configurando lo de siempre:
validación de envs, errores estructurados, trazabilidad con request ID,
cliente HTTP con timeout, health check, graceful shutdown.

## Features

| Feature | Qué resuelve |
|---------|-------------|
| **Config validation** | Variables de entorno validadas al arrancar con `class-validator`. Si falta algo, el server ni arranca — error claro en consola. |
| **AppConfigService** | Acceso tipado a `process.env`. Una sola fuente de verdad, adiós `config.get('X')` disperso. |
| **AppError + ErrorCodes** | Errores con código único (`HTTP_003`, `AUTH_001`). Rastreables en logs, fáciles de buscar. |
| **AppErrorFilter** | Exception filter global. Captura todo (AppError, HttpException, errores inesperados) y devuelve JSON consistente. Incluye `requestId`. |
| **RequestIdMiddleware** | UUID de 8 chars por request. Se propaga a logs (via `AppLogger`) y respuestas HTTP (header `X-Request-Id`). |
| **AppLogger** | Extiende `Logger` de NestJS. Prefija cada mensaje con el request ID automáticamente. |
| **HttpClientService** | Wrapper sobre `fetch` con timeout configurable, errores mapeados a `AppError`, retry-ready. |
| **HealthController** | `GET /api/health` — status, timestamp, uptime. |
| **Graceful shutdown** | `app.enableShutdownHooks()` activo. |
| **ValidationPipe global** | `whitelist: true`, `transform: true`. |
| **Global API prefix** | Todas las rutas cuelgan de `/api/*`, que es el contrato que espera el proxy del front. |
| **FileLogger** | Log a consola y, opcionalmente, a archivo (`LOG_LEVEL`, `LOG_DIR`, `LOG_FILE`, `LOG_TO_FILE`). |
| **Static front serving** | Sirve el front compilado desde `www/` solo si la carpeta existe (fallback SPA). |
| **CLI scaffold** | Comandos sin abrir puerto, reutilizando providers y DTOs de la API. |
| **Swagger (opt-in)** | Documentación en `/api/docs`, apagada salvo `SWAGGER_ENABLED=true`. |

## Stack

- **Runtime:** Node 20+
- **Framework:** NestJS 11
- **Lenguaje:** TypeScript 5.7 (strict)
- **Validación:** `class-validator` + `class-transformer`
- **Testing:** Jest
- **Linting:** ESLint + Prettier
- **Package manager:** pnpm

## Arrancar

```bash
pnpm install
cp .env.template .env     # completá tus variables
pnpm start:dev            # http://localhost:3000
pnpm test                 # tests unitarios
pnpm test:e2e             # tests end-to-end
```

## Transversal features

### Global API prefix

Todas las rutas cuelgan de `/api`:

```
GET /api/health
```

El prefijo se fija con `app.setGlobalPrefix('api')` en `main.ts`. Es el contrato
de la API: sin él, el proxy del front (que manda `/api/*`) no encuentra nada.

### FileLogger

`FileLogger` (`src/logging/file-logger.service.ts`) escribe a consola siempre y,
cuando corresponde, duplica cada línea en un archivo. Se instala como logger
global de Nest con `app.useLogger(...)` y no delega en el `Logger` de Nest para
no reentrar en sí mismo.

Variables:

| Variable | Default | Efecto |
|---|---|---|
| `LOG_LEVEL` | `log` | Nivel mínimo: `verbose`, `debug`, `log`, `warn`, `error`, `fatal`. Un valor ausente o inválido cae a `log` (un error de tipeo no debe silenciar los logs). |
| `LOG_DIR` | directorio de trabajo | Carpeta del archivo. Acepta ruta absoluta o relativa (se resuelve contra el directorio de trabajo). |
| `LOG_FILE` | `app.log` | Nombre del archivo dentro de `LOG_DIR`. |
| `LOG_TO_FILE` | — | Solo desarrollo. Con `true` fuerza el archivo; sin la variable, el log va únicamente a consola. |

Detalles deliberados:

- La línea de arranque (`banner()`) **ignora** `LOG_LEVEL`: es la señal de vida
  del proceso. Con `LOG_LEVEL=warn` igual se ve que la app arrancó.
- La línea de destino (`logDestination`) dice dónde quedó el archivo y por qué.
- Un fallo de escritura avisa una sola vez y nunca interrumpe la aplicación.
- La escritura es sincrónica: el volumen es bajo y así no se pierden líneas si
  el proceso termina de forma abrupta.

```bash
LOG_TO_FILE=true pnpm start:dev     # además de consola, escribe app.log
LOG_LEVEL=warn pnpm start:dev       # silencia log/debug, la línea de arranque se ve
```

### Static front serving

Si existe una carpeta `www` al lado de `dist`, `app.module.ts` registra
`ServeStaticModule` para servirla:

- `rootPath`: `join(__dirname, '..', 'www')`, que resuelve tanto a la raíz `www/`
  del template suelto como a `back/www` en un monorepo.
- `exclude: ['/api/{*path}']`: las rutas de API no pasan por el front.
- `renderPath: '/{*path}'`: fallback SPA — toda ruta no-API devuelve el `index.html`.

El registro es **condicional** a que `www` exista: un back sin front no finge
que sirve algo. Sin la carpeta, el back arranca igual y `/` responde 404.

### CLI scaffold

Con argumentos, `main.ts` no levanta HTTP: crea un contexto de aplicación
(`NestFactory.createApplicationContext`) y despacha el comando.

```bash
node dist/main --help            # lista los comandos y sale
node dist/main example --name=Ana
```

- El registro de comandos está en `src/cli/cli-runner.ts`.
- Un comando implementa `CliCommand` (`src/cli/cli-command.ts`) y recibe el
  contexto de aplicación ya inicializado, así resuelve los mismos providers que
  la API.
- El comando de ejemplo (`src/cli/commands/example.cli.ts`) es un **placeholder**:
  valida su entrada con un DTO real de `class-validator`, para demostrar que el
  CLI reutiliza las reglas de la API en vez de reimplementarlas.
- Un comando desconocido sale con error y tampoco levanta el servidor.

### Swagger (opt-in)

```bash
SWAGGER_ENABLED=true pnpm start:dev   # /api/docs
```

Swagger se monta en `/api/docs` **solo** si `SWAGGER_ENABLED` es exactamente
`true`. Apagado por defecto.

## Tooling

### VSCode — formato al guardar

El archivo `.vscode/settings.json` configura:

- `editor.formatOnSave: true`
- `source.fixAll.eslint` al guardar
- ESLint como formateador por defecto para TypeScript y JavaScript

Esto funciona si tenés el plugin [dbaeumer.vscode-eslint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) instalado.

### Husky + lint-staged — calidad automática en cada commit

Al hacer `git commit`:

1. **Husky** dispara el hook `pre-commit`
2. **lint-staged** corre ESLint --fix + Prettier --write solo sobre los archivos staged

Esto asegura que todo lo que commitea ya pasó por el formateador y el linter.
Se configura automáticamente al ejecutar `pnpm install` (vía el script `prepare`).

```bash
git commit -m "feat: algo"
# → antes del commit, lint-staged corrige y formatea los archivos staged
```

## Estructura

```
src/
├── app.module.ts              # Módulo raíz — conectá acá tus módulos
├── main.ts                    # Bootstrap: ValidationPipe, prefijo /api, Swagger, CLI
├── cli/
│   ├── cli-command.ts         # Contrato de un comando
│   ├── cli-runner.ts          # Registro + despacho + ayuda
│   └── commands/
│       ├── example.cli.ts     # Comando de ejemplo (placeholder)
│       └── example-command.dto.ts  # DTO de entrada del ejemplo
├── common/
│   ├── errors/
│   │   ├── app-error.ts       # Error estructurado con código + statusCode + details
│   │   ├── app-error.filter.ts# Filtro global, respuesta JSON consistente
│   │   └── error-codes.ts     # Códigos únicos por módulo
│   ├── http/
│   │   ├── http-client.module.ts
│   │   └── http-client.service.ts  # fetch con timeout y errores tipados
│   └── logger/
│       ├── app-logger.service.ts   # Logger con request ID automático
│       ├── request-context.ts      # AsyncLocalStorage para el request ID
│       └── request-id.middleware.ts# Middleware que genera y propaga el request ID
├── config/
│   ├── app-config.module.ts
│   ├── app-config.service.ts  # Propiedades tipadas para cada env var
│   ├── env.config.ts          # Schema + validación
│   └── log-levels.const.ts    # Niveles de log válidos
├── logging/
│   └── file-logger.service.ts # Log a consola y archivo (LOG_LEVEL/LOG_DIR/...)
└── health/
    ├── health.controller.ts   # GET /api/health
    └── health.module.ts
```

## Cómo usarlo

### 1. Configurá tus variables de entorno

1. Agregá las variables a `src/config/env.config.ts` en la clase `EnvironmentVariables`:

```typescript
export class EnvironmentVariables {
  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  DATABASE_URL!: string;          // → si falta, error al arrancar

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'log';      // → opcional, con default
}
```

2. Agregá los getters tipados en `AppConfigService`:

```typescript
get databaseUrl(): string {
  return this.configService.get<string>('DATABASE_URL')!;
}
```

3. Copiá `.env.template` a `.env` y completá los valores.

### 2. Agregá tus módulos de dominio

```typescript
// app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ ... }),
    AppConfigModule,
    HealthModule,
    UsersModule,       // ← tu módulo
    OrdersModule,      // ← tu módulo
  ],
})
```

### 3. Usá errores estructurados

```typescript
// Definí códigos en error-codes.ts
export const ErrorCodes = {
  USER_NOT_FOUND: 'USER_001',
  ORDER_EXPIRED: 'ORDER_001',
} as const;

// En cualquier servicio:
throw new AppError(
  ErrorCodes.USER_NOT_FOUND,
  'User 123 not found',
  404,
  { userId: '123' },
);
```

La respuesta HTTP:

```json
{
  "success": false,
  "error": {
    "code": "USER_001",
    "message": "User 123 not found",
    "statusCode": 404,
    "requestId": "a1b2c3d4",
    "timestamp": "2026-06-03T15:00:00.000Z",
    "details": { "userId": "123" }
  }
}
```

### 4. Usá el logger con request ID

```typescript
import { AppLogger } from '../common/logger/app-logger.service';

export class UsersService {
  private readonly logger = new AppLogger(UsersService.name);

  async findById(id: string) {
    this.logger.log(`Buscando usuario ${id}`);
    // Output: [a1b2c3d4] Buscando usuario 123
  }
}
```

### 5. Llamadas HTTP con timeout

```typescript
const data = await this.httpClient.get<ResponseType>('https://api.example.com/data');
```

El `HttpClientService` tira `AppError` con código `HTTP_003` si hay timeout,
`HTTP_001` si falla la respuesta, etc.

## Checklist de robustez

Usá esto de referencia cuando agregues features al template:

- [ ] **Config validation**: cada variable de entorno está declarada en `env.config.ts` con su validador
- [ ] **AppConfigService**: todo acceso a env vars pasa por acá, no hay `process.env.X` sueltos
- [ ] **ErrorCodes**: códigos únicos `MODULO_NUMERO` para cada error del dominio
- [ ] **AppError**: usás `throw new AppError(code, msg, status, details)` en lugar de `throw new HttpException`
- [ ] **AppLogger**: todos los logs usan `AppLogger`, no `Logger` de NestJS directo
- [ ] **HttpClientService**: llamadas externas pasan por acá, no hay `fetch()` sueltos
- [ ] **Tests**: todo error code nuevo tiene al menos un test
- [ ] **Graceful shutdown**: si agregás conexiones (DB, Redis), registrás `onApplicationShutdown`
- [ ] **Input validation**: no confiás en typescript nomás — usás DTOs con `class-validator`
- [ ] **Auth**: no dejás endpoints sin protección que deberían tenerla

## Tests

```bash
pnpm test           # tests unitarios (Jest, src/**/*.spec.ts)
pnpm test:cov       # con cobertura
pnpm test:e2e       # tests end-to-end
pnpm test:watch     # modo watch
```

## Scripts disponibles

```bash
pnpm build          # nest build
pnpm start          # nest start
pnpm start:dev      # nest start --watch
pnpm start:prod     # node dist/main
pnpm lint           # ESLint --fix
pnpm format         # Prettier --write
pnpm prepare        # Instala hooks de Husky (se ejecuta solo en pnpm install)
```
