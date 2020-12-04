import React, { useContext } from 'react'
import styled from 'styled-components'
import { store } from './Store'

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
				<p>No games available yet...</p>
			) : (
				state.gameList.map((item) => (
					<GameListItem key={item.gameId}>
						<b>{item.gameName}</b>
						<span>{item.ytxBet} YTX</span>
						<button
							type="button"
							className="button-like"
							onClick={() => joinGame(item.gameId)}
						>
							Join
						</button>
					</GameListItem>
				))
			)}
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