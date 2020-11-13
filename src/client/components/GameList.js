import React, { useContext } from 'react'
import { store } from './Store'

export default () => {
    const { state, dispatch } = useContext(store)

    return (
        <ul className="game-list-container">
            {!state.gameList || state.gameList.length == 0 ? (
                <p>No games available yet...</p>
            ) : state.gameList.map(item => (
                <li key={item.gameId} className="game-list-item">
                    <b>{item.gameName}</b>
                    <span>{item.ytxBet} YTX</span>
                    <button type="button">Join</button>
                </li>
            ))}
        </ul>
    )
}