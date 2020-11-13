require('dotenv-safe').config()

const { MONGO_URL } = process.env
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const path = require('path')
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const database = require('./database')
let db = {}
const port = 8000

// Player 1 creates a game, sets a name, pays the YTX token bet selected, gets a game code
// Game list is displayed and new game is added with those details
// Player 2 selects a game from the list, pays the YTX bet and joins it
// Game starts

let contractAddressx
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

io.on('connection', async socket => {
	console.log('User connected', socket.id)

	socket.on('disconnect', () => {
		console.log('User disconnected', socket.id)
		cancelGame(socket.id)
	})
	socket.on('create-game', async data => {
		console.log('create-game')
		// gameId++
		let lastGameId
		// 1. Get the last game ID
		try {
			const lastItem = await db
				.collection('games')
				.find({})
				.sort({ $natural: -1 })
				.limit(1)
				.next()
			if (!lastItem) lastGameId = 1
			else {
				lastGameId = lastItem.gameId
			}
		} catch (e) {
			console.log('err', e)
			return io.emit('user-error', "#11 Couldn't find the last game id")
		}
		// 2. Check if the user has an existing game with the created status, if so, delete it
		try {
			const existingGame = await db.collection('games').findOne({
				status: GAME_STATUS.CREATED,
				'player1.account': data.account,
			})
			if (existingGame) {
				await db.collection('games').deleteOne({
					status: GAME_STATUS.CREATED,
					'player1.account': data.account,
				})
			}
		} catch (e) {}
		if (!data.ytxBet || data.ytxBet == 0) {
			return io.emit('user-error', '#1 The bet is empty')
		}
		if (!data.account || data.account.length == 0) {
			return io.emit('user-error', '#3 The user account is empty')
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
				account: data.account,
				socketId: socket.id,
				life: 100,
				energy: 10,
				field: [],
			},
			player2: {
				turn: 0,
				account: '',
				socketId: '',
				life: 100,
				energy: 10,
				field: [],
			},
		}
		// 3. Insert new game
		try {
			await db.collection('games').insertOne(game)
		} catch (e) {
			console.log('Error inserting new game', e)
			return io.emit(
				'user-error',
				'#5 Error inserting user game in the database try again'
			)
		}
		io.emit('game-created', game)
	})
	socket.on('cancel-create-game', async () => {
		cancelGame(socket.id)
	})
	socket.on('join-game', receivedGame => {
		console.log('join-game')
		if (!hasExistingGame[receivedGame.account]) {
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
			account: receivedGame.player2.account,
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
		console.log('update-game')
		if (!hasExistingGame[receivedGame.account]) {
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
	socket.on('get-game-list', async () => {
		try {
			// Send the non-started games
			const gameList = await db
				.collection('games')
				.find({
					status: GAME_STATUS.CREATED,
				})
				.toArray()
			io.emit('receive-game-list', gameList)
		} catch (e) {
			return io.emit('user-error', '#13 Error getting the game list, try again')
		}
	})
	socket.on('set-account', async account => {
		try {
			await db.collection('users').insertOne({
				socket: socket.id,
				account,
			})
		} catch (e) {}
	})
})

const cancelGame = async socketId => {
	console.log('cancel-create-game')
	// Remove game from the db by using users' socket id only if the game is unstarted
	try {
		const gamesWithUserAccount = await db.collection('users').find({
			socket: socketId,
		}).toArray()
		if (gamesWithUserAccount > 0) {
			// Note that subfields, i.e. nested objects must be searched with the dot notation if the nested object has many fields and you're only interested in one
			await db.collection('games').deleteMany({
				status: GAME_STATUS.CREATED,
				'player1.account': gamesWithUserAccount[0].account,
			})
		}
		io.emit('game-deleted-successfully')
	} catch (e) {
		console.log('error', e)
		io.emit('user-error', '#9 Error deleting the game try again later')
	}
}

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
