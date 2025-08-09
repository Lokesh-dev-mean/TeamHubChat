const User = require('../models/user.model');
const { validationResult } = require('express-validator');

/**
 * Get all users
 * @route GET /api/users
 * @access Private
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ username: 1 });
    
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users',
      error: error.message
    });
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 * @access Private
 */
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    
    // Check if error is a CastError (invalid ID format)
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user',
      error: error.message
    });
  }
};

/**
 * Update user profile
 * @route PUT /api/users/:id
 * @access Private
 */
exports.updateUser = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // Check if user is trying to update their own profile or is an admin
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      });
    }
    
    const { username, email, firstName, lastName, profilePicture } = req.body;
    
    // Build update object with only provided fields
    const updateFields = {};
    if (username) updateFields.username = username;
    if (email) updateFields.email = email;
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (profilePicture) updateFields.profilePicture = profilePicture;
    
    // Check if username or email already exists if they are being updated
    if (username) {
      const existingUsername = await User.findOne({ 
        username, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
    }
    
    if (email) {
      const existingEmail = await User.findOne({ 
        email, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }
    }
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user',
      error: error.message
    });
  }
};

/**
 * Update user status
 * @route PUT /api/users/status/:id
 * @access Private
 */
exports.updateUserStatus = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    // Check if user is trying to update their own status
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this status'
      });
    }
    
    const { status } = req.body;
    
    if (!['online', 'offline', 'away', 'busy'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating status',
      error: error.message
    });
  }
};

/**
 * Delete user
 * @route DELETE /api/users/:id
 * @access Private/Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    // Check if user is an admin or deleting their own account
    if (req.user._id.toString() !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this user'
      });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user',
      error: error.message
    });
  }
};
