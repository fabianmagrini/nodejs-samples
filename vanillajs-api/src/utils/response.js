class Response {
  constructor(res) {
    this.res = res;
    this.statusCode = 200;
    this.headers = {
      'Content-Type': 'application/json'
    };
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  header(name, value) {
    this.headers[name] = value;
    return this;
  }

  json(data) {
    this.header('Content-Type', 'application/json');
    this.send(JSON.stringify(data, null, 2));
    return this;
  }

  text(data) {
    this.header('Content-Type', 'text/plain');
    this.send(data);
    return this;
  }

  html(data) {
    this.header('Content-Type', 'text/html');
    this.send(data);
    return this;
  }

  send(data) {
    if (this.res.headersSent) {
      return this;
    }

    this.res.writeHead(this.statusCode, this.headers);
    this.res.end(data);
    return this;
  }

  redirect(url, permanent = false) {
    this.status(permanent ? 301 : 302);
    this.header('Location', url);
    this.send();
    return this;
  }

  error(message, statusCode = 500) {
    this.status(statusCode).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
    return this;
  }

  success(data, message = 'Success') {
    this.json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
    return this;
  }
}

function createResponse(res) {
  return new Response(res);
}

module.exports = { Response, createResponse };