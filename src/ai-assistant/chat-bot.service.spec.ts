import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatBotService } from './chat-bot.service';
import { Conversation } from './entities/conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { UserContext } from './entities/user-context.entity';
import { ContextBuilderService } from './utils/context-builder';
import { ResponseFormatterService } from './utils/response-formatter';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { NotFoundException } from '@nestjs/common';

describe('ChatBotService', () => {
  let service: ChatBotService;
  let conversationRepo: Repository<Conversation>;
  let messageRepo: Repository<ChatMessage>;
  let contextBuilderService: ContextBuilderService;

  const mockConversationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockMessageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockUserContextRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockContextBuilderService = {
    getUserContext: jest.fn(),
    buildContextFromHistory: jest.fn(),
    enrichContextWithUserData: jest.fn(),
    addTopicToContext: jest.fn(),
  };

  const mockResponseFormatterService = {
    formatResponse: jest.fn(),
    extractCitations: jest.fn(),
  };

  const mockOpenAiProvider = {
    sendMessage: jest.fn(),
    validateApiKey: jest.fn(),
    getAvailableModels: jest.fn(),
  };

  const mockAnthropicProvider = {
    sendMessage: jest.fn(),
    validateApiKey: jest.fn(),
    getAvailableModels: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatBotService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockConversationRepository,
        },
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: mockMessageRepository,
        },
        {
          provide: getRepositoryToken(UserContext),
          useValue: mockUserContextRepository,
        },
        {
          provide: ContextBuilderService,
          useValue: mockContextBuilderService,
        },
        {
          provide: ResponseFormatterService,
          useValue: mockResponseFormatterService,
        },
        {
          provide: OpenAiProvider,
          useValue: mockOpenAiProvider,
        },
        {
          provide: AnthropicProvider,
          useValue: mockAnthropicProvider,
        },
      ],
    }).compile();

    service = module.get<ChatBotService>(ChatBotService);
    conversationRepo = module.get<Repository<Conversation>>(
      getRepositoryToken(Conversation),
    );
    contextBuilderService = module.get<ContextBuilderService>(ContextBuilderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const userId = 'test-user-id';
      const mockConversation = {
        id: 'conv-123',
        userId,
        title: 'Test Conversation',
        metadata: {},
      };

      mockConversationRepository.create.mockReturnValue(mockConversation);
      mockConversationRepository.save.mockResolvedValue(mockConversation);

      const result = await service.createConversation(userId, 'Test Conversation');

      expect(result).toEqual(mockConversation);
      expect(mockConversationRepository.create).toHaveBeenCalled();
      expect(mockConversationRepository.save).toHaveBeenCalledWith(mockConversation);
    });
  });

  describe('validateConversation', () => {
    it('should throw NotFoundException if conversation does not exist', async () => {
      mockConversationRepository.findOne.mockResolvedValue(null);

      await expect(
        service['validateConversation']('user-123', 'conv-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return conversation if it exists', async () => {
      const mockConversation = {
        id: 'conv-123',
        userId: 'user-123',
        title: 'Test',
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);

      const result = await service['validateConversation']('user-123', 'conv-123');

      expect(result).toEqual(mockConversation);
    });
  });

  describe('listConversations', () => {
    it('should list conversations for a user', async () => {
      const userId = 'user-123';
      const mockConversations = [
        { id: 'conv-1', title: 'Conversation 1' },
        { id: 'conv-2', title: 'Conversation 2' },
      ];

      mockConversationRepository.findAndCount.mockResolvedValue([
        mockConversations,
        2,
      ]);

      const result = await service.listConversations(userId);

      expect(result.conversations).toEqual(mockConversations);
      expect(result.total).toBe(2);
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation by marking as deleted', async () => {
      const userId = 'user-123';
      const conversationId = 'conv-123';
      const mockConversation = {
        id: conversationId,
        userId,
        status: 'active',
      };

      mockConversationRepository.findOne.mockResolvedValue(mockConversation);
      mockConversationRepository.save.mockResolvedValue({
        ...mockConversation,
        status: 'deleted',
      });

      await service.deleteConversation(userId, conversationId);

      expect(mockConversation.status).toBe('deleted');
    });
  });
});
