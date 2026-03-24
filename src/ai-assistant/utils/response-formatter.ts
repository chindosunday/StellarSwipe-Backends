import { Injectable, Logger } from '@nestjs/common';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { LLMResponse } from '../interfaces/llm-provider.interface';

@Injectable()
export class ResponseFormatterService {
  private readonly logger = new Logger(ResponseFormatterService.name);

  formatResponse(
    llmResponse: LLMResponse,
    conversationId: string,
    messageId: string,
    responseTime: number,
  ): ChatResponseDto {
    return {
      messageId,
      conversationId,
      role: 'assistant',
      content: this.cleanAndFormatContent(llmResponse.content),
      modelUsed: llmResponse.modelUsed,
      timestamp: new Date(),
      tokenUsage: llmResponse.tokenUsage,
      responseTime,
      citations: llmResponse.citations || [],
      suggestedFollowUps: this.generateFollowUpQuestions(llmResponse.content),
    };
  }

  private cleanAndFormatContent(content: string): string {
    // Remove excessive whitespace
    let cleaned = content.trim().replace(/\n{3,}/g, '\n\n');

    // Ensure proper markdown formatting
    cleaned = this.formatMarkdown(cleaned);

    return cleaned;
  }

  private formatMarkdown(content: string): string {
    // Basic markdown formatting enhancements
    let formatted = content;

    // Ensure code blocks are properly formatted
    formatted = formatted.replace(/`([^`]+)`/g, '`$1`');

    // Numbered lists
    formatted = formatted.replace(/(\d+)\.\s/g, '$1. ');

    // Bold important terms
    const importantTerms = [
      'WARNING',
      'IMPORTANT',
      'NOTE',
      'CAUTION',
      'DISCLAIMER',
    ];
    importantTerms.forEach((term) => {
      const regex = new RegExp(`\\b${term}\\b`, 'g');
      formatted = formatted.replace(regex, `**${term}**`);
    });

    return formatted;
  }

  private generateFollowUpQuestions(content: string): string[] {
    const followUps: string[] = [];

    // Analyze content to suggest relevant follow-ups
    const contentLower = content.toLowerCase();

    if (
      contentLower.includes('signal') ||
      contentLower.includes('provider')
    ) {
      followUps.push('How do I choose between different signal providers?');
      followUps.push('What metrics should I look at when evaluating a signal provider?');
    }

    if (contentLower.includes('strategy') || contentLower.includes('trade')) {
      followUps.push('What risk management practices should I use?');
      followUps.push('Can you explain different trading strategies in more detail?');
    }

    if (
      contentLower.includes('portfolio') ||
      contentLower.includes('position')
    ) {
      followUps.push('How should I diversify my portfolio?');
      followUps.push('What allocation strategy works best?');
    }

    if (contentLower.includes('risk') || contentLower.includes('loss')) {
      followUps.push('How do I set appropriate stop-loss levels?');
      followUps.push('What position sizing strategy do you recommend?');
    }

    if (contentLower.includes('stellar') || contentLower.includes('blockchain')) {
      followUps.push('How does Stellar differ from other blockchains?');
      followUps.push('What are the advantages of using Stellar?');
    }

    // Return up to 3 relevant follow-up questions
    return followUps.slice(0, 3);
  }

  sanitizeForApiResponse(text: string): string {
    // Remove any sensitive information patterns
    let sanitized = text;

    // Remove API keys, secrets
    sanitized = sanitized.replace(/sk_live_[a-zA-Z0-9]{20,}/g, '[REDACTED]');
    sanitized = sanitized.replace(/api[_-]?key[:\s]*([a-zA-Z0-9]{20,})/gi, 'api_key: [REDACTED]');

    // Remove private key patterns
    sanitized = sanitized.replace(/private[_-]?key[:\s]*([a-zA-Z0-9]{40,})/gi, 'private_key: [REDACTED]');

    return sanitized;
  }

  extractCitations(content: string): Array<{
    title: string;
    url: string;
    relevance: string;
  }> {
    const citations: Array<{ title: string; url: string; relevance: string }> = [];

    // Extract URLs from content  
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = content.match(urlRegex) || [];

    matches.forEach((url, index) => {
      const title = this.extractTitleFromUrl(url);
      citations.push({
        title,
        url,
        relevance: index === 0 ? 'high' : 'medium',
      });
    });

    return citations.slice(0, 5); // Limit to 5 citations
  }

  private extractTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.split('/').filter(Boolean).pop() || 'Link';
      return decodeURIComponent(path).replace(/[-_]/g, ' ');
    } catch {
      return 'External Resource';
    }
  }
}
