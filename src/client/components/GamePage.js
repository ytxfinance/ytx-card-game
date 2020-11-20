import React, { useContext, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GAME_CONFIG from '../../../GAME_CONFIG.json'
import { store } from './Store'
const FIELD_SIZE = GAME_CONFIG.maxCardsInField
const MIN_CARD_LIFE = GAME_CONFIG.minCardLife
const MAX_CARD_LIFE = GAME_CONFIG.maxCardLife
const MAX_CARD_ATTACK = GAME_CONFIG.maxCardAttack
const MIN_CARD_ATTACK = GAME_CONFIG.minCardAttack
const CARD_TYPES = ['fire', 'water', 'wind', 'life', 'death', 'neutral']

// The individual Card component
const Card = props => {
    const { state } = useContext(store)
    
    let isAllyCard = state.playerNumber === props.playerNumberOwner
	// If the card is ally, display the attack button or invoke, else don't display actions
    let buttonToDisplay
	if (props.isInvoked && isAllyCard) {
		buttonToDisplay = (
			<button
				disabled={!props.canAttack || state.isOtherPlayerTurn}
				onClick={() => {
					props.toggleAttackMode(props)
				}}
			>
				Attack
			</button>
		)
	} else if (isAllyCard) {
		buttonToDisplay = (
			<button
				disabled={state.isOtherPlayerTurn}
				onClick={() => {
					props.invokeCard(props)
				}}
			>
				invoke
			</button>
		)
	}
	return (
		<div className={'card ' + props.type} data-id={props.dataId}>
			<div>cost: {props.cost}</div>
			<div>life: {props.life}</div>
			<div>attack: {props.attack}</div>
			<div>type: {props.type}</div>
			<div className='spacer'></div>
			{ buttonToDisplay }
		</div>
	)
}

const GameView = props => {
	const { state } = useContext(store)

	return (
		<div className='page game-page'>
			<h1
				className={
					state.gameOver && state.areYouTheWinner
						? 'winner-message'
						: state.gameOver && !state.areYouTheWinner
						? 'loser-message'
						: ''
				}
			>
				{state.gameOver && state.areYouTheWinner
					? 'Congratulations! You are the winner!'
					: state.gameOver && !state.areYouTheWinner
					? 'You lost! Better luck next time!'
					: 'Game On'}
			</h1>
			<Link
				className={state.gameOver ? 'margin-bot button-like' : 'hidden'}
				to='/'
			>
				Exit
			</Link>
			<div className='game'>
				<div
					className={
						state.isAttackMode ? 'enemy-stats attack-mode' : 'enemy-stats'
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
				</div>
				<div className='my-stats'>
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
				</div>
				<div className='cards-container enemy-cards-container'>
					{state.visualEnemyHand}
				</div>
				<div className='field'>
					<div
						className={
							state.isAttackMode ? 'enemy-field attack-mode' : 'enemy-field'
						}
					>
						{state.enemyFieldHtml}
					</div>
					<div className='friendly-field'>{state.allyFieldHtml}</div>
				</div>
				<div className='cards-container ally-cards-container'>
					{state.visualAllyHand}
				</div>
				<button
					className='end-turn'
					disabled={state.isOtherPlayerTurn}
					onClick={() => {
						props.endTurn()
					}}
				>
					End Turn
				</button>
			</div>
		</div>
	)
}

export default () => {
	const { state, dispatch } = useContext(store)

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
        let visualEnemyHand
        let visualAllyHand
        if (state.playerNumber === 2) {
            visualEnemyHand = state.game.player1.hand.map(() => (
                <div className='card' key={Math.random()}></div>
            ))
            visualAllyHand = generateHandCards(state.game.player2.hand, 2)
        } else {
            visualEnemyHand = state.game.player2.hand.map(() => (
                <div className='card' key={Math.random()}></div>
            ))
            visualAllyHand = generateHandCards(state.game.player1.hand, 1)
        }
        dispatch({
            type: 'SET_HAND_CARDS',
            payload: {
                visualEnemyHand,
                visualAllyHand,
            },
        })
        const { allyFieldHtml, enemyFieldHtml } = generateFieldCards(
            state.playerNumber,
            state.game.player1.field,
            state.game.player2.field,
            state.isOtherPlayerTurn
        )
        dispatch({
            type: 'SET_FIELDS',
            payload: {
                allyFieldHtml,
                enemyFieldHtml,
            },
        })
	}, [state.game])

	// Checked
	const generateFieldCards = (
		playerNumber,
		player1Field,
		player2Field,
		isOtherPlayerTurn
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
				<div className='field-item' key={i + Math.random()}>
					{allySortedField[i] ? (
						<Card
							dataId={allySortedField[i].id}
							key={allySortedField[i].id}
							{...allySortedField[i]}
							turnEnded={isOtherPlayerTurn}
						/>
					) : (
						''
					)}
				</div>
			)
			enemyFieldHtml.push(
				<div
					className='field-item'
					key={i + Math.random()}
					onClick={e => {
						if (props.isAttackMode) props.attackField(e.currentTarget)
					}}
				>
					{enemySortedField[i] ? (
						<Card
							dataId={enemySortedField[i].id}
							key={enemySortedField[i].id}
							{...enemySortedField[i]}
							turnEnded={isOtherPlayerTurn}
						/>
					) : (
						''
					)}
				</div>
			)
		}

		return { allyFieldHtml, enemyFieldHtml }
	}

	const generateHandCards = (handCards, playerNumberOwner) => {
		let cards =
			handCards.length > 0
				? handCards.map(card => (
						<Card
							{...card}
							key={card.id}
							dataId={card.id}
                            invokeCard={() => invokeCard(card)}
                            playerNumberOwner={playerNumberOwner}
							// toggleAttackMode={propsCard => {
							//     toggleAttackMode(propsCard)
							// }}
						/>
				  ))
				: [<div className='card' key={Math.random()}></div>]
		return cards
	}

	const setListeners = () => {
		state.socket.on('start-turn', () => {
			dispatch({
				type: 'SET_IS_OTHER_PLAYER_TURN',
				payload: {
					isOtherPlayerTurn: false,
				},
			})
			drawCard()
		})
		state.socket.on('draw-card-received', data => {
			dispatch({
				type: 'SET_GAME',
				payload: {
					game: data.game,
				},
			})
		})
		state.socket.on('card-invoke-received', data => {
			dispatch({
				type: 'SET_GAME',
				payload: {
					game: data.game,
				},
			})
		})
	}

	const endTurn = () => {
		const game = { ...state.game }
		if (state.playerNumber === 1) {
			game.player1.turn++
			// Add a fake card for visual purposes
			game.player2.hand.push({})
		} else {
			game.player2.turn++
			// Add a fake card for visual purposes
			game.player1.hand.push({})
		}
		dispatch({
			type: 'SET_IS_OTHER_PLAYER_TURN',
			payload: {
				isOtherPlayerTurn: true,
			},
		})
		dispatch({
			type: 'SET_GAME',
			payload: {
				game,
			},
		})
		state.socket.emit('end-turn', {
			game,
		})
	}

	const drawCard = () => {
		// We just check the socket id to determine which user is drawing
		state.socket.emit('draw-card', {
			game: state.game,
		})
	}

	const invokeCard = card => {
		console.log('invoke card', card)
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
					error: "You don't have enough energy to invoke this card",
				},
			})
        }
        card.isInvoked = true
		state.socket.emit('invoke-card', {
			game: state.game,
			card,
		})
	}

	return (
		<GameView
			// {...this.state}
			// invokeCard={card => invokeCard(card, state.playerNumber === 1 ? state.game.player1 : state.game.player2)}
			// toggleAttackMode={card => toggleAttackMode(card)}
			// attackDirectly={() => this.attackDirectly()}
			// attackField={target => this.attackField(target)}
			endTurn={() => endTurn()}
		/>
	)
}
