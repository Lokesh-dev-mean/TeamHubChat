const { prisma } = require('../utils/prisma');
const { Prisma } = require('@prisma/client');
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

    // For direct messages (non-group), check if conversation already exists
    if (!isGroup && participantIds.length === 1) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: {
            every: {
              userId: {
                in: [userId, participantIds[0]]
              }
            }
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

      if (existingConversation) {
        return res.json({
          success: true,
          message: 'Existing conversation found',
          data: { conversation: existingConversation }
        });
      }
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
                avatarUrl: true,
                onlineStatus: true,
                lastSeenAt: true
              }
            }
          }
        },
        messages: {
          where: {
            deletedAt: null
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                displayName: true,
                avatarUrl: true
              }
            },
            readBy: {
              where: {
                userId
              }
            }
          }
        },
        _count: {
          select: {
            messages: {
              where: {
                AND: [
                  { deletedAt: null },
                  { senderId: { not: userId } },
                  {
                    NOT: {
                      readBy: {
                        some: {
                          userId
                        }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    // Update frequent conversations
    for (const conversation of conversations) {
      const existingFrequent = await prisma.frequentConversation.findFirst({
        where: {
          userId,
          conversationId: conversation.id
        }
      });

      if (existingFrequent) {
        await prisma.frequentConversation.update({
          where: { id: existingFrequent.id },
          data: {
            accessCount: { increment: 1 },
            lastAccessed: new Date()
          }
        });
      } else {
        await prisma.frequentConversation.create({
          data: {
            userId,
            conversationId: conversation.id,
            accessCount: 1
          }
        });
      }
    }

    // Format conversations with unread count and last message
    const formattedConversations = conversations.map(conv => ({
      ...conv,
      unreadCount: conv._count.messages,
      lastMessage: conv.messages[0] ? {
        id: conv.messages[0].id,
        senderId: conv.messages[0].senderId,
        messageText: conv.messages[0].messageText,
        createdAt: conv.messages[0].createdAt,
        read: conv.messages[0].readBy.length > 0
      } : null
    }));

    res.json({
      success: true,
      data: {
        conversations: formattedConversations,
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
    const { page = 1, limit = 50, threadId } = req.query;

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

    const messages = await prisma.$transaction(async (tx) => {
      // First find all unread messages
      const unreadMessages = await tx.message.findMany({
        where: {
          conversationId,
          deletedAt: null,
          senderId: { not: userId },
          NOT: {
            readBy: {
              some: { userId }
            }
          }
        },
        select: { id: true }
      });

      // Mark all unread messages as read
      if (unreadMessages.length > 0) {
        await tx.messageRead.createMany({
          data: unreadMessages.map(msg => ({
            messageId: msg.id,
            userId
          }))
        });
      }

      // Then fetch all messages with their data
      return await tx.message.findMany({
        where: {
          conversationId,
          deletedAt: null,
          ...(threadId ? {
            OR: [
              { id: threadId }, // Include the thread starter
              { threadId: threadId } // Include all messages in the thread
            ]
          } : {
            threadId: null // Only show root messages when not viewing a thread
          })
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
          },
          parent: {
            select: {
              id: true,
              messageText: true,
              sender: {
                select: {
                  id: true,
                  displayName: true
                }
              }
            }
          },
          thread: {
            select: {
              id: true,
              messageText: true,
              sender: {
                select: {
                  id: true,
                  displayName: true
                }
              }
            }
          },
          readBy: {
            where: { userId },
            select: { readAt: true }
          },
          _count: {
            select: {
              childMessages: true,
              threadMessages: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      });
    });

    // Sort messages in ascending order for chat
    const sortedMessages = messages.toReversed();

    res.json({
      success: true,
      data: {
        messages: sortedMessages,
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
  const startTime = Date.now();
  console.log(`🔍 Send message request started for conversation: ${req.params.conversationId}`);
  console.log(`📝 Request body:`, req.body);
  console.log(`👤 User ID: ${req.userId}, Tenant ID: ${req.tenantId}`);
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { conversationId } = req.params;
    const { messageText, fileUrl, messageType = 'text', parentId, threadId } = req.body;
    const { userId, tenantId } = req;

    console.log(`📨 Processing message:`, { conversationId, messageText, messageType, parentId, threadId });

    // If this is a reply, verify the parent message exists and is accessible
    if (parentId) {
      const parentMessage = await prisma.message.findFirst({
        where: {
          id: parentId,
          conversationId,
          deletedAt: null
        }
      });

      if (!parentMessage) {
        console.error(`❌ Parent message not found: ${parentId}`);
        return res.status(404).json({
          success: false,
          message: 'Parent message not found'
        });
      }
    }

    // If this is a thread message, verify the thread exists
    if (threadId) {
      const threadMessage = await prisma.message.findFirst({
        where: {
          id: threadId,
          conversationId,
          deletedAt: null
        }
      });

      if (!threadMessage) {
        console.error(`❌ Thread message not found: ${threadId}`);
        return res.status(404).json({
          success: false,
          message: 'Thread not found'
        });
      }
    }

    // Check if user is participant in conversation
    console.log(`🔍 Checking if user ${userId} is participant in conversation ${conversationId}`);
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId
      }
    });

    if (!participant) {
      console.error(`❌ User ${userId} is not a participant in conversation ${conversationId}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send messages to this conversation'
      });
    }

    console.log(`✅ Authorization check completed in ${Date.now() - startTime}ms`);

    // Create message with threading support - add timeout to prevent hanging
    const messagePromise = prisma.$transaction(async (tx) => {
      console.log(`🔄 Starting database transaction for message creation`);
      
      // First create the message without the vector
      const newMessage = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          messageText,
          fileUrl,
          messageType,
          parentId,
          threadId,
          readBy: {
            create: {
              userId // Mark as read by sender
            }
          }
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
          },
          readBy: true
        }
      });

      console.log(`✅ Message created with ID: ${newMessage.id}`);

      // Then update the message with the vector if there's text
      if (messageText) {
        try {
          await tx.$executeRaw`
            UPDATE "Message"
            SET "messageVector" = to_tsvector('english', ${messageText}::text)
            WHERE id = ${newMessage.id}
          `;
          console.log(`✅ Message vector updated successfully`);
        } catch (vectorError) {
          console.error('⚠️ Vector update failed, continuing without vector:', vectorError);
          // Don't fail the entire transaction if vector update fails
        }
      }

      return newMessage;
    });

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Message creation timeout')), 15000); // 15 second timeout
    });

    const message = await Promise.race([messagePromise, timeoutPromise]);
    console.log(`✅ Message created in ${Date.now() - startTime}ms`);

    // Update conversation's updatedAt
    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
      });
      console.log(`✅ Conversation updated in ${Date.now() - startTime}ms`);
    } catch (updateError) {
      console.error('⚠️ Failed to update conversation timestamp:', updateError);
      // Don't fail the entire operation
    }

    // Create audit log
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'MESSAGE_SENT',
          targetId: message.id,
          context: `Message sent in conversation ${conversationId}`
        }
      });
      console.log(`✅ Audit log created in ${Date.now() - startTime}ms`);
    } catch (auditError) {
      console.error('⚠️ Failed to create audit log:', auditError);
      // Don't fail the entire operation
    }

    // Emit real-time message to all participants
    const io = req.app.get('io');
    if (io) {
      console.log(`📡 Emitting new-message event to conversation ${conversationId}`);
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
      
      // Emit user activity event to update sender's status to online
      io.to(conversationId).emit('user-activity', {
        userId: userId,
        conversationId: conversationId,
        activityType: 'message_sent',
        timestamp: new Date()
      });
      console.log(`✅ Socket events emitted successfully`);
    } else {
      console.warn('⚠️ Socket.IO not available, real-time updates disabled');
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Message sent successfully in ${totalTime}ms`);
    
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Send message error after ${totalTime}ms:`, error);
    
    // If it's a timeout, try to send a basic response
    if (error.message === 'Message creation timeout') {
      return res.status(408).json({
        success: false,
        message: 'Message creation timed out. Please try again.',
        error: 'TIMEOUT'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while sending message',
      error: error.message
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
