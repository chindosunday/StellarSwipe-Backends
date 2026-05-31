export const FAQ_DATABASE = {
  gettingStarted: [
    {
      id: 'start-1',
      question: 'How do I create an account on StellarSwipe?',
      answer: 'Visit the signup page, enter your email and create a password. Complete email verification and KYC requirements to start trading.',
      category: 'Getting Started',
    },
    {
      id: 'start-2',
      question: 'What are the KYC requirements?',
      answer: 'We require identity verification with a valid government ID, address verification, and proof of income for certain account tiers.',
      category: 'Getting Started',
    },
    {
      id: 'start-3',
      question: 'How do I secure my account?',
      answer: 'Enable two-factor authentication (2FA), use a strong password, never share your API keys, and enable IP whitelist if needed.',
      category: 'Getting Started',
    },
  ],
  signals: [
    {
      id: 'sig-1',
      question: 'How do I follow a trading signal?',
      answer: 'Find a signal provider you want to follow, enable signal notifications, and optionally set auto-trading parameters.',
      category: 'Signals',
    },
    {
      id: 'sig-2',
      question: 'What is the accuracy rate of signals?',
      answer: 'Signal accuracy varies by provider and market conditions. Check provider statistics, past performance, and disclaimers.',
      category: 'Signals',
    },
    {
      id: 'sig-3',
      question: 'Can I customize signal parameters?',
      answer: 'Yes, adjust position size, stop-loss, take-profit levels, and frequency filters for each signal provider.',
      category: 'Signals',
    },
  ],
  portfolio: [
    {
      id: 'port-1',
      question: 'How do I view my portfolio performance?',
      answer: 'Go to Dashboard > Portfolio to see your holdings, P&L, diversification, and performance metrics.',
      category: 'Portfolio',
    },
    {
      id: 'port-2',
      question: 'How is my profit/loss calculated?',
      answer: 'P&L is calculated from entry price vs current market price for open positions, or entry vs exit for closed positions.',
      category: 'Portfolio',
    },
  ],
  technical: [
    {
      id: 'tech-1',
      question: 'What cryptocurrencies does StellarSwipe support?',
      answer: 'We support major cryptocurrencies including Bitcoin, Ethereum, Stellar Lumens (XLM), and many altcoins.',
      category: 'Technical',
    },
    {
      id: 'tech-2',
      question: 'What is the Stellar integration?',
      answer: 'StellarSwipe integrates with the Stellar blockchain for fast, secure, and low-cost transactions.',
      category: 'Technical',
    },
  ],
};

export function searchFAQ(query: string): any[] {
  const normalizedQuery = query.toLowerCase();
  const results: any[] = [];

  for (const category in FAQ_DATABASE) {
    const faqs = FAQ_DATABASE[category];
    for (const faq of faqs) {
      const scoreQuestion = calculateSimilarity(normalizedQuery, faq.question.toLowerCase());
      const scoreAnswer = calculateSimilarity(normalizedQuery, faq.answer.toLowerCase());
      const score = Math.max(scoreQuestion, scoreAnswer);

      if (score > 0.3) {
        results.push({ ...faq, relevanceScore: score });
      }
    }
  }

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 5);
}

function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  const commonWords = words1.filter((word) => words2.includes(word));
  return commonWords.length / Math.max(words1.length, words2.length);
}
