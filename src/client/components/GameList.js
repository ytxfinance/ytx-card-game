import React, { useContext } from 'react';
import { store } from './Store';

export default () => {
	const { state, dispatch } = useContext(store);

	const joinGame = (gameId) => {
		state.socket.emit('join-game', {
			account: state.account,
			gameId,
		});
		dispatch({
			type: 'SET_PLAYER_NUMBER',
			payload: {
				playerNumber: 2,
			},
		});
	};

	return (
		<ul className="game-list-container">
			{!state.gameList || state.gameList.length == 0 ? (
				<p>No games available yet...</p>
			) : (
				state.gameList.map((item) => (
					<li key={item.gameId} className="game-list-item">
						<b>{item.gameName}</b>
						<span>{item.ytxBet} YTX</span>
						<button
							type="button"
							onClick={() => joinGame(item.gameId)}
						>
							Join
						</button>
					</li>
				))
			)}
		</ul>
	);
};
