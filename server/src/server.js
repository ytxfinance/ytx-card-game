require('dotenv-safe').config()

const GAME_CONFIG = require('../../GAME_CONFIG.json')
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
let activeSockets = []
const GAME_STATUS = {
	CREATED: 'CREATED',
	STARTED: 'STARTED',
	ENDED: 'ENDED',
	CANCELLED: 'CANCELLED',
}

// Cards have each 4 parameters: cost, life, attack, type we'll store them as
// objects and convert them to arrays in the hashing function
// Global variales not needed for the hashed messages
const globalCardTypes = ['fire', 'water', 'wind', 'life', 'death', 'neutral']
const globalMinAttack = GAME_CONFIG.minCardAttack
const globalMaxAttack = GAME_CONFIG.maxCardAttack
const globalMinLife = GAME_CONFIG.minCardLife
const globalMaxLife = GAME_CONFIG.maxCardLife
const enemyLastCardId = GAME_CONFIG.initialCardsInHand
const lastEnergy = GAME_CONFIG.initialEnergy

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
	activeSockets.push(socket)

	socket.on('disconnect', () => {
		console.log('User disconnected', socket.id)
		const position = activeSockets.map(soc => soc.id).indexOf(socket.id)
		activeSockets.splice(position, 1)
		cancelGame(socket)
	})
	socket.on('create-game', async data => {
		console.log('create-game BY', socket.id)
		let lastGameId
		// 1. Get the last game ID
		try {
			const item = await db
				.collection('games')
				.find({})
				.sort({ $natural: -1 })
				.limit(1)
				.next()
			if (!item) lastGameId = 1
			else {
				lastGameId = ++item.gameId
			}
		} catch (e) {
			console.log('err', e)
			return socket.emit('user-error', "#11 Couldn't find the last game id")
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
			return socket.emit('user-error', '#1 The bet is empty')
		}
		if (!data.account || data.account.length == 0) {
			return socket.emit('user-error', '#3 The user account is empty')
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
				life: GAME_CONFIG.initialLife,
				energy: GAME_CONFIG.initialEnergy,
				field: [],
				hand: [],
			},
			player2: {
				turn: 0,
				account: '',
				socketId: '',
				life: GAME_CONFIG.initialLife,
				energy: GAME_CONFIG.initialEnergy,
				field: [],
				hand: [],
			},
		}
		// 3. Insert new game
		try {
			await db.collection('games').insertOne(game)
		} catch (e) {
			console.log('Error inserting new game', e)
			return socket.emit(
				'user-error',
				'#5 Error inserting user game in the database try again'
			)
		}
		socket.emit('game-created', game)
	})
	socket.on('cancel-create-game', async () => {
		cancelGame(socket)
	})
	socket.on('join-game', async data => {
		console.log('join-game BY', socket.id)
		let game
		// Find the game and update it
		try {
			const { cardsPlayer1, cardsPlayer2 } = generateInitialCards()
			game = await db.collection('games').findOneAndUpdate({
				gameId: data.gameId,
			}, {
				$set: {
					status: GAME_STATUS.STARTED,
					'player1.hand': cardsPlayer1,
					'player2.hand': cardsPlayer2,
					'player2.account': data.account,
					'player2.socketId': socket.id,
				},
			}, {
				// Return the updated one
				returnOriginal: false,
			})
			if (!game.value) {
				return socket.emit('user-error', '#14 Game not found')
			}
		} catch (e) {
			return socket.emit('user-error', '#8 Error updating the game with the second player')
		}
		io.to(game.value.player1.socketId).emit('player-joined', game.value)
		io.to(game.value.player2.socketId).emit('player-joined', game.value)
	})
	socket.on('invoke-card', async data => {
		// Check if users are still active
		const stillActive = checkActiveSockets(data.game.player1.socketId, data.game.player2.socketId)
		const playerNumber = getPlayerNumber(socket.id, data.game)
		let updateData
		if (!stillActive) return
		if (playerNumber === 1) {
			updateData = {
				'player1.field': data.game.player1.field,
				'player1.hand': data.game.player1.hand,
			}
		} else if (playerNumber === 2) {
			updateData = {
				'player2.field': data.game.player2.field,
				'player2.hand': data.game.player2.hand,
			}
		} else {
			return socket.emit('user-error', "#21 You aren't a player of this particular game")
		}
		try {
			await db.collection('games').updateOne({
				gameId: data.game.gameId,
			}, { $set: updateData })
		} catch (e) {
			return socket.emit('user-error', '#22 Error updating the game data with the card invoke')
		}
		if (playerNumber === 1) {
			io.to(data.game.player1.socketId).emit('invoke-player1', data.game)
		} else {
			io.to(data.game.player2.socketId).emit('invoke-player2', data.game)
		}
	})
	socket.on('update-game', async data => {
		// Update-game is an event that indicates a single change such as ending a turn,
		// invoking a card, attacking directly or to the field or drawing a card
		console.log('update-game')
		let game
		try {
			game = await db.collection('games').findOne({
				status: GAME_STATUS.STARTED,
				gameId: data.game.gameId,
			})
			if (!game) {
				return socket.emit('user-error', '#16 Game not found with that id')
			}
		} catch (e) {
			return socket.emit('user-error', '#17 Error searching for the game requested')
		}

		// Check if users are still active
		const stillActive = checkActiveSockets(game.player1.socketId, game.player2.socketId)
		if (!stillActive) return
		const playerNumber = getPlayerNumber(socket.id, game)
		if (playerNumber === 0) {
			return socket.emit('user-error', '#21 You are not a player of this particular game')
		}

		switch (data.action) {
			// Invoke requires data.card that was invoked
			case 'INVOKE_PLAYER1':
				if (!data.card) return socket.emit('#20 You must send the card to invoke')
				// Update game object, send the invoke event to the player 2
				try {
					await db.collection('games').updateOne(game, {
						$set: {

						}
					})
				} catch (e) {
					return socket.emit('user-error', '#22 Error updating the game data')
				}
				io.to().emit('invoke-player1', data.card)
				break
			case 'INVOKE_PLAYER2':
				if (!data.card) return socket.emit('#20 You must send the card to invoke')
				// Update game object, send the invoke event to the player 2
				socket.emit('invoke-player2', data.card)
				break
			case 'ATTACK_FIELD_PLAYER1_TO_PLAYER2':
				break
			case 'ATTACK_FIELD_PLAYER2_TO_PLAYER1':
				break
			case 'ATTACK_DIRECT_PLAYER1_TO_PLAYER2':
				break
			case 'ATTACK_DIRECT_PLAYER2_TO_PLAYER1':
				break
			case 'END_TURN_PLAYER1':
				break
			case 'END_TURN_PLAYER2':
				break
			case 'DRAW_PLAYER1':
				break
			case 'DRAW_PLAYER2':
				break
		}
	})
	socket.on('get-game-list', async () => {
		// Check the innactive socket ids and delete those
		await removeInactiveGames()

		try {
			// Send the non-started games
			const gameList = await db
				.collection('games')
				.find({
					status: GAME_STATUS.CREATED,
				})
				.toArray()
			socket.emit('receive-game-list', gameList)
		} catch (e) {
			return socket.emit('user-error', '#13 Error getting the game list, try again')
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
	socket.on('end-turn', async data => {
		// Check if users are still active
		const stillActive = checkActiveSockets(data.game.player1.socketId, data.game.player2.socketId)
		if (!stillActive) return
		const playerNumber = getPlayerNumber(socket.id, data.game)
		let updatedCanAttackField
		let set = {
			'player1.turn': data.game.player1.turn,
			'player1.field': data.game.player1.field,
			'player2.turn': data.game.player2.turn,
			'player2.field': data.game.player2.field,
		}
		if (playerNumber === 0) {
			return socket.emit('user-error', '#21 You are not a player of this particular game')
		} else if (playerNumber === 1) {
			updatedCanAttackField = data.game.player2.field.map(card => {
				card.canAttack = true
				return card
			})
			set = {
				'player2.field': updatedCanAttackField,
				'player2.energy': data.game.player2.energy + GAME_CONFIG.energyPerTurn,
			}
		} else {
			updatedCanAttackField = data.game.player1.field.map(card => {
				card.canAttack = true
				return card
			})
			set = {
				'player1.field': updatedCanAttackField,
				'player1.energy': data.game.player1.energy + GAME_CONFIG.energyPerTurn,
			}
		}
		// Update other player's field cards to set canAttack to true
		// Send start turn to the other player with the updated game
		try {
			await db.collection('games').findOneAndUpdate({
				gameId: data.game.gameId,
			}, {
				$set: set,
			})
		} catch (e) {
			return socket.emit('user-error', '#25 Error ending turn, try again')
		}
		// Send the start turn
		if (playerNumber === 1) {
			io.to(data.game.player2.socketId).emit('start-turn')
		} else {
			io.to(data.game.player1.socketId).emit('start-turn')
		}
	})
	socket.on('draw-card', async data => {
		console.log('draw hand BY', socket.id)
		// Check if users are still active
		const stillActive = checkActiveSockets(data.game.player1.socketId, data.game.player2.socketId)
		if (!stillActive) return
		const playerNumber = getPlayerNumber(socket.id, data.game)
		const newCard = generateOneCard(Math.random()+1, playerNumber)
		let copyHand = []
		let updatedGame
		try {
			updatedGame = await db.collection('games').findOne({
				gameId: data.game.gameId,
			})
		} catch (e) {
			return socket.emit('user-error', '#28 Game not found from the given game ID')
		}
		if (playerNumber === 0) {
			return socket.emit('user-error', '#21 You are not a player of this particular game')
		} else if (playerNumber === 1) {
			copyHand = updatedGame.player1.hand.slice(0)
			copyHand.push(newCard)
			try {
				updatedGame = await db.collection('games').findOneAndUpdate({
					gameId: data.game.gameId,
				}, {
					$set: {
						'player1.hand': copyHand,
					},
				}, {
					returnOriginal: false,
				})
				updatedGame = updatedGame.value
			} catch (e) {
				return socket.emit('user-error', '#26 Error updating the player hand after drawing')
			}
			io.to(data.game.player1.socketId).emit('draw-card-received', {
				game: updatedGame,
			})
		} else {
			copyHand = updatedGame.player2.hand.slice(0)
			copyHand.push(newCard)
			try {
				updatedGame = await db.collection('games').findOneAndUpdate({
					gameId: data.game.gameId,
				}, {
					$set: {
						'player2.hand': copyHand,
					},
				}, {
					returnOriginal: false,
				})
				updatedGame = updatedGame.value
			} catch (e) {
				return socket.emit('user-error', '#27 Error updating the player hand after drawing')
			}
			io.to(data.game.player2.socketId).emit('draw-card-received', {
				game: updatedGame,
			})
		}
	})
	socket.on('invoke-card', async data => {
		console.log('invoke card BY', socket.id)
		// Check if users are still active
		const stillActive = checkActiveSockets(data.game.player1.socketId, data.game.player2.socketId)
		if (!stillActive) return
		const playerNumber = getPlayerNumber(socket.id, data.game)
		let updatedGame
		try {
			updatedGame = await db.collection('games').findOne({
				gameId: data.game.gameId,
			})
		} catch (e) {
			return socket.emit('user-error', '#28 Game not found from the given game ID')
		}
		if (playerNumber === 0) {
			return socket.emit('user-error', '#21 You are not a player of this particular game')
		} else if (playerNumber === 1) {
			// Remove card from hand
			const cardHandIndex = updatedGame.player1.hand.findIndex(element => deepEqual(element, data.card))
			updatedGame.player1.hand.splice(cardHandIndex, 1)
			// Add card to field
			updatedGame.player1.field.push(data.card)
			// Reduce user energy or emit error if not enough energy to invoke
			updatedGame.player1.energy -= data.card.cost
			if (updatedGame.player1.energy < 0) {
				return socket.emit('user-error', "#30 You don't have enough energy to invoke this card")
			}
		} else {
			const cardHandIndex = updatedGame.player2.hand.findIndex(element => deepEqual(element, data.card))
			updatedGame.player2.hand.splice(cardHandIndex, 1)
			// Add card to field
			updatedGame.player2.field.push(data.card)
			// Reduce user energy or emit error if not enough energy to invoke
			updatedGame.player2.energy -= data.card.cost
			if (updatedGame.player2.energy < 0) {
				return socket.emit('user-error', "#31 You don't have enough energy to invoke this card")
			}
		}
		let final
		try {
			final = await db.collection('games').findOneAndUpdate({
				gameId: data.game.gameId,
			}, {
				$set: {
					player1: updatedGame.player1,
					player2: updatedGame.player2,
				}
			}, {
				returnOriginal: false,
			})
		} catch (e) {
			return socket.emit('user-error', '#29 Error updating the field with the invoked card')
		}
		io.to(data.game.player1.socketId).emit('card-invoke-received', {
			game: final.value,
		})
		return io.to(data.game.player2.socketId).emit('card-invoke-received', {
			game: final.value,
		})
	})
	socket.on('attacked-field', async data => {
		console.log('attack field BY', socket.id)
		// Check if users are still active
		const stillActive = checkActiveSockets(data.game.player1.socketId, data.game.player2.socketId)
		if (!stillActive) return
		const playerNumber = getPlayerNumber(socket.id, data.game)
		let updatedGame
		let final
		// Check if the game exists
		try {
			updatedGame = await db.collection('games').findOne({
				gameId: data.game.gameId,
			})
		} catch (e) {
			return socket.emit('user-error', '#28 Game not found from the given game ID')
		}
		if (playerNumber === 0) {
			return socket.emit('user-error', '#21 You are not a player of this particular game')
		}
		try {
			final = await db.collection('games').findOneAndUpdate({
				gameId: data.game.gameId,
			}, {
				$set: {
					'player1.field': data.game.player1.field,
					'player2.field': data.game.player2.field,
				}
			}, {
				returnOriginal: false,
			})
		} catch (e) {
			return socket.emit('user-error', '#31 Error updating the game data')
		}
		if (playerNumber === 1) {
			io.to(data.game.player2.socketId).emit('attack-field-received', {
				game: final.value,
			})
		} else {
			io.to(data.game.player1.socketId).emit('attack-field-received', {
				game: final.value,
			})
		}
	})
	socket.on('attack-direct', async data => {
		console.log('attack direct BY', socket.id)
		// Check if users are still active
		const stillActive = checkActiveSockets(data.game.player1.socketId, data.game.player2.socketId)
		if (!stillActive) return
		const playerNumber = getPlayerNumber(socket.id, data.game)
		let final
		let isGameOver
		let winner
		let set
		// Check if the game exists
		try {
			await db.collection('games').findOne({
				gameId: data.game.gameId,
			})
		} catch (e) {
			return socket.emit('user-error', '#28 Game not found from the given game ID')
		}
		if (playerNumber === 0) {
			return socket.emit('user-error', '#21 You are not a player of this particular game')
		}

		// Check if the life is gone and if so end the game
		if (data.game.player1.life <= 0 || data.game.player2.life <= 0) {
			isGameOver = true
			data.game.player1.life <= 0 ? winner = 2 : winner = 1
			set = {
				status: GAME_STATUS.ENDED,
				'player1.field': data.game.player1.field,
				'player1.life': data.game.player1.life,
				'player2.field': data.game.player2.field,
				'player2.life': data.game.player2.life,
			}
		} else {
			set = {
				'player1.field': data.game.player1.field,
				'player1.life': data.game.player1.life,
				'player2.field': data.game.player2.field,
				'player2.life': data.game.player2.life,
			}
		}
		try {
			final = await db.collection('games').findOneAndUpdate({
				gameId: data.game.gameId,
			}, {
				$set: set,
			}, {
				returnOriginal: false,
			})
		} catch (e) {
			return socket.emit('user-error', '#31 Error updating the game data')
		}

		// End the game
		if (isGameOver) return endGame(io, final.value, winner)

		if (playerNumber === 1) {
			io.to(data.game.player2.socketId).emit('attack-direct-received', {
				game: final.value,
			})
		} else {
			io.to(data.game.player1.socketId).emit('attack-direct-received', {
				game: final.value,
			})
		}
	})
})

// Returns 0 if it's not any of them
const getPlayerNumber = (socketId, game) => {
	if (socketId === game.player1.socketId) {
		return 1
	} else if (socketId === game.player2.socketId) {
		return 2
	} else {
		return 0
	}
}

// Returns false if one or more are innactive
const checkActiveSockets = (socketId1, socketId2) => {
	const position = activeSockets.map(soc => soc.id).indexOf(socketId1)
	const position2 = activeSockets.map(soc => soc.id).indexOf(socketId2)
	if (position == -1) {
		io.to(socketId1).emit('user-error', '#18 Player 1 left the game therefore player 2 wins')
		io.to(socketId2).emit('user-error', '#18 Player 1 left the game therefore player 2 wins')
		// TODO complete the game ending functionality by sending the rewards to the player 2
		return false
	}
	if (position2 == -1) {
		io.to(socketId1).emit('user-error', '#19 Player 2 left the game therefore player 1 wins')
		io.to(socketId2).emit('user-error', '#19 Player 2 left the game therefore player 1 wins')
		// TODO complete the game ending functionality by sending the rewards to the player 1
		return false
	}
	return true
}

const removeInactiveGames = async () => {
	try {
		const createdGames = await db.collection('games').find({
			status: GAME_STATUS.CREATED
		}).toArray()
		// Check if the pending games have active socket users or not and delete them
		createdGames.map(async game => {
			const position = activeSockets.map(soc => soc.id).indexOf(game.player1.socketId)
			if (position == -1) {
				try {
					await db.collection('games').deleteOne(game)
				} catch (e) {}
			}
		})
	} catch (e) {
		console.log('Err removing innactive games', e)
	}
}

const cancelGame = async socket => {
	console.log('cancel-create-game')
	// Remove game from the db by using users' socket id only if the game is unstarted
	try {
		const gamesWithUserAccount = await db.collection('users').find({
			socket: socket.id,
		}).toArray()
		if (gamesWithUserAccount > 0) {
			// Note that subfields, i.e. nested objects must be searched with the dot notation if the nested object has many fields and you're only interested in one
			await db.collection('games').deleteMany({
				status: GAME_STATUS.CREATED,
				'player1.account': gamesWithUserAccount[0].account,
			})
		}
		socket.emit('game-deleted-successfully')
	} catch (e) {
		console.log('error', e)
		socket.emit('user-error', '#9 Error deleting the game try again later')
	}
}

// Min and max inclusive both
const randomRange = (min, max) => {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

const generateOneCard = (index, playerNumberOwner) => {
	let life = randomRange(globalMinLife, globalMaxLife)
	let attack = randomRange(globalMinAttack, globalMaxAttack)
	let type = globalCardTypes[randomRange(0, globalCardTypes.length - 1)]
	// The cost is calculated based on the value of attack and life
	// There's a minimum cost of 1
	// Each point in life above 10 adds 0.5 cost
	// Each point in attack above 5 adds 1 cost
	// So a 18 life and 10 attack would cost 10 points
	let addAttackPoints = 0
	let addLifePoints = (life % 10 / 2)
	if (attack >= 10) addAttackPoints = 5
	else if (attack > 5) addAttackPoints = attack % 5
	let cost = 1 + addLifePoints + addAttackPoints

	let card = {
		id: `card-${index + 1}`,
		isInvoked: false,
		canAttack: false,
		cost,
		life,
		attack,
		type,
		playerNumberOwner,
	}
	return card
}

const generateInitialCards = () => {
	let cardsPlayer1 = []
	let cardsPlayer2 = []
	for (let i = 0; i < GAME_CONFIG.initialCardsInHand; i++) {
		const card = generateOneCard(i, 1)
		cardsPlayer1.push(card)
	}

	for (let i = 0; i < GAME_CONFIG.initialCardsInHand; i++) {
		const card = generateOneCard(GAME_CONFIG.initialCardsInHand+i, 2)
		cardsPlayer2.push(card)
	}
	return { cardsPlayer1, cardsPlayer2 }
}

const endGame = (io, final, winner) => {
	// Send the winner emit event
	io.to(final.player1.socketId).emit('game-over', {
		winner,
		game: final,
	})
	io.to(final.player2.socketId).emit('game-over', {
		winner,
		game: final,
	})
	// TODO Send earned YTX tokens to the winner while keeping a 10% to the game treasury, dev treasury and LP Locked fees
}

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
