const prisma = require('../utils/prisma');
const { validationResult } = require('express-validator');

/**
 * Create a new conversation
 * @route POST /api/messages/conversations
 * @access Private
 */
const createConversation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, isGroup, participantIds, crossTenant } = req.body;
    const { userId, tenantId } = req;

    // Validate participants exist and are accessible
    const participants = await prisma.user.findMany({
      where: {
        id: { in: participantIds },
        // Allow cross-tenant conversations if explicitly enabled
        ...(crossTenant ? {} : { tenantId })
      }
    });

    if (participants.length !== participantIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more participants not found or not accessible'
      });
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        name,
        isGroup,
        crossTenant: crossTenant || false,
        tenantId,
        createdById: userId,
        participants: {
          create: [
            { userId }, // Add creator as participant
            ...participantIds
              .filter(id => id !== userId) // Don't duplicate creator
              .map(participantId => ({ userId: participantId }))
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'CONVERSATION_CREATED',
        targetId: conversation.id,
        context: `Conversation "${name}" created with ${participants.length} participants`
      }
    });

    // Realtime: notify tenant clients to add conversation and join rooms
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(tenantId).emit('conversation-created', {
          conversation: {
            id: conversation.id,
            name: conversation.name,
            isGroup: conversation.isGroup,
            createdAt: conversation.createdAt,
            participants: conversation.participants.map(p => ({
              id: p.user.id,
              email: p.user.email,
              displayName: p.user.displayName,
              avatarUrl: p.user.avatarUrl
            }))
          }
        });
      }
    } catch {}

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: { conversation }
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating conversation'
    });
  }
};

/**
 * Get user's conversations
 * @route GET /api/messages/conversations
 * @access Private
 */
const getConversations = async (req, res) => {
  try {
    const { userId } = req;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId }
        },
        deletedAt: null
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    // Update frequent conversations
    for (const conversation of conversations) {
      await prisma.frequentConversation.upsert({
        where: {
          userId_conversationId: {
            userId,
            conversationId: conversation.id
          }
        },
        update: {
          accessCount: { increment: 1 },
          lastAccessed: new Date()
        },
        create: {
          userId,
          conversationId: conversation.id,
          accessCount: 1
        }
      });
    }

    res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: conversations.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching conversations'
    });
  }
};

/**
 * Get messages from a conversation
 * @route GET /api/messages/conversations/:conversationId/messages
 * @access Private
 */
const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { userId } = req;
    const { page = 1, limit = 50 } = req.query;

    // Check if user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this conversation'
      });
    }

    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true
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
        messages: messages.reverse(), // Return in ascending order for chat
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages'
    });
  }
};

/**
 * Send a message
 * @route POST /api/messages/conversations/:conversationId/messages
 * @access Private
 */
const sendMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { conversationId } = req.params;
    const { messageText, fileUrl, messageType = 'text' } = req.body;
    const { userId, tenantId } = req;

    // Check if user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages to this conversation'
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        messageText,
        fileUrl,
        messageType
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true
          }
        },
        conversation: {
          include: {
            participants: true
          }
        }
      }
    });

    // Update conversation's updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'MESSAGE_SENT',
        targetId: message.id,
        context: `Message sent in conversation ${conversationId}`
      }
    });

    // Emit real-time message to all participants
    const io = req.app.get('io');
    if (io) {
      io.to(conversationId).emit('new-message', {
        message: {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          messageText: message.messageText,
          fileUrl: message.fileUrl,
          messageType: message.messageType,
          createdAt: message.createdAt,
          sender: message.sender
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message'
    });
  }
};

/**
 * Edit a message
 * @route PUT /api/messages/:messageId
 * @access Private
 */
const editMessage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { messageId } = req.params;
    const { messageText } = req.body;
    const { userId } = req;

    // Check if message exists and user is the sender
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: userId,
        deletedAt: null
      }
    });

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or not authorized to edit'
      });
    }

    // Update message
    const message = await prisma.message.update({
      where: { id: messageId },
      data: {
        messageText,
        edited: true,
        editedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Emit real-time message update
    const io = req.app.get('io');
    if (io) {
      io.to(existingMessage.conversationId).emit('message-updated', {
        message: {
          id: message.id,
          messageText: message.messageText,
          edited: message.edited,
          editedAt: message.editedAt
        }
      });
    }

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: { message }
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while editing message'
    });
  }
};

/**
 * Delete a message
 * @route DELETE /api/messages/:messageId
 * @access Private
 */
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req;

    // Check if message exists and user is the sender
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: userId,
        deletedAt: null
      }
    });

    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or not authorized to delete'
      });
    }

    // Soft delete message
    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() }
    });

    // Emit real-time message deletion
    const io = req.app.get('io');
    if (io) {
      io.to(existingMessage.conversationId).emit('message-deleted', {
        messageId
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting message'
    });
  }
};

/**
 * Add reaction to message
 * @route POST /api/messages/:messageId/reactions
 * @access Private
 */
const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const { userId } = req;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }

    // Check if message exists and user has access
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        deletedAt: null,
        conversation: {
          participants: {
            some: { userId }
          }
        }
      }
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or not accessible'
      });
    }

    // Check if user already reacted with this emoji
    const existingReaction = await prisma.messageReaction.findFirst({
      where: {
        messageId,
        userId,
        emoji
      }
    });

    if (existingReaction) {
      // Remove existing reaction (toggle)
      await prisma.messageReaction.delete({
        where: { id: existingReaction.id }
      });

      // Emit real-time reaction removal
      const io = req.app.get('io');
      if (io) {
        io.to(message.conversationId).emit('reaction-removed', {
          messageId,
          userId,
          emoji
        });
      }

      return res.json({
        success: true,
        message: 'Reaction removed'
      });
    }

    // Add new reaction
    const reaction = await prisma.messageReaction.create({
      data: {
        messageId,
        userId,
        emoji
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Emit real-time reaction addition
    const io = req.app.get('io');
    if (io) {
      io.to(message.conversationId).emit('reaction-added', {
        messageId,
        reaction
      });
    }

    res.status(201).json({
      success: true,
      message: 'Reaction added successfully',
      data: { reaction }
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding reaction'
    });
  }
};

/**
 * Set typing indicator
 * @route POST /api/messages/conversations/:conversationId/typing
 * @access Private
 */
const setTyping = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { isTyping } = req.body;
    const { userId } = req;

    // Check if user is participant in conversation
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId
      }
    });

    if (!participant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this conversation'
      });
    }

    // Update typing indicator
    await prisma.typingIndicator.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      },
      update: {
        isTyping,
        updatedAt: new Date()
      },
      create: {
        conversationId,
        userId,
        isTyping
      }
    });

    // Emit real-time typing indicator
    const io = req.app.get('io');
    if (io) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          displayName: true
        }
      });

      io.to(conversationId).emit('typing-indicator', {
        conversationId,
        userId,
        displayName: user.displayName,
        isTyping
      });
    }

    res.json({
      success: true,
      message: 'Typing indicator updated'
    });

  } catch (error) {
    console.error('Set typing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating typing indicator'
    });
  }
};

module.exports = {
  createConversation,
  getConversations,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  setTyping
};
