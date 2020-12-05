import React, { useContext, useState, useEffect } from 'react'
import { store } from '../store/Store'

export default () => {
	const { state, dispatch } = useContext(store)
	const [gameName, setGameName] = useState('Game')
	const [isWaiting, setIsWaiting] = useState(false)

	useEffect(() => {
		// When the user leaves, cancel any existing games
		window.addEventListener('beforeunload', () => {
			state.socket.emit('cancel-create-game')
		})
	}, [])

	const createGame = async () => {
		setIsWaiting(false)
		if (state.ytxBet == 0) {
			return dispatch({
				type: 'SET_ERROR',
				payload: {
					error: 'You need to bet some YTX tokens to create the game',
				},
			})
		} else {
			dispatch({
				type: 'SET_ERROR',
				payload: {
					error: '',
				},
			})
		}
		const gameData = {
			ytxBet: state.ytxBet,
			account: state.account,
			gameName,
		}
		state.socket.emit('create-game', gameData)
		setIsWaiting(true)
	}

	const cancelCreateGame = async () => {
		// It detects the game created by the socket id and cancels that one
		state.socket.emit('cancel-create-game')
		setIsWaiting(true)
	}

	return (
		<div className="page welcome-page">
			<h1>Create a game</h1>
			<div className={isWaiting ? 'link-container' : 'hidden'}>
				<b className={isWaiting ? '' : 'hidden'}>
					The game will start automatically as soon as someone joins
					your game.
					<br />
					Waiting for players...
					<br />
					<br />
				</b>
				<button
					type="button"
					className="boxy-link"
					onClick={() => cancelCreateGame()}
				>
					Cancel Game
				</button>
			</div>
			<div className={isWaiting ? 'hidden' : 'link-container'}>
				<p>
					Set how many YTX you want to bet for the game, press the
					button below to create a game.
				</p>
				<input
					type="text"
					className="margin-bot"
					placeholder="Game name..."
					onChange={(e) => {
						setGameName(e.target.value)
					}}
				/>
				<input
					type="number"
					className="margin-bot"
					placeholder="Your YTX bet..."
					onChange={(e) => {
						dispatch({
							type: 'SET_YTX_BET',
							payload: {
								ytxBet: e.target.value,
							},
						})
					}}
				/>
				<button
					type="button"
					className="boxy-link"
					onClick={() => createGame()}
				>
					Create
				</button>
			</div>
		</div>
	)
}
