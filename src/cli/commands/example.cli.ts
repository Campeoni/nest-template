import type { INestApplicationContext } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import type { CliCommand } from '../cli-command';
import { ExampleCommandDto } from './example-command.dto';

// Lee el valor de una bandera, en formato `--name valor` o `--name=valor`.
function readOption(args: string[], name: string): string | undefined {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`));
  if (inline) {
    return inline.slice(`--${name}=`.length);
  }
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

/**
 * Comando de ejemplo — PLACEHOLDER.
 *
 * No hace nada de negocio: existe para dejar visible el patrón de despacho.
 * Copialo, renombralo y reemplazá su DTO por el del dominio. El `app` que
 * recibe ya está inicializado, así que puede resolver cualquier provider.
 */
export const exampleCommand: CliCommand = {
  name: 'example',
  description: 'Comando de ejemplo: saluda y valida la entrada con un DTO',
  async run(_app: INestApplicationContext, args: string[]): Promise<number> {
    // La entrada se valida con el DTO real, no con chequeos sueltos: si una
    // regla cambia en el DTO, este comando la respeta sin tocarse.
    const dto = plainToInstance(ExampleCommandDto, {
      name: readOption(args, 'name'),
    });

    const errors = await validate(dto);
    if (errors.length > 0) {
      console.error('⛔ Entrada inválida:');
      for (const error of errors) {
        const constraints = Object.values(error.constraints ?? {}).join(', ');
        console.error(`  • ${error.property}: ${constraints}`);
      }
      return 1;
    }

    console.log(`✅ example: ${dto.name}`);
    return 0;
  },
};
