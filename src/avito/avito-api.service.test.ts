import { BotApiService } from '../bot-api-service.interface';
import { AvitoApiService } from './avito-api.service';

describe('Avito api service', () => {
  let avitoApiService: BotApiService;

  beforeAll(() => {
    avitoApiService = new AvitoApiService();
  });

  it('Should be defined', () => {
    expect(avitoApiService).toBeDefined();
  })
})