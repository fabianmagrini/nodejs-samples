const url = require('url');
const querystring = require('querystring');

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const contentType = req.headers['content-type'] || '';
        
        if (contentType.includes('application/json')) {
          resolve(body ? JSON.parse(body) : {});
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          resolve(querystring.parse(body));
        } else {
          resolve(body);
        }
      } catch (error) {
        reject(new Error('Invalid request body format'));
      }
    });
    
    req.on('error', reject);
  });
}

function parseUrl(req) {
  const parsedUrl = url.parse(req.url, true);
  return {
    pathname: parsedUrl.pathname,
    query: parsedUrl.query,
    search: parsedUrl.search
  };
}

function parseRouteParams(pattern, pathname) {
  const params = {};
  const patternParts = pattern.split('/');
  const pathnameParts = pathname.split('/');
  
  if (patternParts.length !== pathnameParts.length) {
    return null;
  }
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathnamePart = pathnameParts[i];
    
    if (patternPart.startsWith(':')) {
      const paramName = patternPart.slice(1);
      params[paramName] = decodeURIComponent(pathnamePart);
    } else if (patternPart !== pathnamePart) {
      return null;
    }
  }
  
  return params;
}

module.exports = {
  parseBody,
  parseUrl,
  parseRouteParams
};