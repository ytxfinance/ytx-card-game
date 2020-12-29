import React, { useContext } from 'react'
import styled from 'styled-components'
import { store } from '../store/Store'
import { FaBolt, FaHeart } from 'react-icons/fa'
import { GiBowieKnife, GiDrop, GiDeathSkull } from 'react-icons/gi'
import { ImFire } from 'react-icons/im'
import { FiWind, FiMinusCircle } from 'react-icons/fi'
import one from '../../../public/images/one.png'
import two from '../../../public/images/two.png'
import three from '../../../public/images/three.png'
import four from '../../../public/images/four.png'
import five from '../../../public/images/five.png'
import six from '../../../public/images/six.png'
import seven from '../../../public/images/seven.png'
import eight from '../../../public/images/eight.png'
import nine from '../../../public/images/nine.png'
import ten from '../../../public/images/ten.png'
import eleven from '../../../public/images/eleven.png'
import twelve from '../../../public/images/twelve.png'
import tt from '../../../public/images/tt.png'
import zz from '../../../public/images/zz.png'




export const BoardCard = (props) => {
	const card_names = {
		one,
		two,
		three,
		four,
		five,
		six,
		seven,
		eight,
		nine,
		ten,
		eleven,
		twelve,
		tt,
		zz
	}

	let img_name;

	if (Object.keys(card_names).includes(props.card_img)) {
		img_name = card_names[props.card_img]
	}

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
		<StyledCard data-id={props.dataId} card_name={img_name}>
			<div>{props.cost}<FaBolt size={18} /> </div>
			<div><span>{props.life}</span><FaHeart color={'rgba(255, 255, 255, 0.3)'} size={26} /> </div>
			<div><span>{props.attack}</span><GiBowieKnife color={'rgba(255, 255, 255, 0.3)'} size={26} /> </div>
			<div className={'card ' + props.type}>{renderSwitch(props.type)}</div>
			<div className="spacer"></div>
			{buttonToDisplay}
		</StyledCard>
	)
}

const StyledCard = styled.div`
	width: 100px;
	height: 145px;
	border-radius: 0.3rem;
	position: relative;
	bottom: 0;
	display: flex;
	justify-content: center;
	align-items: flex-end;
	margin: auto 14px;
	padding-bottom: 30px;
	background-image: ${({ card_name }) => `url(${card_name})`};
	background-repeat: no-repeat;
	background-position: center;
	background-size: cover;
	font-weight: 900;
	font-size: 18px;

	> div {
		&:nth-child(-n+4){
			position: absolute;
			width: 30px;
			height:30px;
			display: flex;
			justify-content: center;
			align-items: center;
			> span {
				position: absolute;
				font-size: 18px;
			}
		}

		&:first-child{
			left: 0;
			top: 0;
			background-color: #7c18e0;
			border-radius: 0.3rem;
			width: 35px;
			>*:last-child{
				margin-left: 2px;
			}
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
	@media(max-width: 891px){
		height: 130px;
		width: 90px;
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
