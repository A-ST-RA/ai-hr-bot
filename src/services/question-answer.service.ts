/**
 * Сервис для работы с вопросами и ответами из базы данных
 */

import type { Core } from '@strapi/strapi';

export interface QuestionAnswer {
  key: string;
  answer: string;
}

export class QuestionAnswerService {
  private strapi: Core.Strapi;

  constructor(strapi: Core.Strapi) {
    this.strapi = strapi;
  }

  /**
   * Получает все вопросы и ответы из базы данных
   */
  async getAllQuestions(): Promise<Array<{ key: string; question: string; answer: string }>> {
    const questions = await this.strapi.entityService.findMany('api::question.question', {});

    return questions.map((q: any) => ({
      key: q.key,
      question: q.question || q.key, // Используем question если есть, иначе key
      answer: q.answer,
    }));
  }

  /**
   * Получает ответ по ключу вопроса
   * @param key Ключ вопроса
   * @returns Ответ или null если не найден
   */
  async getAnswerByKey(key: string): Promise<string | null> {
    const question = await this.strapi.entityService.findMany('api::question.question', {
      filters: { key },
      limit: 1,
    });

    if (!question || question.length === 0) {
      return null;
    }

    return question[0].answer;
  }

  /**
   * Получает ответ по ключу или возвращает дефолтный ответ
   * @param key Ключ вопроса
   * @returns Ответ
   */
  async getAnswerByKeyOrDefault(key: string): Promise<string> {
    if (key === 'default') {
      const defaultAnswer = await this.getAnswerByKey('default');
      return defaultAnswer || 'Извините, я не могу ответить на этот вопрос. Пожалуйста, уточните ваш вопрос.';
    }

    const answer = await this.getAnswerByKey(key);
    if (!answer) {
      // Если ответ не найден, пытаемся получить default
      const defaultAnswer = await this.getAnswerByKey('default');
      return defaultAnswer || 'Извините, я не могу ответить на этот вопрос. Пожалуйста, уточните ваш вопрос.';
    }

    return answer;
  }
}

