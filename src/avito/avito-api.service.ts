import { BotApiService, ChatItemContext, DeleteMessageData, MarkChatAsReadData, RegisterWebhookData, SendMessageData, VacancyDetails } from "../bot-api-service.interface";
import { AvitoSendMessageRequest, AvitoSendMessageResponse, AvitoWebhookPayload } from "./avito-types";
import { AvitoAuthService } from "./avito-auth.service";

interface AvitoJobVacancyResponse {
  title?: string;
  description?: string;
  salary?: number;
  params?: Record<string, unknown>;
  addressDetails?: Record<string, unknown>;
}

export class AvitoApiService implements BotApiService {
  private readonly baseUrl = 'https://api.avito.ru';
  private readonly authService: AvitoAuthService;
  private readonly userId: string;

  constructor(authService: AvitoAuthService, userId: string) {
    this.authService = authService;
    this.userId = userId;
  }

  async sendMessage(data: SendMessageData): Promise<SendMessageData> {
    const url = `${this.baseUrl}/messenger/v1/accounts/${this.userId}/chats/${data.chatId}/messages`;
    const accessToken = await this.authService.getAccessToken();

    const requestBody: AvitoSendMessageRequest = {
      type: 'text',
      message: {
        text: data.text,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    
    console.log(response)
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(`Failed to send message: ${error.message || response.statusText}`);
    }

    const result = await response.json() as AvitoSendMessageResponse;
    return data;
  }

  async deleteMessage(data: DeleteMessageData): Promise<void> {
    const url = `${this.baseUrl}/messenger/v1/accounts/${this.userId}/chats/${data.chatId}/messages/${data.messageId}`;
    const accessToken = await this.authService.getAccessToken();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(response.status);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      console.log(error)
      throw new Error(`Failed to delete message: ${error.message || response.statusText}`);
    }
  }

  async registerWebhook(data: RegisterWebhookData): Promise<boolean> {
    const url = `${this.baseUrl}/messenger/v3/webhook`;
    const accessToken = await this.authService.getAccessToken();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: data.url }),
    });

    console.log(response);
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(`Failed to register webhook: ${error.message || response.statusText}`);
    }

    const result = await response.json() as { ok?: boolean };
    return result.ok === true;
  }

  async markChatAsRead(data: MarkChatAsReadData): Promise<void> {
    const url = `${this.baseUrl}/messenger/v1/accounts/${this.userId}/chats/${data.chatId}/read`;
    const accessToken = await this.authService.getAccessToken();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' })) as { message?: string };
      throw new Error(`Failed to mark chat as read: ${error.message || response.statusText}`);
    }
  }

  async getChatItemContext(chatId: string): Promise<ChatItemContext | null> {
    const url = `${this.baseUrl}/messenger/v2/accounts/${this.userId}/chats/${chatId}`;
    const accessToken = await this.authService.getAccessToken();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as {
      context?: {
        type?: string;
        value?: {
          id?: number;
          title?: string;
          price_string?: string;
          url?: string;
        };
      };
    };

    const value = data?.context?.type === 'item' ? data.context.value : undefined;
    if (!value) {
      return null;
    }

    return {
      itemId: value.id,
      title: value.title,
      priceString: value.price_string,
      url: value.url,
    };
  }

  async getVacancyDetails(vacancyId: number): Promise<VacancyDetails | null> {
    const paramsList = 'address,schedule,employment,experience,education_level,bonuses,payout_frequency,work_days_per_week,work_hours_per_day,medical_book,paid_period,taxes,vacancy_code,profession,grade,driving_experience,driving_license_category,is_company_car,is_side_job,registration_method,work_format,business_area,age_preferences,shifts,salary_base_bonus,salary_base_range,tools_availability,vehicle_type,worker_class';
    const url = `${this.baseUrl}/job/v2/vacancies/${vacancyId}?fields=title,description,salary&params=${paramsList}`;
    const accessToken = await this.authService.getAccessToken();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as AvitoJobVacancyResponse;
    const conditionsText = this.formatVacancyConditions(data);

    return {
      title: data.title,
      description: data.description,
      conditionsText: conditionsText || undefined,
    };
  }

  private formatVacancyConditions(data: AvitoJobVacancyResponse): string {
    const lines: string[] = [];
    if (data.params && typeof data.params === 'object') {
      const p = data.params as Record<string, unknown>;
      const labels: Record<string, string> = {
        vacancy_code: 'Код вакансии',
        schedule: 'График',
        employment: 'Занятость',
        registration_method: 'Способ оформления',
        work_days_per_week: 'Количество рабочих дней в неделю',
        work_hours_per_day: 'Количество рабочих часов в день',
        payout_frequency: 'Частота выплат',
        paid_period: 'Период оплаты',
        profession: 'Профессия',
        business_area: 'Сфера деятельности компании',
        bonuses: 'Что получают работники',
        age_preferences: 'В том числе для кандидатов',
        experience: 'Опыт работы',
        education_level: 'Образование',
        medical_book: 'Медкнижка',
        address: 'Адрес',
        work_format: 'Формат работы',
        is_side_job: 'Подработка',
        grade: 'Уровень',
        driving_experience: 'Опыт вождения',
        driving_license_category: 'Категория прав',
        is_company_car: 'Служебный автомобиль',
        taxes: 'Налоги',
        shifts: 'Смены',
        salary_base_bonus: 'Бонус к зарплате',
        salary_base_range: 'Диапазон зарплаты',
        tools_availability: 'Наличие инструментов',
        vehicle_type: 'Тип транспорта',
        worker_class: 'Класс работника',
      };
      for (const [key, label] of Object.entries(labels)) {
        const val = p[key];
        if (val === undefined || val === null) continue;
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) continue;
        const str = Array.isArray(val) ? (val as string[]).join(', ') : String(val);
        if (str && str !== '[]') lines.push(`${label}: ${str}`);
      }
    }
    if (data.addressDetails && typeof data.addressDetails === 'object') {
      const a = data.addressDetails as Record<string, unknown>;
      const addr = [a.address, a.city, a.province].filter(Boolean).join(', ');
      if (addr) lines.push(`Расположение: ${addr}`);
    }
    if (lines.length === 0) return '';
    return 'Условия и требования:\n' + lines.join('\n');
  }
}