// Import external dependancies
const faker = require('faker')
const boom = require('boom')

// Import internal dependancies
const fastify = require('../server.js')

// Get Data Models
const Feed = require('../models/Feed')

// Fake data generation functions
const generateFeedData = () => {
	let feedData = []
	let i = 0

	while (i < 50) {
		const name = faker.name.findName()
		const url = faker.internet.url()

		const feed = {
			name,
			url
		}

		feedData.push(feed)
		i++
	}

	return feedData
}

fastify.ready().then(
	async () => {
		try {
			const feeds = await Feed.insertMany(generateFeedData())

			console.log(`
      Data successfully added:
        - ${feeds.length} owners added.
      `)
		} catch (err) {
			throw boom.boomify(err)
		}
		process.exit()
	},
	err => {
		console.log('An error occured: ', err)
		process.exit()
	}
)