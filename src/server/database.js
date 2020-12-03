const MongoClient = require('mongodb').MongoClient

const connectToDatabase = (mongoUrl) => {
	const client = new MongoClient(mongoUrl, {
		useUnifiedTopology: true,
	})
	return new Promise(async (resolve, reject) => {
		try {
			await client.connect()
			const db = client.db('ytx')
			console.log('Connected to the database')
			resolve(db)
		} catch (e) {
			console.log('Error connecting to the database', e)
			return reject(e)
		}
	})
}

module.exports = connectToDatabase
