// Import our Controllers
const feedController = require('../controllers/feedController')

const routes = [
  {
    method: 'GET',
    url: '/api/feeds',
    handler: feedController.getFeeds
  },
  {
    method: 'GET',
    url: '/api/feeds/:id',
    handler: feedController.getSingleFeed
  },
  {
    method: 'POST',
    url: '/api/feeds',
    handler: feedController.addFeed
  },
  {
    method: 'PUT',
    url: '/api/feeds/:id',
    handler: feedController.updateFeed
  },
  {
    method: 'DELETE',
    url: '/api/feeds/:id',
    handler: feedController.deleteFeed
  }
]

module.exports = routes