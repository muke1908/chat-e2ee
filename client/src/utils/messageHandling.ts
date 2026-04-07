/**
 * Message handling utilities
 */

import { Message } from '../types/index';

export function createMessage(
  sender: string,
  text: string,
  type: 'sent' | 'received'
): Message {
  return {
    sender,
    text,
    type,
    timestamp: new Date(),
  };
}

export function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
