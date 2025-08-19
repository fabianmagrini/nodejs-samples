const Database = require('../data/database');
const { validate } = require('../utils/validation');
const config = require('../config/config');

const db = new Database(config.database.path);
const COLLECTION = 'products';

const getProducts = async (req, res) => {
  const { category, minPrice, maxPrice, search, limit = 10, offset = 0 } = req.query;
  
  let query = {};
  
  if (category) {
    query.category = category;
  }
  
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }
  
  let products = await db.find(COLLECTION, query);
  
  if (minPrice || maxPrice) {
    products = products.filter(product => {
      const price = parseFloat(product.price);
      if (minPrice && price < parseFloat(minPrice)) return false;
      if (maxPrice && price > parseFloat(maxPrice)) return false;
      return true;
    });
  }
  
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const paginatedProducts = products.slice(startIndex, endIndex);
  
  res.success({
    products: paginatedProducts,
    total: products.length,
    limit: parseInt(limit),
    offset: parseInt(offset)
  });
};

const getProductById = async (req, res) => {
  const { id } = req.params;
  const product = await db.findById(COLLECTION, id);
  
  if (!product) {
    return res.error('Product not found', 404);
  }
  
  res.success(product);
};

const createProduct = async (req, res) => {
  const productData = req.body;
  
  validate(productData)
    .required('name')
    .required('price')
    .required('category')
    .string('name')
    .number('price')
    .string('category')
    .minLength('name', 2)
    .maxLength('name', 200)
    .min('price', 0)
    .validate();
  
  const product = await db.create(COLLECTION, {
    name: productData.name.trim(),
    description: productData.description ? productData.description.trim() : '',
    price: parseFloat(productData.price),
    category: productData.category.toLowerCase().trim(),
    inStock: productData.inStock !== false,
    quantity: parseInt(productData.quantity) || 0
  });
  
  res.status(201).success(product, 'Product created successfully');
};

const updateProduct = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  if (updates.name) {
    validate(updates)
      .string('name')
      .minLength('name', 2)
      .maxLength('name', 200)
      .validate();
    updates.name = updates.name.trim();
  }
  
  if (updates.price !== undefined) {
    validate(updates)
      .number('price')
      .min('price', 0)
      .validate();
    updates.price = parseFloat(updates.price);
  }
  
  if (updates.category) {
    validate(updates)
      .string('category')
      .validate();
    updates.category = updates.category.toLowerCase().trim();
  }
  
  if (updates.description) {
    updates.description = updates.description.trim();
  }
  
  if (updates.quantity !== undefined) {
    updates.quantity = parseInt(updates.quantity) || 0;
  }
  
  const product = await db.update(COLLECTION, id, updates);
  res.success(product, 'Product updated successfully');
};

const deleteProduct = async (req, res) => {
  const { id } = req.params;
  await db.delete(COLLECTION, id);
  res.success(null, 'Product deleted successfully');
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};