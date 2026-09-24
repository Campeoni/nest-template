import type { INestApplicationContext } from '@nestjs/common';

/**
 * Contrato de un comando de CLI.
 *
 * Un comando recibe el contexto de aplicación ya creado (sin servidor HTTP) y
 * los argumentos que siguen a su nombre, y devuelve el código de salida.
 *
 * El contexto le da acceso a los mismos providers que usa la API: la razón de
 * ser del patrón es que el CLI reutilice la lógica y las reglas de validación
 * del dominio en vez de reimplementarlas.
 */
export interface CliCommand {
  readonly name: string;
  readonly description: string;
  run(app: INestApplicationContext, args: string[]): Promise<number>;
}
