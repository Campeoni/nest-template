import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/bootstrap/setup-app';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Misma configuración que el arranque real: el test pega contra el contrato
    // verdadero (prefijo global incluido), no contra una app armada aparte.
    setupApp(app);
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200);
  });

  // `/health` a secas no se afirma a propósito: no es parte del contrato de la
  // API y su resultado depende de si hay un front compilado. Sin `www` da 404;
  // con `www`, el fallback SPA responde el index.html igual que en cualquier
  // otra ruta no-API. El contrato estable, y lo que protege este archivo, es
  // que la API viva bajo `/api`: si el prefijo global desaparece, el test de
  // arriba falla.
  afterEach(async () => {
    await app.close();
  });
});
