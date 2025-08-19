const { AppError } = require('../middleware/error');

class ValidationError extends AppError {
  constructor(message, errors = {}) {
    super(message, 400);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

class Validator {
  constructor(data) {
    this.data = data;
    this.errors = {};
  }

  required(field, message = `${field} is required`) {
    if (!this.data[field] || (typeof this.data[field] === 'string' && this.data[field].trim() === '')) {
      this.errors[field] = message;
    }
    return this;
  }

  string(field, message = `${field} must be a string`) {
    if (this.data[field] && typeof this.data[field] !== 'string') {
      this.errors[field] = message;
    }
    return this;
  }

  number(field, message = `${field} must be a number`) {
    if (this.data[field] && typeof this.data[field] !== 'number') {
      this.errors[field] = message;
    }
    return this;
  }

  email(field, message = `${field} must be a valid email`) {
    if (this.data[field]) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.data[field])) {
        this.errors[field] = message;
      }
    }
    return this;
  }

  minLength(field, length, message = `${field} must be at least ${length} characters`) {
    if (this.data[field] && this.data[field].length < length) {
      this.errors[field] = message;
    }
    return this;
  }

  maxLength(field, length, message = `${field} must not exceed ${length} characters`) {
    if (this.data[field] && this.data[field].length > length) {
      this.errors[field] = message;
    }
    return this;
  }

  min(field, value, message = `${field} must be at least ${value}`) {
    if (this.data[field] && this.data[field] < value) {
      this.errors[field] = message;
    }
    return this;
  }

  max(field, value, message = `${field} must not exceed ${value}`) {
    if (this.data[field] && this.data[field] > value) {
      this.errors[field] = message;
    }
    return this;
  }

  oneOf(field, values, message = `${field} must be one of: ${values.join(', ')}`) {
    if (this.data[field] && !values.includes(this.data[field])) {
      this.errors[field] = message;
    }
    return this;
  }

  custom(field, validator, message = `${field} is invalid`) {
    if (this.data[field] && !validator(this.data[field])) {
      this.errors[field] = message;
    }
    return this;
  }

  validate() {
    if (Object.keys(this.errors).length > 0) {
      throw new ValidationError('Validation failed', this.errors);
    }
    return true;
  }
}

function validate(data) {
  return new Validator(data);
}

module.exports = {
  validate,
  ValidationError,
  Validator
};