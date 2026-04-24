import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('PMT API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health', () => {
    it('GET /api responds', async () => {
      // The base API path should not 404
      const res = await request(app.getHttpServer()).get('/api/v1/auth/csrf').expect(200);
      expect(res.body).toHaveProperty('csrfToken');
    });
  });

  describe('Auth', () => {
    it('POST /api/v1/auth/login rejects missing body', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/login').send({}).expect(400);
    });

    it('POST /api/v1/auth/login rejects invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set('X-CSRF-Token', 'test-token')
        .set('Cookie', 'csrf_token=test-token')
        .send({ email: 'nonexistent@test.com', password: 'WrongPass@1' })
        .expect(401);
    });
  });
});
