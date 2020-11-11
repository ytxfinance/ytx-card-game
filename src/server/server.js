require('dotenv-safe').config()

const { MONGO_URL } = process.env
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const path = require('path')
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const deepEqual = require('deep-equal')
const database = require('./database')
let db = {}
const port = 8000

// Player 1 creates a game, sets a name, pays the YTX token bet selected, gets a game code
// Game list is displayed and new game is added with those details
// Player 2 selects a game from the list, pays the YTX bet and joins it
// Game starts

let contractAddress
let gameId = 0
// The game list of unstarted games to allow people to join
let games = []
// A mapping for gameId -> game
let gameMap = {}
const GAME_STATUS = {
	CREATED: 'CREATED',
	STARTED: 'STARTED',
	ENDED: 'ENDED',
	CANCELLED: 'CANCELLED',
}

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use('*', (req, res, next) => {
	// Logger
	let time = new Date()
	console.log(
		`${req.method} to ${
			req.originalUrl
		} at ${time.getHours()}:${time.getMinutes()}:${time.getSeconds()}`
	)
	next()
})

app.get('/build.js', (req, res) => {
	return res.sendFile(path.join(__dirname, '../../dist/build.js'))
})

app.get('*', (req, res) => {
	return res.sendFile(path.join(__dirname, '../../dist/index.html'))
})

io.on('connection', socket => {
	console.log('User connected', socket.id)
	socket.on('disconnect', () => {
		console.log('User disconnected', socket.id)
	})
	socket.on('create-game', async data => {
        console.log('Create game called by', socket.id)
		// gameId++
		let lastGameId
		// To get the last game ID
		try {
			lastGameId = await db.collection('games')
				.find({}, {
					gameId: true,
				})
				.sort({$natural: -1})
				.limit(1)
				.next()
			if (!lastGameId) lastGameId = 1
			console.log('last game id', lastGameId)
		} catch (e) {
			console.log('err', e)
			return io.emit('user-error', "#11 Couldn't find the last game id")
		}
		// Check if the user has an existing game with the created status
		try {
			const existingGame = await db.collection('games')
				.findOne({
					status: GAME_STATUS.CREATED,
				})
			console.log('existing game', existingGame)
			return io.emit('user-error', '#4 You already have a game created cancel it before creating a new one')
		} catch (e) {}
		if (!data.ytxBet || data.ytxBet == 0) {
			return io.emit('user-error', '#1 The bet is empty')
		}
		if (!data.address || data.address.length == 0) {
			return io.emit('user-error', '#3 The user address is empty')
		}
		// The new game to create
		let game = {
			gameId: lastGameId,
			gameName: data.gameName || 'Game',
			ytxBet: data.ytxBet,
			status: GAME_STATUS.CREATED,
			created: Date.now(),
			player1: {
				turn: 0, // The current turn to know when is when
				address: data.address,
				socketId: socket.id,
				life: 100,
				energy: 10,
				field: [],
			},
			player2: {
				turn: 0,
				address: '',
				socketId: '',
				life: 100,
				energy: 10,
				field: [],
			},
		}
		console.log('game', game)
		try {
			await db.collection('games').insertOne(game)
		} catch (e) {
			console.log('Error inserting new game', e)
			return io.emit(
				'user-error',
				'#5 Error inserting user game in the database try again'
			)
		}
		// games.push(game)
		// gameMap[gameId] = game
		io.emit('game-created', game)
	})
	socket.on('cancel-create-game', async () => {
		// Remove game from the db by using users' socket id
		try {
			await db.collection('games').deleteOne({
				player1: {
					socketId: socket.id,
				},
			})
		} catch (e) {
			io.emit('user-error', '#9 Error deleting the game try again later')
		}
	})
	socket.on('join-game', receivedGame => {
		console.log('Join game called by', socket.id)
		if (!hasExistingGame[receivedGame.address]) {
			return io.emit('user-error', "#6 The game doesn't exist anymore")
		}
		if (!gameMap[receivedGame.gameId]) {
			return io.emit('user-error', '#7 Game not found')
		}
		// Check if the game player1 is right from the received object
		if (gameMap[receivedGame.gameId].player1.deepEqual(receivedGame.player1)) {
			return io.emit('user-error', '#8 The received game object is not valid')
		}
		gameMap[receivedGame.gameId].status = GAME_STATUS.STARTED
		gameMap[receivedGame.gameId].player2 = {
			turn: 0,
			address: receivedGame.player2.address,
			socketId: receivedGame.player2.socketId,
			life: 100,
			energy: 10,
			field: [],
		}
		const positionToRemove = games
			.map(item => item.gameId)
			.indexOf(receivedGame.gameId)
		// Remove the item to update the active games
		games.splice(positionToRemove, 1)
		return gameMap[receivedGame.gameId]
	})
	socket.on('update-game', receivedGame => {
		if (!hasExistingGame[receivedGame.address]) {
			return io.emit('user-error', "#9 The game doesn't exist anymore")
		}
		if (!gameMap[receivedGame.gameId]) {
			return io.emit('user-error', '#10 Game not found')
		}
		// Check if the game player1 is right from the received object
		if (gameMap[receivedGame.gameId].player1.deepEqual(receivedGame.player1)) {
			return io.emit('user-error', '#11 The received game object is not valid')
		}
		if (gameMap[receivedGame.gameId].ytxBet == receivedGame.ytxbet) {
			return io.emit('user-error', "#12 The bet isn't set properly")
		}
		gameMap[receivedGame.gameId].player1 = receivedGame.player1
		gameMap[receivedGame.gameId].player2 = receivedGame.player2
		if (receivedGame.player1.life == 0) {
			// End game functionality,
			// the server calls the contract to send the tokens to the winner
			// and some to the loser if he got from the treasury
		}
		if (receivedGame.player2.life == 0) {
			// End game functionality
		}
		return gameMap[receivedGame.gameId]
	})
})

const endGame = () => {}

const start = async () => {
	try {
		db = await database(MONGO_URL)
	} catch (e) {
		console.log(e)
		process.exit(1)
	}
	http.listen(port, '0.0.0.0')
	console.log(`Listening on localhost:${port}`)
}

start()
