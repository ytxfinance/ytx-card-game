import React, { useContext } from 'react'
import styled from 'styled-components'
import { store } from '../store/Store'

export default () => {
	const { state, dispatch } = useContext(store)

	const joinGame = (gameId) => {
		state.socket.emit('join-game', {
			account: state.account,
			gameId,
		})
		dispatch({
			type: 'SET_PLAYER_NUMBER',
			payload: {
				playerNumber: 2,
			},
		})
	}

	return (
		<GameListContainer>
			{!state.gameList || state.gameList.length == 0 ? (
				<p>NO GAMES AVAILABLE YET...</p>
			) : (
					state.gameList.map((item) => (
						<GameListItem key={item.gameId}>
							<b>{item.gameName.length > 10 ? item.gameName.substring(0, 10) + '...' : item.gameName}</b>
							<span>{item.ytxBet} YTX</span>
							<Button
								type="button"
								onClick={() => joinGame(item.gameId)}
							>
								JOIN
						</Button>
						</GameListItem>
					))
				)}
		</GameListContainer>
	)
}

const GameListContainer = styled.ul`
	width: 28%;
	margin-top:20px;
	padding:0;
	list-style-type: none;
	@media(max-width: 860px){
		width: 90%;
	}
	p {
		font-size: 12px;
		letter-spacing: 1px;
		white-space: nowrap;
		overflow: hidden;
	}
`
const GameListItem = styled.li`
	color: #000;
	border-radius: 0.5rem;
	/* margin: 0 auto; */
	padding-left: 1rem;
	background-color: #fff;
	display: flex;
	justify-content: space-between;
	align-items: center;
	height: 50px;
`

const Button = styled.button`
	background-color: #ff8a32;
	border: transparent;
	border-radius: 0.5rem;
	color: #000;
	font-size: 12px;
	font-weight: 700;
	cursor: pointer;
	display: inline-block;
	text-decoration: none;
	letter-spacing: 1px;
	width: 30%;
	height: 100%;

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
