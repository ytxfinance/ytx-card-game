import React, { useContext, useState, useEffect } from 'react'
import styled from 'styled-components'
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
		<Page>
			<h1>CREATE A GAME</h1>
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
					Set how many YTX you want to bet for the game, <br /> press the
					button below to create a game.
				</p>
				<InputWrapper>
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
				</InputWrapper>
				<BoxyLink type="button" onClick={() => createGame()}>
					Create
				</BoxyLink>
			</LinkContainer>
			<HowToPlay>How to play?</HowToPlay>
		</Page>
	)
}

const Page = styled.div`
	color: #fff;
	padding: 50px;
	border-radius: 10px;
	background-color: #1f1f1f;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	text-align: center;
	margin: 0 auto;
	width: 80%;
	height: 80%;

	h1 {
		margin: 0;
	}
	@media(max-width:425px){
	width: 90%;
	height: 85%;
	padding:20px;
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
	color: #000;
	text-decoration: none;
	padding: 20px 10rem;
	width: 100%;
	border-radius: 0.5rem;
	text-align: center;
	background-color: #ff8a32;
	letter-spacing:1px;
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 1px;
	text-transform: uppercase;
	white-space: nowrap;
	&:hover {
		background-color: #2e2e2e;
		color: #fff;
	}

	&:active {
		color: whitesmoke;
		background-color: #000000;
	}
	@media(max-width:560px){
		padding: 20px 5rem;
	}
`
const LinkContainer = styled.div`
	display: flex;
	flex-direction: column;
	display: ${(props) => (props.hidden ? 'none' : 'block')};
	p {
		padding: 0 3rem 2rem;
	}

	a:not(:last-child) {
		margin-bottom: 10px;
	}
	@media(max-width:768px){
		width: 100%;
	}
`
const Input = styled.input`
	padding: 20px;
	border-radius: 10px;
	font-size: 15pt;
	border: 1px solid lightgrey;
	width: 100%;
	outline: none;
	margin-bottom: 20px;
`
const InputWrapper = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	Input:first-child {
		margin-right: 10px;
		flex: 3;
		@media(max-width:768px){
			margin-right: 0;
		}
	}
	Input:last-child{
		flex: 1;
	}
	@media(max-width:768px){
		flex-direction: column;
		width: 100%;
	}
`

const HowToPlay = styled.a`
	color: #fff;
	font-weight: 900;
	font-size: 14px;
	text-decoration-color: #fff;
	text-decoration: underline;
	padding-top: 3rem;
`