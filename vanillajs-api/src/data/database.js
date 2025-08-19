const fs = require('fs').promises;
const path = require('path');
const { AppError } = require('../middleware/error');

class Database {
  constructor(filePath) {
    this.filePath = path.resolve(filePath);
    this.ensureDirectoryExists();
  }

  async ensureDirectoryExists() {
    const dir = path.dirname(this.filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  async read() {
    try {
      await this.ensureDirectoryExists();
      
      try {
        const data = await fs.readFile(this.filePath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        if (error.code === 'ENOENT') {
          const initialData = {};
          await this.write(initialData);
          return initialData;
        }
        throw error;
      }
    } catch (error) {
      throw new AppError(`Failed to read database: ${error.message}`, 500);
    }
  }

  async write(data) {
    try {
      await this.ensureDirectoryExists();
      const jsonData = JSON.stringify(data, null, 2);
      await fs.writeFile(this.filePath, jsonData, 'utf8');
    } catch (error) {
      throw new AppError(`Failed to write database: ${error.message}`, 500);
    }
  }

  async findCollection(collectionName) {
    const data = await this.read();
    return data[collectionName] || [];
  }

  async updateCollection(collectionName, items) {
    const data = await this.read();
    data[collectionName] = items;
    await this.write(data);
    return items;
  }

  async find(collectionName, query = {}) {
    const items = await this.findCollection(collectionName);
    
    if (Object.keys(query).length === 0) {
      return items;
    }
    
    return items.filter(item => {
      return Object.entries(query).every(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          if (value.$regex) {
            const regex = new RegExp(value.$regex, value.$options || '');
            return regex.test(item[key]);
          }
          if (value.$in && Array.isArray(value.$in)) {
            return value.$in.includes(item[key]);
          }
        }
        return item[key] === value;
      });
    });
  }

  async findById(collectionName, id) {
    const items = await this.findCollection(collectionName);
    return items.find(item => item.id === id) || null;
  }

  async create(collectionName, newItem) {
    const items = await this.findCollection(collectionName);
    const id = this.generateId();
    const itemWithId = { id, ...newItem, createdAt: new Date().toISOString() };
    
    items.push(itemWithId);
    await this.updateCollection(collectionName, items);
    
    return itemWithId;
  }

  async update(collectionName, id, updates) {
    const items = await this.findCollection(collectionName);
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new AppError('Item not found', 404);
    }
    
    items[index] = {
      ...items[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.updateCollection(collectionName, items);
    return items[index];
  }

  async delete(collectionName, id) {
    const items = await this.findCollection(collectionName);
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new AppError('Item not found', 404);
    }
    
    const deletedItem = items.splice(index, 1)[0];
    await this.updateCollection(collectionName, items);
    
    return deletedItem;
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}

module.exports = Database;