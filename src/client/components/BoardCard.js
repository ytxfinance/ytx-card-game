import React, { useContext } from 'react'
import styled from 'styled-components'
import { store } from '../store/Store'
import { FaBolt, FaHeart } from 'react-icons/fa'
import { GiBowieKnife, GiDrop, GiDeathSkull } from 'react-icons/gi'
import { ImFire } from 'react-icons/im'
import { FiWind, FiMinusCircle } from 'react-icons/fi'
import card1 from '../assets/images/card1.png'
// import card2 from '../../../public/images/card2'


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

	const renderSwitch = (param) => {
		switch (param) {
			case 'wind':
				return <FiWind />;
			case 'fire':
				return <ImFire />;
			case 'water':
				return <GiDrop />;
			case 'death':
				return <GiDeathSkull />;
			case 'life':
				return <FaHeart />;
			case 'neutral':
				return <FiMinusCircle />;
			default:
				return param;
		}
	}
	return (
		<StyledCard data-id={props.dataId}>
			<div>{props.cost}<FaBolt /> </div>
			<div>{props.life}<FaHeart /> </div>
			<div>{props.attack}<GiBowieKnife /></div>
			<div className={'card ' + props.type}>{renderSwitch(props.type)}</div>
			<div className="spacer"></div>
			{buttonToDisplay}
		</StyledCard>
	)
}

const StyledCard = styled.div`
	width: 90px;
	height: 120px;
	/* border: 1px solid #000; */
	border-radius: 0.3rem;
	position: relative;
	bottom: 0;
	display: flex;
	justify-content: center;
	align-items: flex-end;
	margin: auto 14px;
	padding-bottom: 30px;
	/* border: 2px solid green; */
	background-image: url(${card1});
	background-repeat: no-repeat;
	background-position: center;
	background-size: 100%;

	> div {
		&:nth-child(-n+4){
			/* border: 1px solid red; */
			position: absolute;
			width: 35px;
			height:35px;
			display: flex;
			justify-content: space-around;
			align-items: center;
		}

		&:first-child{
			left: 0;
			top: 0;
			background-color: #7c18e0;
			border-radius: 0.3rem;
		}
		&:nth-child(2){
			right: -10px;
			bottom: -10px;
			background-color: #df2230;
			border-radius: 50%;
		}
		&:nth-child(3){
			left: -10px;
			bottom: -10px;
			background-color: #eb531b;
			border-radius: 50%;
		}
		&:nth-child(4){
			right: 0;
			top: 0;
			border-radius: 0.3rem;
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
				background-color: green;
			}

			&.death {
				background-color: rgb(180, 180, 180);
			}

			&.neutral {
				background-color: rgb(242, 198, 166);
			}
		}
	}


	&:not(:last-child) {
		margin-right: 2px;
	}

	.spacer {
		height: 10px;
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
const CardButton = styled(Button)`
	border: none;
	border-radius: 2px;
	padding: 4px 20px;
	text-align: center;
	width: 100%;
	font-variant: small-caps;
`
