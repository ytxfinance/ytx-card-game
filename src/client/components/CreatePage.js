import React, { useContext, useState, useEffect } from 'react'
import styled from 'styled-components'
import { store } from './Store'

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
		<Page>
			<h1>Create a game</h1>
			<LinkContainer hidden={!isWaiting}>
				<b className={isWaiting ? '' : 'hidden'}>
					The game will start automatically as soon as someone joins
					your game.
					<br />
					Waiting for players...
					<br />
					<br />
				</b>
				<BoxyLink type="button" onClick={() => cancelCreateGame()}>
					Cancel Game
				</BoxyLink>
			</LinkContainer>
			<LinkContainer hidden={isWaiting}>
				<p>
					Set how many YTX you want to bet for the game, press the
					button below to create a game.
				</p>
				<Input
					type="text"
					placeholder="Game name..."
					onChange={(e) => {
						setGameName(e.target.value)
					}}
				/>
				<Input
					type="number"
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
				<BoxyLink type="button" onClick={() => createGame()}>
					Create
				</BoxyLink>
			</LinkContainer>
		</Page>
	)
}

const Page = styled.div`
	box-shadow: 0 0 30px 0 lightgrey;
	padding: 50px;
	border-radius: 10px;
	text-align: center;
	margin: 0 auto;
	min-width: 250px;
	max-width: 550px;

	h1 {
		margin-top: 0;
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
	min-width: 200px;

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
const BoxyLink = styled(Button)`
	color: white;
	text-decoration: none;
	padding: 20px 0;
	width: 100%;
	text-align: center;
	background-color: #444444;

	&:hover {
		background-color: #2e2e2e;
	}

	&:active {
		color: whitesmoke;
		background-color: #000000;
	}
`
const LinkContainer = styled.div`
	display: flex;
	flex-direction: column;
	display: ${(props) => (props.hidden ? 'none' : 'block')};

	a:not(:last-child) {
		margin-bottom: 10px;
	}
`
const Input = styled.input`
	padding: 20px;
	border-radius: 10px;
	font-size: 15pt;
	border: 1px solid lightgrey;
	width: 100%;
	box-sizing: border-box;
	margin-bottom: 20px;
`