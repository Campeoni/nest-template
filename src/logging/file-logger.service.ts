import * as fs from 'node:fs';
import * as path from 'node:path';
import type { LoggerService } from '@nestjs/common';
import { LOG_LEVELS, type LogLevel } from '../config/log-levels.const';

// Nombre por defecto del archivo de log. Se puede cambiar con LOG_FILE.
const DEFAULT_LOG_FILENAME = 'app.log';

// Etiqueta que se escribe en cada línea de log, por nivel.
const LEVEL_LABELS: Record<LogLevel, string> = {
  verbose: 'VERBOSE',
  debug: 'DEBUG',
  log: 'LOG',
  warn: 'WARN',
  error: 'ERROR',
  fatal: 'FATAL',
};

// Indica si el proceso corre dentro de un ejecutable empaquetado.
// Dentro del snapshot process.pkg existe; en Node normal es undefined, así que
// el helper es inocuo y se conserva por si el template se empaqueta más adelante.
export function isPackaged(): boolean {
  return Boolean((process as unknown as { pkg?: unknown }).pkg);
}

// Extrae el mensaje de un error sin volver a fallar: el aviso de un problema
// no puede romperse mientras describe el problema original.
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Resuelve la carpeta donde vive el archivo de log.
 *
 * Orden:
 *   1. LOG_DIR, si está configurada (permite sacar el log de la carpeta de la app)
 *   2. empaquetado: junto al ejecutable
 *   3. desarrollo: el directorio de trabajo actual
 *
 * LOG_DIR acepta rutas relativas: se resuelven contra el directorio de trabajo
 * del proceso (no contra la carpeta del código), para que el mismo valor siga
 * apuntando al lugar esperado sin importar desde dónde se lance la app.
 */
export function resolveLogDirectory(configured?: string): string {
  if (configured) {
    return path.resolve(configured);
  }
  if (isPackaged()) {
    // Nunca dentro del snapshot: el archivo debe quedar escribible junto al
    // ejecutable.
    return path.dirname(process.execPath);
  }
  return path.resolve(process.cwd());
}

/**
 * Decide si corresponde escribir al archivo de log.
 *
 * El ejecutable empaquetado escribe siempre: es un entorno productivo y el
 * archivo es obligatorio para soporte, así que LOG_TO_FILE se ignora. En
 * desarrollo solo se escribe cuando LOG_TO_FILE es exactamente 'true' (para
 * depurar); sin él, el archivo es ruido y el log va solo a consola.
 */
export function shouldWriteToFile(configured?: string): boolean {
  if (isPackaged()) {
    return true;
  }
  return configured === 'true';
}

// Valida el nivel configurado y cae al valor por defecto ante cualquier
// valor ausente o inválido: un error de tipeo no debe silenciar los logs.
function resolveLogLevel(value: string | undefined): LogLevel {
  return value !== undefined &&
    (LOG_LEVELS as readonly string[]).includes(value)
    ? (value as LogLevel)
    : 'log';
}

// Resuelve el nombre del archivo de log. Un valor vacío se trata como ausente
// para no terminar escribiendo en una ruta que es solo un directorio.
function resolveLogFilename(value: string | undefined): string {
  return value !== undefined && value.trim() !== ''
    ? value
    : DEFAULT_LOG_FILENAME;
}

// Motivo por el que el logger quedó sin archivo. Se resuelve en el constructor
// y se guarda, en vez de deducirlo de nuevo al informar: la línea de arranque
// necesita la causa real, no una suposición.
type NoFileReason = 'not-configured' | 'directory-unreachable';

// Registrador que escribe a consola siempre y duplica cada línea en un archivo
// cuando corresponde: en el ejecutable empaquetado siempre, y en desarrollo
// solo si LOG_TO_FILE=true. La carpeta sale de LOG_DIR, o cae junto al
// ejecutable o al directorio de trabajo. El nombre del archivo sale de LOG_FILE
// y por defecto es app.log.
// La salida de consola se escribe directo a stdout/stderr sin pasar por el
// Logger de Nest: cuando la app instala este logger como global, delegar en
// `new Logger()` volvería a entrar acá y se cuelga en loop.
export class FileLogger implements LoggerService {
  // Ruta del archivo de log; undefined cuando solo se escribe a consola.
  private readonly filePath: string | undefined;

  // Causa de que no haya archivo; undefined cuando sí lo hay.
  private readonly noFileReason: NoFileReason | undefined;

  // Posición dentro de LOG_LEVELS del nivel mínimo que se emite.
  private readonly minLevelIndex: number;

  // Marca de que ya se avisó de un fallo de escritura. El aviso se emite una
  // sola vez: si el disco está lleno, un warning por línea es peor que el
  // problema original.
  private writeFailureWarned = false;

  constructor() {
    // Se lee process.env directamente a propósito: el logger se construye
    // antes de que exista el contenedor de DI (se pasa a NestFactory), así
    // que no puede depender de AppConfigService.
    this.minLevelIndex = LOG_LEVELS.indexOf(
      resolveLogLevel(process.env['LOG_LEVEL']),
    );

    // En el ejecutable empaquetado el archivo es obligatorio y LOG_TO_FILE se
    // ignora; en desarrollo solo se escribe si LOG_TO_FILE es exactamente true.
    if (!shouldWriteToFile(process.env['LOG_TO_FILE'])) {
      this.filePath = undefined;
      this.noFileReason = 'not-configured';
      return;
    }
    const dir = resolveLogDirectory(process.env['LOG_DIR']);
    try {
      fs.mkdirSync(dir, { recursive: true });
      this.filePath = path.join(
        dir,
        resolveLogFilename(process.env['LOG_FILE']),
      );
      this.noFileReason = undefined;
    } catch (error) {
      this.filePath = undefined;
      this.noFileReason = 'directory-unreachable';
      // Sin este aviso el operador busca un archivo que nunca se creó. Va por
      // stdout porque el archivo es justamente lo que puede estar fallando.
      this.warnToStdout(
        `No se pudo preparar la carpeta de log "${dir}": ${describeError(error)}. ` +
          'El log queda solo en consola.',
      );
    }
  }

  log(message: unknown, ...optionalParams: unknown[]): void {
    this.write('log', false, message, optionalParams);
  }

  /**
   * Línea operativa que NO respeta el nivel configurado.
   *
   * El arranque es la señal de vida del proceso: si desaparece por tener
   * LOG_LEVEL en warn, el operador no tiene forma de confirmar que la app
   * quedó levantada. Es la única línea con esta excepción, y va tanto a
   * consola como al archivo.
   */
  banner(message: string, context?: string): void {
    this.write('log', false, message, context ? [context] : [], true);
  }

  /**
   * Texto con el destino del log, para la línea de arranque.
   *
   * El operador necesita saber dónde buscar el archivo sin adivinar. Si escribe
   * indica la ruta y de dónde salió la decisión (la variable configurada, el
   * ejecutable o el directorio de trabajo); si cayó a solo-consola distingue
   * por qué, para no mandarlo a mirar la variable equivocada.
   */
  get logDestination(): string {
    if (this.filePath) {
      const source = process.env['LOG_DIR']
        ? 'LOG_DIR'
        : isPackaged()
          ? 'junto al ejecutable'
          : 'directorio de trabajo';
      return `📄 Archivo de log: ${this.filePath} (${source})`;
    }
    // Sin archivo hay dos causas distintas y el mensaje tiene que decir cuál.
    // Culpar a LOG_TO_FILE cuando el problema fue la carpeta manda al operador
    // a mirar una variable que en el ejecutable empaquetado ni se usa.
    if (this.noFileReason === 'directory-unreachable') {
      return '📄 Log solo a consola: no se pudo preparar la carpeta (ver el aviso anterior)';
    }
    return '📄 Log solo a consola (desarrollo sin LOG_TO_FILE)';
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    this.write('error', true, message, optionalParams);
  }

  warn(message: unknown, ...optionalParams: unknown[]): void {
    this.write('warn', false, message, optionalParams);
  }

  debug(message: unknown, ...optionalParams: unknown[]): void {
    this.write('debug', false, message, optionalParams);
  }

  verbose(message: unknown, ...optionalParams: unknown[]): void {
    this.write('verbose', false, message, optionalParams);
  }

  fatal(message: unknown, ...optionalParams: unknown[]): void {
    this.write('fatal', true, message, optionalParams);
  }

  // Convierte el mensaje a texto plano para la línea de log.
  private formatMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }
    if (message instanceof Error) {
      return message.message;
    }
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  // Separa el contexto (último parámetro de texto) y la pila de error.
  private splitParams(optionalParams: unknown[]): {
    context: string | undefined;
    stack: string | undefined;
    rest: unknown[];
  } {
    const params = [...optionalParams];
    let context: string | undefined;
    if (params.length > 0 && typeof params[params.length - 1] === 'string') {
      context = params.pop() as string;
    }
    let stack: string | undefined;
    if (params.length > 0) {
      const candidate = params[params.length - 1];
      if (typeof candidate === 'string' && context !== undefined) {
        stack = params.pop() as string;
      } else if (candidate instanceof Error && candidate.stack) {
        params.pop();
        stack = candidate.stack;
      }
    }
    return { context, stack, rest: params };
  }

  // Escribe una línea en consola y, si corresponde, en el archivo.
  // Los niveles por debajo del configurado se descartan antes de formatear,
  // tanto para consola como para archivo.
  // La escritura es sincrónica porque el volumen es bajo y así no se
  // pierden líneas si el proceso termina de forma abrupta.
  // Un fallo de escritura nunca interrumpe la aplicación.
  private write(
    level: LogLevel,
    toStderr: boolean,
    message: unknown,
    optionalParams: unknown[],
    force = false,
  ): void {
    if (!force && LOG_LEVELS.indexOf(level) < this.minLevelIndex) {
      return;
    }
    const { context, stack, rest } = this.splitParams(optionalParams);
    let line = `[${new Date().toISOString()}] [${LEVEL_LABELS[level]}]`;
    if (context) {
      line += ` [${context}]`;
    }
    line += ` ${this.formatMessage(message)}`;
    for (const extra of rest) {
      line += ` ${this.formatMessage(extra)}`;
    }
    if (stack) {
      line += ` ${stack}`;
    } else if (message instanceof Error && message.stack) {
      line += ` ${message.stack}`;
    }
    try {
      (toStderr ? process.stderr : process.stdout).write(`${line}\n`);
    } catch {
      // Se ignora para no romper el flujo por un error de salida.
    }
    if (!this.filePath) {
      return;
    }
    try {
      fs.appendFileSync(this.filePath, `${line}\n`);
    } catch (error) {
      // El aviso se emite una sola vez y después se silencia: el log nunca
      // puede romper la aplicación, pero tampoco puede fallar en silencio.
      if (!this.writeFailureWarned) {
        this.writeFailureWarned = true;
        this.warnToStdout(
          `No se pudo escribir en el archivo de log "${this.filePath}": ` +
            `${describeError(error)}. Se sigue solo en consola.`,
        );
      }
    }
  }

  // Avisa por stdout sin pasar por el archivo (que es justamente lo que puede
  // estar fallando) ni por el Logger de Nest (que reentraría en este logger).
  private warnToStdout(message: string): void {
    const line = `[${new Date().toISOString()}] [${LEVEL_LABELS.warn}] ${message}`;
    try {
      process.stdout.write(`${line}\n`);
    } catch {
      // Se ignora: un fallo de salida no puede romper el arranque.
    }
  }
}
