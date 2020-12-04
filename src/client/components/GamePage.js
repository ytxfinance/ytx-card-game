import React, { useContext, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import GAME_CONFIG from '../../../GAME_CONFIG.json'
import { store } from './Store'
const HAND_SIZE = GAME_CONFIG.maxCardsInHand
const FIELD_SIZE = GAME_CONFIG.maxCardsInField
const MIN_CARD_LIFE = GAME_CONFIG.minCardLife
const MAX_CARD_LIFE = GAME_CONFIG.maxCardLife
const MAX_CARD_ATTACK = GAME_CONFIG.maxCardAttack
const MIN_CARD_ATTACK = GAME_CONFIG.minCardAttack
const SECONDS_PER_TURN = GAME_CONFIG.secondsPerTurn
const CARD_TYPES = ['fire', 'water', 'wind', 'life', 'death', 'neutral']

// The individual Card component
const Card = (props) => {
	const { state } = useContext(store)

	const isGamePaused = () => state.game && state.game.gamePaused

	let isAllyCard = state.playerNumber === props.playerNumberOwner
	// If the card is ally, display the attack button or invoke, else don't display actions
	let buttonToDisplay
	if (props.isInvoked && isAllyCard) {
		buttonToDisplay = (
			<CardButton
				mtop
				disabled={
					!props.canAttack ||
					state.isOtherPlayerTurn ||
					isGamePaused()
				}
				onClick={() => {
					props.toggleAttackMode(props.cardId)
				}}
			>
				Attack
			</CardButton>
		)
	} else if (isAllyCard) {
		buttonToDisplay = (
			<div>
				<CardButton
					disabled={state.isOtherPlayerTurn || isGamePaused()}
					onClick={() => {
						props.invokeCard()
					}}
				>
					Invoke
				</CardButton>
				<CardButton
					style={{
						backgroundColor: '#ffad04',
					}}
					disabled={state.isOtherPlayerTurn || isGamePaused()}
					onClick={() => {
						props.burnCardOnHand(props.cardId)
					}}
				>
					Burn
				</CardButton>
			</div>
		)
	}
	return (
		<StyledCard className={props.type} data-id={props.dataId}>
			<div>cost: {props.cost}</div>
			<div>life: {props.life}</div>
			<div>attack: {props.attack}</div>
			<div>type: {props.type}</div>
			<div className="spacer"></div>
			{buttonToDisplay}
		</StyledCard>
	)
}

const Board = (props) => {
	const { state } = useContext(store)
	const isGamePaused = () => state.game && state.game.gamePaused

	return (
		<Page>
			<ResultMsg
				winner={state.gameOver && state.areYouTheWinner}
				loser={state.gameOver && !state.areYouTheWinner}
			>
				{state.gameOver && state.areYouTheWinner
					? 'Congratulations! You are the winner!'
					: state.gameOver && !state.areYouTheWinner
					? 'You lost! Better luck next time!'
					: 'Game On'}
			</ResultMsg>
			<p>Turn: {state.game ? state.game.currentTurnNumber : 0}</p>
			<p>Timer: {props.turnCountdownTimer}</p>
			<ExitLink hidden={!state.gameOver} to="/">
				Exit
			</ExitLink>
			{state.game ? (
				<Game className="game">
					<EnemyStatsBox
						className={
							state.isAttackMode
								? 'enemy-stats attack-mode'
								: 'enemy-stats'
						}
						onClick={() => {
							if (state.isAttackMode) props.attackDirectly()
						}}
					>
						<p>Enemy</p>
						<p>
							{state.playerNumber === 1
								? state.game.player2.life
								: state.game.player1.life}
							&nbsp;HP
						</p>
						<p>
							{state.playerNumber === 1
								? state.game.player2.energy
								: state.game.player1.energy}
							&nbsp;Energy
						</p>
					</EnemyStatsBox>
					<AllyStatsBox className="my-stats">
						<p>You</p>
						<p>
							{state.playerNumber === 1
								? state.game.player1.life
								: state.game.player2.life}
							&nbsp;HP
						</p>
						<p>
							{state.playerNumber === 1
								? state.game.player1.energy
								: state.game.player2.energy}
							&nbsp;Energy
						</p>
					</AllyStatsBox>
					<CardContainer className="cards-container enemy-cards-container">
						{state.visualEnemyHand}
					</CardContainer>
					<Field className="field">
						<EnemyField
							className={
								state.isAttackMode
									? 'enemy-field attack-mode'
									: 'enemy-field'
							}
						>
							{state.enemyFieldHtml}
						</EnemyField>
						<FriendlyField className="friendly-field">
							{state.allyFieldHtml}
						</FriendlyField>
					</Field>
					<CardContainer className="cards-container ally-cards-container">
						{state.visualAllyHand}
					</CardContainer>
					<ActionContainer className="actions-container">
						<Button
							className="end-turn"
							disabled={state.isOtherPlayerTurn || isGamePaused()}
							onClick={() => {
								props.endTurn()
							}}
						>
							End Turn
						</Button>
						<Button
							className="end-turn"
							style={{
								backgroundColor: 'red',
								marginTop: '10px',
							}}
							disabled={isGamePaused()}
							onClick={() => {
								props.surrender()
							}}
						>
							Surrender
						</Button>
					</ActionContainer>
				</Game>
			) : (
				<p>Game loading...</p>
			)}
		</Page>
	)
}

export default () => {
	const { state, dispatch } = useContext(store)
	const [gameOver, setGameOver] = useState(null)
	const [showTimeout, setShowTimeout] = useState(null)
	const [turnCountdownTimer, setTurnCountdownTimer] = useState(
		SECONDS_PER_TURN,
	)
	const isGamePaused = () => state.game && state.game.gamePaused

	useEffect(() => {
		if (state.playerNumber === 2) {
			dispatch({
				type: 'SET_IS_OTHER_PLAYER_TURN',
				payload: {
					isOtherPlayerTurn: true,
				},
			})
		}
		setListeners()
	}, [])

	useEffect(() => {
		window.clearTimeout(showTimeout)
		if (state.showError) {
			const timeout = setTimeout(() => {
				dispatch({
					type: 'SET_SHOW_ERROR',
					payload: {
						showError: false,
					},
				})
			}, 3e3)
			setShowTimeout(timeout)
		}
	}, [state.showError])

	/**
	 * @dev On render and new-turn a timer will countdown how long left the player has to make a move
	 */
	useEffect(() => {
		const countdownTimer = setTimeout(() => {
			if (isGamePaused()) return

			const turnTimeLimit = new Date(
				state.game.currentTurnTimeLimitTimestamp,
			)

			if (turnCountdownTimer <= 0 && !state.isOtherPlayerTurn) {
				endTurn()
				setTurnCountdownTimer(SECONDS_PER_TURN)
				return
			}
			const newTime = Math.ceil(
				(turnTimeLimit.getTime() - Date.now()) / 1000,
			)

			// If for whatever reason the newTime is negative we will set it to 0
			if (newTime < 0) {
				setTurnCountdownTimer(0)
				return
			}
			setTurnCountdownTimer(newTime)
		}, 1000)
		return () => {
			clearTimeout(countdownTimer)
		}
	}, [turnCountdownTimer])

	useEffect(() => {
		if (!state.game) return

		let visualEnemyHand
		let visualAllyHand
		if (state.playerNumber === 2) {
			visualEnemyHand =
				state.game.player1.hand.length > 0
					? state.game.player1.hand.map(() => (
							<StyledCard key={Math.random()}></StyledCard>
					  ))
					: [<EmptyHand key={Math.random()}>Empty hand</EmptyHand>]
			visualAllyHand = generateHandCards(state.game.player2.hand, 2)
		} else {
			visualEnemyHand =
				state.game.player2.hand.length > 0
					? state.game.player2.hand.map(() => (
							<StyledCard key={Math.random()}></StyledCard>
					  ))
					: [<EmptyHand key={Math.random()}>Empty hand</EmptyHand>]
			visualAllyHand = generateHandCards(state.game.player1.hand, 1)
		}
		dispatch({
			type: 'SET_HAND_CARDS',
			payload: {
				visualEnemyHand,
				visualAllyHand,
			},
		})
	}, [state.game, state.isAttackMode])

	// When the attack mode is activate, regenerate the field
	useEffect(() => {
		if (!state.game) return

		const { allyFieldHtml, enemyFieldHtml } = generateFieldCards(
			state.playerNumber,
			state.game.player1.field,
			state.game.player2.field,
			state.isOtherPlayerTurn,
		)
		dispatch({
			type: 'SET_FIELDS',
			payload: {
				allyFieldHtml,
				enemyFieldHtml,
			},
		})
	}, [state.game, state.isAttackMode])

	// Checked
	const generateFieldCards = (
		playerNumber,
		player1Field,
		player2Field,
		isOtherPlayerTurn,
	) => {
		console.log('generate field cards')
		let allySortedField = Array(FIELD_SIZE).fill(0)
		let enemySortedField = Array(FIELD_SIZE).fill(0)
		let allyFieldHtml = []
		let enemyFieldHtml = []

		// Sort the array so that cards are positioned in the middle
		if (player1Field.length > 0) {
			let mid = Math.floor(FIELD_SIZE / 2)
			let sidesSize = 1
			for (let i = 0; i < FIELD_SIZE; i++) {
				// Go mid, then right, if there's item right move left, if there's left move right + 1 and so on
				if (i == 0) {
					allySortedField[mid] = player1Field[i]
				} else if (player1Field[i]) {
					// If there's a card to the right move to the left
					if (allySortedField[mid + sidesSize]) {
						allySortedField[mid - sidesSize] = player1Field[i]
						sidesSize++
					} else {
						allySortedField[mid + sidesSize] = player1Field[i]
					}
				}
			}
		}

		if (player2Field.length > 0) {
			let mid = Math.floor(FIELD_SIZE / 2)
			let sidesSize = 1
			for (let i = 0; i < FIELD_SIZE; i++) {
				if (i == 0) {
					enemySortedField[mid] = player2Field[i]
				} else if (player2Field[i]) {
					// If there's a card to the right move to the left
					if (enemySortedField[mid + sidesSize]) {
						enemySortedField[mid - sidesSize] = player2Field[i]
						sidesSize++
					} else {
						enemySortedField[mid + sidesSize] = player2Field[i]
					}
				}
			}
		}

		// Swap fields if you're player 2
		if (playerNumber == 2) {
			const temp = allySortedField
			allySortedField = enemySortedField
			enemySortedField = temp
		}

		// Populate ally field with ally invoked cards or empty placeholders
		for (let i = 0; i < FIELD_SIZE; i++) {
			allyFieldHtml.push(
				<FieldItem
					className={allySortedField[i] ? 'field-item' : 'field-item empty-item'}
					key={i + Math.random()}
				>
					{allySortedField[i] ? (
						<Card
							{...allySortedField[i]}
							dataId={allySortedField[i].id}
							key={allySortedField[i].id}
							turnEnded={isOtherPlayerTurn}
							playerNumberOwner={
								allySortedField[i].playerNumberOwner
							}
							toggleAttackMode={() => {
								toggleAttackMode(allySortedField[i].id)
							}}
						/>
					) : (
						''
					)}
				</FieldItem>,
			)
			enemyFieldHtml.push(
				<FieldItem
					className={enemySortedField[i] ? 'field-item' : 'field-item empty-item'}
					key={i + Math.random()}
					onClick={(e) => {
						if (enemySortedField[i]) attackField(e.currentTarget)
					}}
				>
					{enemySortedField[i] ? (
						<Card
							{...enemySortedField[i]}
							dataId={enemySortedField[i].id}
							key={enemySortedField[i].id}
							turnEnded={isOtherPlayerTurn}
							playerNumberOwner={
								enemySortedField[i].playerNumberOwner
							}
							toggleAttackMode={() => {
								toggleAttackMode(enemySortedField[i].id)
							}}
						/>
					) : (
						''
					)}
				</FieldItem>,
			)
		}

		return { allyFieldHtml, enemyFieldHtml }
	}

	const generateHandCards = (handCards, playerNumberOwner) => {
		let cards =
			handCards.length > 0
				? handCards.map((card) => (
						<Card
							{...card}
							key={card.id}
							dataId={card.id}
							invokeCard={() => invokeCard(card)}
							playerNumberOwner={playerNumberOwner}
							toggleAttackMode={() => {
								toggleAttackMode(card.id)
							}}
							burnCardOnHand={() => {
								burnCardOnHand(card.id)
							}}
						/>
				  ))
				: [<EmptyHand key={Math.random()}>Empty hand</EmptyHand>]
		return cards
	}

	const setListeners = () => {
		state.socket.on('set-state', (data) => {
			console.log('set-state data', data)

			if (data.game) {
				dispatch({
					type: 'SET_GAME',
					payload: {
						game: data.game,
					},
				})
			}

			if (data.isOtherPlayerTurn) {
				dispatch({
					type: 'SET_IS_OTHER_PLAYER_TURN',
					payload: {
						isOtherPlayerTurn: data.isOtherPlayerTurn,
					},
				})
			}
		})
		state.socket.on('new-turn', (game) => {
			if (state.playerNumber === game.currentPlayerTurn) {
				dispatch({
					type: 'SET_IS_OTHER_PLAYER_TURN',
					payload: {
						isOtherPlayerTurn: false,
					},
				})
				drawCard()
			} else {
				dispatch({
					type: 'SET_IS_OTHER_PLAYER_TURN',
					payload: {
						isOtherPlayerTurn: true,
					},
				})
			}

			dispatch({
				type: 'SET_GAME',
				payload: {
					game,
				},
			})

			// Restarts the countdown timer
			setTurnCountdownTimer(SECONDS_PER_TURN)
		})
		state.socket.on('draw-card-received', (game) => {
			dispatch({
				type: 'SET_GAME',
				payload: {
					game,
				},
			})
		}),
			state.socket.on('card-burned', (game) => {
				dispatch({
					type: 'SET_GAME',
					payload: {
						game,
					},
				})
			})
		state.socket.on('card-invoke-received', (game) => {
			dispatch({
				type: 'SET_GAME',
				payload: {
					game,
				},
			})
		})
		state.socket.on('attack-field-received', (game) => {
			dispatch({
				type: 'SET_GAME',
				payload: {
					game,
				},
			})
		})
		state.socket.on('attack-direct-received', (game) => {
			dispatch({
				type: 'SET_GAME',
				payload: {
					game,
				},
			})
		})
		state.socket.on('game-over', (data) => {
			dispatch({
				type: 'SET_GAME',
				payload: {
					game: data.game,
				},
			})
			// If the winner is this player, emit 'you win' message
			if (state.playerNumber === data.winner) {
				endGame(true)
			} else {
				// Emit 'you lose' message
				endGame(false)
			}
		})
	}

	const endTurn = () => {
		toggleAttackMode(0)

		dispatch({
			type: 'SET_IS_OTHER_PLAYER_TURN',
			payload: {
				isOtherPlayerTurn: true,
			},
		})
		state.socket.emit('end-turn', {
			currentGameID: state.game.gameId,
		})
	}

	const surrender = () => {
		toggleAttackMode(0)

		state.socket.emit('surrender', {
			currentGameID: state.game.gameId,
		})
	}

	const drawCard = () => {
		// We just check the socket id to determine which user is drawing
		state.socket.emit('draw-card', {
			game: state.game,
		})
	}

	const invokeCard = (card) => {
		console.log('invoke card', card)
		if (!card.isInvoked) {
			let me
			if (state.playerNumber === 1) {
				me = state.game.player1
			} else {
				me = state.game.player2
			}
			// Invokes a card into the field and updates ally hand with a new deep copy
			if (me.field.length >= FIELD_SIZE) {
				return dispatch({
					type: 'SET_ERROR',
					payload: {
						error: 'The field is full',
					},
				})
			}
			if (card.cost > me.energy) {
				return dispatch({
					type: 'SET_ERROR',
					payload: {
						error:
							"You don't have enough energy to invoke this card",
					},
				})
			}
			card.isInvoked = true
			state.socket.emit('invoke-card', {
				game: state.game,
				card,
			})
		}
	}

	/**
	 * @dev Burns the selected card on hand and refund a part of the cost as energy to the player
	 * @param {String} cardID
	 */
	const burnCardOnHand = (cardID) => {
		state.socket.emit('burn-card', {
			currentGameID: state.game.gameId,
			cardID,
			burnType: 'hand',
		})
	}

	const toggleAttackMode = (cardId) => {
		let isAttackMode = cardId == 0 ? false : !state.isAttackMode
		dispatch({
			type: 'SET_ATTACK_MODE',
			payload: {
				isAttackMode,
				attackingCardId: cardId,
			},
		})
	}

	/**
	 * @dev Handles the logic for attacking the enemy field card
	 */
	const attackField = (target) => {
		console.log('Attack Field executed')
		const currentGame = state.game
		toggleAttackMode(0)
		if (target.firstChild) {
			if (!currentGame) {
				return dispatch({
					type: 'SET_ERROR',
					payload: {
						error: 'Current game not found',
					},
				})
			}

			if (currentGame.status === 'ENDED') {
				return dispatch({
					type: 'SET_ERROR',
					payload: {
						error: 'Game is already over.',
					},
				})
			}
			state.socket.emit('attacked-field', {
				currentGameID: currentGame.gameId,
				attackingCardID: state.attackingCardId,
				enemyCardID: target.firstChild.dataset.id,
			})
		}
	}

	/**
	 * @dev Handles the logic for directly attacking the enemy player
	 */
	const attackDirectly = () => {
		console.log('Attack directly executed')
		const currentGame = state.game

		if (!currentGame) {
			return dispatch({
				type: 'SET_ERROR',
				payload: {
					error: 'Current game not found',
				},
			})
		}

		if (currentGame.status === 'ENDED') {
			return dispatch({
				type: 'SET_ERROR',
				payload: {
					error: 'Game is already over.',
				},
			})
		}

		// Disables the selected card from attacking again
		toggleAttackMode(0)

		// Notify server of attack direct action by player
		state.socket.emit('attack-direct', {
			currentGameID: currentGame.gameId,
			attackingCardID: state.attackingCardId,
		})
	}

	const endGame = (amITheWinner) => {
		if (amITheWinner) {
			// Display the you win container
			setGameOver(
				<GameOverContainer>
					<h1>You Win!</h1>
					<p>
						Congratulations you've earned 180 YTX tokens while 20
						YTX have been moved to the treasury!
					</p>
					<Button>Redeem Earnings & Exit</Button>
				</GameOverContainer>,
			)
		} else {
			// Display the you lost container
			setGameOver(
				<GameOverContainer>
					<h1>You Lose!</h1>
					<p>Too bad, you lost the game. Good luck next time!</p>
					<Link to="/">Exit</Link>
				</GameOverContainer>,
			)
		}
	}

	return (
		<>
			{gameOver}
			<Board
				attackDirectly={() => attackDirectly()}
				endTurn={() => endTurn()}
				surrender={() => surrender()}
				turnCountdownTimer={turnCountdownTimer}
			/>
		</>
	)
}

const Page = styled.div`
	box-shadow: 0 0 30px 0 lightgrey;
	padding: 50px;
	border-radius: 10px;
	text-align: center;
	margin: 0 auto;
	min-width: 250px;

	h1 {
		margin-top: 0;
	}
`
const GameOverContainer = styled.div`
	position: fixed;
	width: 80vw;
	height: 50vh;
	background-color: white;
	border: 1px solid grey;
	text-align: center;
	z-index: 10000;
	top: 25vh;
	left: 10vw;
	display: flex;
	justify-content: center;
	align-items: center;
	flex-direction: column;
`
const ExitLink = styled(Link)`
	background-color: rgb(42, 90, 162);
	border: none;
	border-radius: 10px;
	padding: 20px;
	color: white;
	cursor: pointer;
	display: inline-block;
	text-decoration: none;
	min-width: 200px;
	margin-bottom: 20px;
	display: ${(props) => (props.hidden ? 'none' : 'block')};

	&:hover {
		opacity: 0.7;
	}

	&:active {
		background-color: rgb(0, 98, 139);
	}

	&:disabled {
		background-color: rgb(105, 102, 102);
		opacity: 0.7;
		cursor: not-allowed;
	}
`
const Button = styled.button`
	background-color: rgb(42, 90, 162);
	border: none;
	border-radius: 10px;
	padding: 20px;
	color: white;
	cursor: pointer;
	display: inline-block;
	text-decoration: none;

	&:hover {
		opacity: 0.7;
	}

	&:active {
		background-color: rgb(0, 98, 139);
	}

	&:disabled {
		background-color: rgb(105, 102, 102);
		opacity: 0.7;
		cursor: not-allowed;
	}
`
const CardButton = styled(Button)`
	border: none;
	border-radius: 2px;
	padding: 4px;
	margin-top: ${props=> (props.mtop ? "10px" : "unset")};
	min-width: auto;
	width: 90%;
	font-variant: small-caps;
`
const EmptyHand = styled.div`
	height: 110px;
	display: flex;
	justify-content: center;
	align-items: center;
	color: grey;
	font-size: 14pt;
`
const StyledCard = styled.div`
	width: 92px;
	height: 125px;
	border: 1px solid #000;
	position: relative;
	bottom: 0;
	display: inline-block;

	&.fire {
		background-color: rgb(255, 125, 125);
	}

	&.water {
		background-color: rgb(125, 204, 255);
	}

	&.wind {
		background-color: rgb(176, 255, 170);
	}

	&.life {
		background-color: rgb(240, 255, 149);
	}

	&.death {
		background-color: rgb(180, 180, 180);
	}

	&.neutral {
		background-color: rgb(242, 198, 166);
	}

	&:not(:last-child) {
		margin-right: 2px;
	}

	.spacer {
		height: 5px;
	}
`
const ResultMsg = styled.h1`
	font-size: ${(props) => (props.winner || props.loser ? '18pt' : '32px')};
	color: ${(props) =>
		props.winner ? 'green' : props.loser ? 'tomato' : 'black'};
`
const FieldItem = styled.div`
	background-color: lightgrey;
	width: 120px;
	height: 150px;
	display: grid;
	justify-items: center;
	align-items: center;
`
const FriendlyField = styled.div`
	display: grid;
	grid-auto-flow: column;
	grid-gap: 5px;
	justify-items: center;
	width: 70%;
	margin: 9px auto;
`
const EnemyField = styled.div`
	display: grid;
	grid-auto-flow: column;
	grid-gap: 5px;
	justify-items: center;
	width: 70%;
	margin: 9px auto;
`
const Game = styled.div`
    width: 900px;
    min-height: 600px;
    background-color: whitesmoke;
    position: relative;
    display: grid;
    align-items: center;
    margin: 0 auto;
`
const ActionContainer = styled.div`
	position: absolute;
	right: 8px;
	min-width: 120px;
	display: flex;
	flex-direction: column;
`
const CardContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	margin: 0 auto;
	flex-wrap: wrap;
	max-width: 70%;
`
const StatsBox = styled.div`
	position: absolute;
	background-color: white;
	border-radius: 10px;
	min-width: 120px;
	box-shadow: 0 0 10px 0px #afafaf;
`
const EnemyStatsBox = styled(StatsBox)`
	top: 15px;
	left: 15px;

	&.attack-mode {
		background-color: tomato;
		cursor: pointer;
		color: white;

		&:hover {
			opacity: 0.7;
		} 
	}
`
const AllyStatsBox = styled(StatsBox)`
	bottom: 15px;
	right: 15px;
`
const Field = styled.div`
	.enemy-field.attack-mode div:not(.empty-item) {
		background-color: tomato;
		cursor: pointer;

		&:hover {
			opacity: 0.7;
		}
	}
`