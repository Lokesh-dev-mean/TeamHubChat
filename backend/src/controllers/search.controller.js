const { prisma } = require('../utils/prisma');
const { validationResult } = require('express-validator');

/**
 * Global search across messages, users, and files
 * @route GET /api/search
 * @access Private
 */
const globalSearch = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId, tenantId } = req;
    const { 
      query, 
      type = 'all', // 'messages', 'users', 'files', 'all'
      page = 1, 
      limit = 20,
      startDate,
      endDate
    } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const skip = (page - 1) * limit;
    const searchTerm = query.trim();
    const results = {};

    // Search Messages
    if (type === 'all' || type === 'messages') {
      const messageWhereClause = {
        deletedAt: null,
        conversation: {
          participants: {
            some: { userId }
          },
          tenantId
        }
      };

      // Use tsvector search if available
      if (messageWhereClause.messageVector) {
        messageWhereClause.messageVector = {
          search: searchTerm.split(' ').join(' & ')
        };
      } else {
        // Fallback to basic text search
        messageWhereClause.messageText = {
          contains: searchTerm,
          mode: 'insensitive'
        };
      };

      // Add date filter if provided
      if (startDate || endDate) {
        messageWhereClause.createdAt = {};
        if (startDate) {
          messageWhereClause.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          messageWhereClause.createdAt.lte = new Date(endDate);
        }
      }

      const messages = await prisma.message.findMany({
        where: messageWhereClause,
        include: {
          sender: {
            select: {
              id: true,
              displayName: true,
              email: true,
              avatarUrl: true
            }
          },
          conversation: {
            select: {
              id: true,
              name: true,
              isGroup: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: type === 'messages' ? skip : 0,
        take: type === 'messages' ? parseInt(limit) : 5 // Limit for global search
      });

      results.messages = {
        data: messages,
        count: messages.length,
        type: 'messages'
      };
    }

    // Search Users
    if (type === 'all' || type === 'users') {
      const userWhereClause = {
        tenantId,
        OR: [
          {
            displayName: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            email: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        ]
      };

      const users = await prisma.user.findMany({
        where: userWhereClause,
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
          createdAt: true
        },
        orderBy: { displayName: 'asc' },
        skip: type === 'users' ? skip : 0,
        take: type === 'users' ? parseInt(limit) : 5
      });

      results.users = {
        data: users,
        count: users.length,
        type: 'users'
      };
    }

    // Search Files
    if (type === 'all' || type === 'files') {
      const fileWhereClause = {
        tenantId,
        fileUrl: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      };

      // Add date filter if provided
      if (startDate || endDate) {
        fileWhereClause.uploadedAt = {};
        if (startDate) {
          fileWhereClause.uploadedAt.gte = new Date(startDate);
        }
        if (endDate) {
          fileWhereClause.uploadedAt.lte = new Date(endDate);
        }
      }

      const files = await prisma.mediaFile.findMany({
        where: fileWhereClause,
        include: {
          uploadedBy: {
            select: {
              id: true,
              displayName: true,
              email: true
            }
          }
        },
        orderBy: { uploadedAt: 'desc' },
        skip: type === 'files' ? skip : 0,
        take: type === 'files' ? parseInt(limit) : 5
      });

      // Convert BigInt to string for JSON serialization
      const filesWithStringSize = files.map(file => ({
        ...file,
        size: file.size.toString()
      }));

      results.files = {
        data: filesWithStringSize,
        count: filesWithStringSize.length,
        type: 'files'
      };
    }

    // Calculate total results
    const totalResults = Object.values(results).reduce((sum, category) => sum + category.count, 0);

    res.json({
      success: true,
      data: {
        query: searchTerm,
        type,
        results,
        totalResults,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: type !== 'all' && Object.values(results)[0]?.count === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during search'
    });
  }
};

/**
 * Search messages with advanced filters
 * @route GET /api/search/messages
 * @access Private
 */
const searchMessages = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId, tenantId } = req;
    const { 
      query, 
      conversationId,
      senderId,
      messageType,
      hasFile,
      startDate,
      endDate,
      page = 1, 
      limit = 50 
    } = req.query;

    const skip = (page - 1) * limit;

    const whereClause = {
      deletedAt: null,
      conversation: {
        participants: {
          some: { userId }
        },
        tenantId
      }
    };

    // Add text search if provided
    if (query && query.trim().length >= 2) {
      const searchTerm = query.trim();
      
      // Use tsvector search if available
      if (whereClause.messageVector) {
        whereClause.messageVector = {
          search: searchTerm.split(' ').join(' & ')
        };
      } else {
        // Fallback to basic text search
        whereClause.messageText = {
          contains: searchTerm,
          mode: 'insensitive'
        };
      }
    }

    // Filter by conversation
    if (conversationId) {
      whereClause.conversationId = conversationId;
    }

    // Filter by sender
    if (senderId) {
      whereClause.senderId = senderId;
    }

    // Filter by message type
    if (messageType) {
      whereClause.messageType = messageType;
    }

    // Filter messages with files
    if (hasFile === 'true') {
      whereClause.fileUrl = {
        not: null
      };
    } else if (hasFile === 'false') {
      whereClause.fileUrl = null;
    }

    // Add date filter
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            displayName: true,
            email: true,
            avatarUrl: true
          }
        },
        conversation: {
          select: {
            id: true,
            name: true,
            isGroup: true
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                displayName: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        messages,
        filters: {
          query: query || null,
          conversationId: conversationId || null,
          senderId: senderId || null,
          messageType: messageType || null,
          hasFile: hasFile || null,
          startDate: startDate || null,
          endDate: endDate || null
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during message search'
    });
  }
};

/**
 * Search users with filters
 * @route GET /api/search/users
 * @access Private
 */
const searchUsers = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId, tenantId } = req;
    const { 
      query, 
      excludeSelf = 'true',
      page = 1, 
      limit = 20 
    } = req.query;

    const skip = (page - 1) * limit;

    const whereClause = {
      tenantId
    };

    // Exclude current user if requested
    if (excludeSelf === 'true') {
      whereClause.id = {
        not: userId
      };
    }

    // Add text search if provided
    if (query && query.trim().length >= 2) {
      const searchTerm = query.trim();
      whereClause.OR = [
        {
          displayName: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        }
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        createdAt: true
      },
      orderBy: { displayName: 'asc' },
      skip,
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        users,
        filters: {
          query: query || null,
          excludeSelf
        },
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: users.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during user search'
    });
  }
};

/**
 * Get search suggestions
 * @route GET /api/search/suggestions
 * @access Private
 */
const getSearchSuggestions = async (req, res) => {
  try {
    const { userId, tenantId } = req;
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    const searchTerm = query.trim();
    const suggestions = [];

    // Get recent conversations
    const recentConversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId }
        },
        tenantId,
        name: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        isGroup: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 3
    });

    suggestions.push(...recentConversations.map(conv => ({
      type: 'conversation',
      id: conv.id,
      text: conv.name,
      subtitle: conv.isGroup ? 'Group conversation' : 'Direct conversation'
    })));

    // Get users
    const users = await prisma.user.findMany({
      where: {
        tenantId,
        id: { not: userId },
        OR: [
          {
            displayName: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            email: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        displayName: true,
        email: true
      },
      take: 3
    });

    suggestions.push(...users.map(user => ({
      type: 'user',
      id: user.id,
      text: user.displayName,
      subtitle: user.email
    })));

    res.json({
      success: true,
      data: { suggestions }
    });

  } catch (error) {
    console.error('Get search suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting suggestions'
    });
  }
};

module.exports = {
  globalSearch,
  searchMessages,
  searchUsers,
  getSearchSuggestions
};
