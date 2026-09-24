import { IsString, MinLength } from 'class-validator';

/**
 * Entrada del comando de ejemplo.
 *
 * Es un DTO de class-validator a propósito: demuestra que el CLI valida con
 * las mismas reglas que la API en lugar de repetirlas a mano. Al copiar este
 * comando como base, reemplazá este DTO por el real del dominio.
 */
export class ExampleCommandDto {
  @IsString()
  @MinLength(3)
  name!: string;
}
