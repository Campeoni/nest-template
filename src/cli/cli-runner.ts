import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import type { CliCommand } from './cli-command';
import { exampleCommand } from './commands/example.cli';

/**
 * Registro de comandos disponibles.
 *
 * Para agregar uno: implementá CliCommand y sumalo a esta lista. El despacho,
 * la ayuda y el manejo del contexto de aplicación son comunes a todos.
 */
export const CLI_COMMANDS: readonly CliCommand[] = [exampleCommand];

// Muestra los comandos disponibles y cómo invocarlos.
export function printCliHelp(): void {
  console.log('Uso: app <comando> [opciones]');
  console.log('  (sin argumentos)  inicia el servidor HTTP');
  console.log('');
  console.log('Comandos disponibles:');
  for (const command of CLI_COMMANDS) {
    console.log(`  ${command.name.padEnd(12)} ${command.description}`);
  }
  console.log('');
  console.log('  --help, -h        muestra esta ayuda y sale');
}

/**
 * Resuelve y ejecuta una invocación de CLI.
 *
 * El contexto de aplicación se crea recién cuando hay un comando reconocido:
 * --help y un comando desconocido no necesitan contenedor de DI ni abrir
 * ninguna conexión. Devuelve el código de salida del proceso.
 */
export async function runCli(args: string[]): Promise<number> {
  const [name, ...rest] = args;

  if (name === '--help' || name === '-h') {
    printCliHelp();
    return 0;
  }

  const command = CLI_COMMANDS.find((candidate) => candidate.name === name);
  if (!command) {
    console.error(`⛔ Comando desconocido: "${name}"`);
    printCliHelp();
    return 1;
  }

  // El logger se restringe a error/fatal en vez de apagarse: el arranque del
  // contenedor es ruidoso y no aporta nada en un comando, pero la validación de
  // entorno reporta por logger — silenciarla dejaría una configuración inválida
  // sin ningún mensaje.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'fatal'],
  });
  try {
    return await command.run(app, rest);
  } finally {
    // Cierra el contenedor y cualquier conexión que un provider haya abierto.
    await app.close();
  }
}
