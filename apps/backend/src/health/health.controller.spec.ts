import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

const prismaServiceMock = {
  $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prismaServiceMock }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    jest.clearAllMocks();
  });

  describe('liveness', () => {
    it('should return status ok', () => {
      const result = controller.liveness();
      expect(result).toMatchObject({ status: 'ok' });
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('readiness', () => {
    it('should return status ok when DB is reachable', async () => {
      prismaServiceMock.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);
      const result = await controller.readiness();
      expect(result).toMatchObject({ status: 'ok', db: 'connected' });
    });

    it('should throw when DB is unreachable', async () => {
      prismaServiceMock.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
      await expect(controller.readiness()).rejects.toThrow('Database not ready');
    });
  });
});
