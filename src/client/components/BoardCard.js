import React, { useContext } from 'react'
import { store } from '../store/Store'
export const BoardCard = (props) => {
    const { state, dispatch } = useContext(store);

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

	const isGamePaused = () => state.game && state.game.gamePaused
    let isAllyCard = state.playerNumber === props.playerNumberOwner
	// If the card is ally, display the attack button or invoke, else don't display actions
	let buttonToDisplay
	if (props.isInvoked && isAllyCard) {
		buttonToDisplay = (
			<button
				disabled={
					!props.canAttack ||
					state.isOtherPlayerTurn ||
					isGamePaused()
				}
				onClick={() => {
					toggleAttackMode(props.id)
				}}
			>
				Attack
			</button>
		)
	} else if (isAllyCard) {
		buttonToDisplay = (
			<div>
				<button
					style={{
						backgroundColor: '#ffad04',
					}}
					disabled={state.isOtherPlayerTurn || isGamePaused()}
					onClick={() => {
						burnCardOnHand(props.id)
					}}
				>
					Burn
				</button>
			</div>
		)
	}
	return (
		<div className={'card ' + props.type} data-id={props.dataId}>
			<div>cost: {props.cost}</div>
			<div>life: {props.life}</div>
			<div>attack: {props.attack}</div>
			<div>type: {props.type}</div>
			<div className="spacer"></div>
			{buttonToDisplay}
		</div>
	)
}