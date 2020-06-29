// Import External Dependancies
const graphql = require('graphql')

// Destructure GraphQL functions
const {
	GraphQLSchema,
	GraphQLObjectType,
	GraphQLString,
	GraphQLInt,
	GraphQLID,
	GraphQLList,
	GraphQLNonNull
} = graphql

// Import Controllers
const feedController = require('../controllers/feedController')

// Define Object Types
const feedType = new GraphQLObjectType({
	name: 'Feed',
	fields: () => ({
        _id: { type: GraphQLID },
        name: { type: GraphQLString },
        url: { type: GraphQLString }
    })
})

// Define Root Query
const RootQuery = new GraphQLObjectType({
	name: 'RootQueryType',
	fields: {
		feed: {
            type: feedType,
			args: { id: { type: GraphQLID } },
			async resolve(parent, args) {
				return await feedController.getSingleFeed(args)
			}
        },
		feeds: {
            type: new GraphQLList(feedType),
			async resolve(parent, args) {
				return await feedController.getFeeds()
			}
        },
	}
})

// Define Mutations
const Mutations = new GraphQLObjectType({
	name: 'Mutations',
	fields: {
		addFeed: {
            type: feedType,
			args: {
				name: { type: new GraphQLNonNull(GraphQLString) },
				url: { type: new GraphQLNonNull(GraphQLString) }
			},
			async resolve(parent, args) {
				const data = await feedController.addFeed(args)
				return data
			}
		},
		editFeed: {
            type: feedType,
			args: {
				id: { type: new GraphQLNonNull(GraphQLID) },
				name: { type: new GraphQLNonNull(GraphQLString) },
				url: { type: new GraphQLNonNull(GraphQLString) }
			},
			async resolve(parent, args) {
				const data = await feedController.updateFeed(args)
				return data
			}
		},
		deleteFeed: {
            type: feedType,
			args: {
				id: { type: new GraphQLNonNull(GraphQLID) }
			},
			async resolve(parent, args) {
				const data = await feedController.deleteFeed(args)
				return data
			}
		}
	}
})

// Export the schema
module.exports = new GraphQLSchema({
	query: RootQuery,
	mutation: Mutations
})