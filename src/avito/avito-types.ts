/**
 * Типы для работы с Avito API
 */

export interface AvitoMessageContent {
  text?: string | null;
  image?: {
    sizes: Record<string, string>;
  } | null;
  link?: {
    text: string;
    url: string;
    preview?: {
      title?: string;
      description?: string;
      domain?: string;
      url?: string;
      images?: Record<string, string>;
    } | null;
  } | null;
  item?: {
    title: string;
    item_url: string;
    image_url: string;
    price_string?: string | null;
  } | null;
  location?: {
    kind: string;
    lat: number;
    lon: number;
    text: string;
    title: string;
  } | null;
  call?: {
    status: string;
    target_user_id: number;
  } | null;
  voice?: {
    voice_id: string;
  } | null;
  flow_id?: string | null;
}

export type AvitoMessageType =
  | 'text'
  | 'image'
  | 'link'
  | 'item'
  | 'location'
  | 'call'
  | 'deleted'
  | 'voice'
  | 'system'
  | 'appCall'
  | 'file'
  | 'video';

export type AvitoChatType = 'u2i' | 'u2u';

export interface AvitoWebhookMessage {
  author_id: number;
  chat_id: string;
  chat_type: AvitoChatType;
  content: AvitoMessageContent;
  created: number;
  id: string;
  item_id?: number | null;
  published_at: string;
  read?: number | null;
  type: AvitoMessageType;
  user_id: number;
}

export interface AvitoWebhookPayload {
  type: string;
  value: AvitoWebhookMessage;
}

export interface AvitoSendMessageRequest {
  type: 'text';
  message: {
    text: string;
  };
}

export interface AvitoSendMessageResponse {
  id: string;
  type: string;
  direction: 'in' | 'out';
  created: number;
  content: {
    text: string;
  };
}

