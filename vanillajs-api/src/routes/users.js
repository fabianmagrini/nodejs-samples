const Database = require('../data/database');
const { validate } = require('../utils/validation');
const config = require('../config/config');

const db = new Database(config.database.path);
const COLLECTION = 'users';

const getUsers = async (req, res) => {
  const { search, limit = 10, offset = 0 } = req.query;
  
  let query = {};
  if (search) {
    query = {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    };
  }
  
  const users = await db.find(COLLECTION, query);
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const paginatedUsers = users.slice(startIndex, endIndex);
  
  res.success({
    users: paginatedUsers,
    total: users.length,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
};

const getUserById = async (req, res) => {
  const { id } = req.params;
  const user = await db.findById(COLLECTION, id);
  
  if (!user) {
    return res.error('User not found', 404);
  }
  
  res.success(user);
};

const createUser = async (req, res) => {
  const userData = req.body;
  
  validate(userData)
    .required('name')
    .required('email')
    .string('name')
    .string('email')
    .email('email')
    .minLength('name', 2)
    .maxLength('name', 100)
    .validate();
  
  const existingUser = await db.find(COLLECTION, { email: userData.email });
  if (existingUser.length > 0) {
    return res.error('User with this email already exists', 409);
  }
  
  const user = await db.create(COLLECTION, {
    name: userData.name.trim(),
    email: userData.email.toLowerCase().trim(),
    status: userData.status || 'active'
  });
  
  res.status(201).success(user, 'User created successfully');
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  if (updates.name) {
    validate(updates)
      .string('name')
      .minLength('name', 2)
      .maxLength('name', 100)
      .validate();
    updates.name = updates.name.trim();
  }
  
  if (updates.email) {
    validate(updates)
      .string('email')
      .email('email')
      .validate();
    updates.email = updates.email.toLowerCase().trim();
    
    const existingUser = await db.find(COLLECTION, { email: updates.email });
    if (existingUser.length > 0 && existingUser[0].id !== id) {
      return res.error('User with this email already exists', 409);
    }
  }
  
  if (updates.status) {
    validate(updates)
      .oneOf('status', ['active', 'inactive', 'suspended'])
      .validate();
  }
  
  const user = await db.update(COLLECTION, id, updates);
  res.success(user, 'User updated successfully');
};

const deleteUser = async (req, res) => {
  const { id } = req.params;
  await db.delete(COLLECTION, id);
  res.success(null, 'User deleted successfully');
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};