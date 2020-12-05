import React, { useContext } from 'react'
import styled from 'styled-components'
import { store } from '../store/Store'
export const BoardCard = (props) => {
	const { state, dispatch } = useContext(store)

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
			<CardButton
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
			</CardButton>
		)
	} else if (isAllyCard) {
		buttonToDisplay = (
			<div>
				<CardButton
					style={{
						backgroundColor: '#ffad04',
					}}
					disabled={state.isOtherPlayerTurn || isGamePaused()}
					onClick={() => {
						burnCardOnHand(props.id)
					}}
				>
					Burn
				</CardButton>
			</div>
		)
	}
	return (
		<StyledCard className={props.type} data-id={props.dataId}>
			<div>cost: {props.cost}</div>
			<div>life: {props.life}</div>
			<div>attack: {props.attack}</div>
			<div>type: {props.type}</div>
			<div className="spacer"></div>
			{buttonToDisplay}
		</StyledCard>
	)
}

const CardButton = styled(Button)`
	border: none;
	border-radius: 2px;
	padding: 4px;
	margin-top: ${(props) => (props.mtop ? '10px' : 'unset')};
	min-width: auto;
	width: 90%;
	font-variant: small-caps;
`

const StyledCard = styled.div`
	width: 92px;
	height: 125px;
	border: 1px solid #000;
	position: relative;
	bottom: 0;
	display: inline-block;
	&.fire {
		background-color: rgb(255, 125, 125);
	}
	&.water {
		background-color: rgb(125, 204, 255);
	}
	&.wind {
		background-color: rgb(176, 255, 170);
	}
	&.life {
		background-color: rgb(240, 255, 149);
	}
	&.death {
		background-color: rgb(180, 180, 180);
	}
	&.neutral {
		background-color: rgb(242, 198, 166);
	}
	&:not(:last-child) {
		margin-right: 2px;
	}
	.spacer {
		height: 5px;
	}
`
