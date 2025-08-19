const { parseRouteParams } = require('./parser');

class Router {
  constructor() {
    this.routes = {
      GET: [],
      POST: [],
      PUT: [],
      DELETE: [],
      OPTIONS: []
    };
    this.middleware = [];
  }

  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }

  get(path, handler) {
    this.addRoute('GET', path, handler);
    return this;
  }

  post(path, handler) {
    this.addRoute('POST', path, handler);
    return this;
  }

  put(path, handler) {
    this.addRoute('PUT', path, handler);
    return this;
  }

  delete(path, handler) {
    this.addRoute('DELETE', path, handler);
    return this;
  }

  options(path, handler) {
    this.addRoute('OPTIONS', path, handler);
    return this;
  }

  addRoute(method, path, handler) {
    this.routes[method].push({
      path,
      handler,
      regex: this.pathToRegex(path)
    });
  }

  pathToRegex(path) {
    const regexPath = path
      .replace(/:\w+/g, '([^/]+)')
      .replace(/\//g, '\\/');
    return new RegExp(`^${regexPath}$`);
  }

  async handle(method, pathname, req, res) {
    const routes = this.routes[method] || [];
    
    for (const route of routes) {
      const params = parseRouteParams(route.path, pathname);
      
      if (params !== null) {
        req.params = params;
        
        try {
          await this.executeMiddleware(req, res, 0);
          
          if (!res.headersSent) {
            await route.handler(req, res);
          }
        } catch (error) {
          if (!res.headersSent) {
            if (error.name === 'ValidationError') {
              res.status(400).json({
                success: false,
                error: error.message,
                errors: error.errors || {},
                timestamp: new Date().toISOString()
              });
            } else {
              const statusCode = error.statusCode || 500;
              res.error(error.message, statusCode);
            }
          }
        }
        return true;
      }
    }
    
    return false;
  }

  async executeMiddleware(req, res, index) {
    if (index >= this.middleware.length) {
      return;
    }
    
    const middleware = this.middleware[index];
    
    await new Promise((resolve, reject) => {
      const next = (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      
      try {
        const result = middleware(req, res, next);
        if (result instanceof Promise) {
          result.catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
    
    await this.executeMiddleware(req, res, index + 1);
  }
}

module.exports = Router;