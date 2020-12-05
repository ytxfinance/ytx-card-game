import React, { useContext } from 'react'
import styled from 'styled-components'
import { store } from '../store/Store'
import styled from 'styled-components'
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
			<ul className="game-list-container">
				{!state.gameList || state.gameList.length == 0 ? (
					<p>No games available yet...</p>
				) : (
					state.gameList.map((item) => (
						<GameListItem key={item.gameId}>
							<li key={item.gameId} className="game-list-item">
								<b>{item.gameName}</b>
								<span>{item.ytxBet} YTX</span>
								<Button
									type="button"
									class="button-like"
									onClick={() => joinGame(item.gameId)}
								>
									Join
								</Button>
							</li>
						</GameListItem>
					))
				)}
			</ul>
		</GameListContainer>
	)
}

const GameListContainer = styled.ul`
	border: 1px solid grey;
	list-style-type: none;
`
const GameListItem = styled.li`
	display: flex;
	justify-content: space-between;
	align-items: center;
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
