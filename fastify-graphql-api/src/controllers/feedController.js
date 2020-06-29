// External Dependancies
const boom = require('boom')

// Get Data Models
const Feed = require('../models/Feed')

// Get all feeds
exports.getFeeds = async (req, reply) => {
  try {
    const feeds = await Feed.find()
    return feeds
  } catch (err) {
    throw boom.boomify(err)
  }
}

// Get single feed by ID
exports.getSingleFeed = async (req, reply) => {
  try {
    const id = req.params === undefined ? req.id : req.params.id
    const feed = await Feed.findById(id)
    return feed
  } catch (err) {
    throw boom.boomify(err)
  }
}

// Add a new feed
exports.addFeed = async (req, reply) => {
  try {
    const feed = new Feed(req)
    const newFeed = await feed.save()
    return newFeed
  } catch (err) {
    throw boom.boomify(err)
  }
}

// Update an existing feed
exports.updateFeed = async (req, reply) => {
  try {
    const id = req.params === undefined ? req.id : req.params.id
		const updateData = req.params === undefined ? req : req.params
    const update = await Feed.findByIdAndUpdate(id, updateData, { new: true })
    return update
  } catch (err) {
    throw boom.boomify(err)
  }
}

// Delete a feed
exports.deleteFeed = async (req, reply) => {
  try {
    const id = req.params === undefined ? req.id : req.params.id
    const feed = await Feed.findByIdAndRemove(id)
    return feed
  } catch (err) {
    throw boom.boomify(err)
  }
}