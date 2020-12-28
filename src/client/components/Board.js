import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'
import { Link } from 'react-router-dom'
import GAME_CONFIG from '../../../GAME_CONFIG.json'
import React, {
	useContext,
	useState,
	useEffect,
	useLayoutEffect,
	useCallback,
} from 'react'
import styled, { css } from 'styled-components'
import { BoardCard } from './BoardCard'
import { store } from '../store/Store'
import { FaHeart, FaBolt } from 'react-icons/fa'

const FIELD_SIZE = GAME_CONFIG.maxCardsInField
const reorder = (list, startIndex, endIndex) => {
	const result = Array.from(list)
	const [removed] = result.splice(startIndex, 1)
	result.splice(endIndex, 0, removed)
	return result
}

/**
 *@param {source} - source
 *@param {destination} - destination
 *@param {droppableSource} - source
 *@param {droppableDestination} - destination
 **/
const move = (source, destination, droppableSource, droppableDestination) => {
	const sourceClone = Array.from(source)
	const destClone = Array.from(destination)
	const [removed] = sourceClone.splice(droppableSource.index, 1)

	destClone.splice(droppableDestination.index, 0, removed)

	const result = {}
	result[droppableSource.droppableId] = sourceClone
	result[droppableDestination.droppableId] = destClone

	return result
}

const ALLY_TYPES = {
	hand: 'allyHand',
	field: 'allyField',
}

export const Board = (props) => {
	const { state, dispatch } = useContext(store)
	const isGamePaused = () => state.game && state.game.gamePaused
	const [allyCards, setAllyCards] = useState({
		[ALLY_TYPES.hand]: [],
		[ALLY_TYPES.field]: [],
	})

	useLayoutEffect(() => {
		if (state.game) {
			if (state.playerNumber === 1) {
				setAllyCards({
					[ALLY_TYPES.hand]: [...state.game.player1.hand],
					[ALLY_TYPES.field]: [...state.game.player1.field],
				})
			} else {
				setAllyCards({
					[ALLY_TYPES.hand]: [...state.game.player2.hand],
					[ALLY_TYPES.field]: [...state.game.player2.field],
				})
			}
		}
	}, [state.game])

	const getAllyStateType = (droppableId) => {
		return allyCards[droppableId]
	}

	const invokeCard = (card) => {
		console.log('invoke card', card)
		if (!card.isInvoked) {
			let me
			if (state.playerNumber === 1) {
				me = state.game.player1
			} else {
				me = state.game.player2
			}
			// Invokes a card into the field and updates ally hand with a new deep copy
			if (me.field.length >= FIELD_SIZE) {
				return dispatch({
					type: 'SET_ERROR',
					payload: {
						error: 'The field is full',
					},
				})
			}
			if (card.cost > me.energy) {
				return dispatch({
					type: 'SET_ERROR',
					payload: {
						error:
							"You don't have enough energy to invoke this card",
					},
				})
			}
			card.isInvoked = true
			state.socket.emit('invoke-card', {
				game: state.game,
				card,
			})
		}
	}

	const onDragEnd = useCallback(
		(result) => {
			const { source, destination } = result
			if (!destination) {
				return
			}
			let allyState = getAllyStateType(source.droppableId)
			const isEnoughEnergyToInvoke =
				state.playerNumber === 1
					? state.game.player1.energy
					: state.game.player2.energy
			console.log(
				isEnoughEnergyToInvoke,
				allyState.cost,
				'energy',
				state.playerNumber,
				state.game.player1.energy,
				state.game.player2.energy,
			)
			if (isEnoughEnergyToInvoke < allyState[source.index].cost) {
				return
			}
			if (source.droppableId === destination.droppableId) {
				const items = reorder(
					allyState,
					source.index,
					destination.index,
				)
				setAllyCards({ ...allyCards, [source.droppableId]: items })
			} else {
				//invoke card
				invokeCard(allyCards[ALLY_TYPES.hand][source.index])
				const result = move(
					getAllyStateType(source.droppableId),
					getAllyStateType(destination.droppableId),
					source,
					destination,
				)
				setAllyCards({
					[ALLY_TYPES.hand]: result[ALLY_TYPES.hand],
					[ALLY_TYPES.field]: result[ALLY_TYPES.field],
				})
			}
		},
		[state.game, allyCards],
	)

	return (
		<Page>
			<ResultMsg
				winner={state.gameOver && state.areYouTheWinner}
				loser={state.gameOver && !state.areYouTheWinner}
			>
				{state.gameOver && state.areYouTheWinner
					? 'Congratulations! You are the winner!'
					: state.gameOver && !state.areYouTheWinner
						? 'You lost! Better luck next time!'
						: null}
			</ResultMsg>
			{/* <p>Turn: {state.game ? state.game.currentTurnNumber : 0}</p>
			<p>Timer: {props.turnCountdownTimer}</p> */}
			<ExitLink hidden={!state.gameOver} to="/">
				Exit
			</ExitLink>
			{state.game ? (
				<Game className="game">
					<EnemyDeck>Enemy's <br /> Deck</EnemyDeck>
					<YourDeck>Your <br /> Deck</YourDeck>
					<EnemyStatsBox
						className={
							state.isAttackMode
								? 'enemy-stats attack-mode'
								: 'enemy-stats'
						}
						onClick={() => {
							if (state.isAttackMode) props.attackDirectly()
						}}
					>
						<p>Enemy</p>
						<p>
							{state.playerNumber === 1
								? state.game.player2.life
								: state.game.player1.life}
							<FaHeart />
						</p>
						<p>
							{state.playerNumber === 1
								? state.game.player2.energy
								: state.game.player1.energy}
							<FaBolt />
						</p>
					</EnemyStatsBox>
					<AllyStatsBox className="my-stats">
						<p>You</p>
						<p>
							{state.playerNumber === 1
								? state.game.player1.life
								: state.game.player2.life}
							<FaHeart />
						</p>
						<p>
							{state.playerNumber === 1
								? state.game.player1.energy
								: state.game.player2.energy}
							<FaBolt />
						</p>
					</AllyStatsBox>
					<CardContainer className="cards-container enemy-cards-container">
						{state.visualEnemyHand}
					</CardContainer>
					<Field className="field">
						<DragDropContext onDragEnd={onDragEnd}>
							<EnemyField
								className={
									state.isAttackMode
										? 'enemy-field attack-mode'
										: 'enemy-field'
								}
							>
								{state.enemyFieldHtml}
							</EnemyField>
							<FieldContainer top width="width: 70%;">
								<Droppable
									droppableId={`${ALLY_TYPES.field}`}
									direction="horizontal"
								>
									{(provided, snapshot) => (
										<CardPanel
											ref={provided.innerRef}
											isDraggingOver={snapshot.isDraggingOver}
										>
											{allyCards[ALLY_TYPES.field].map(
												(allyFieldCard, index) => (
													<Draggable
														key={index}
														draggableId={`allyFieldCard${index}`}
														index={index}
														isDragDisabled={true}
													>
														{(
															provided,
															snapshot,
														) => (
															<div
																ref={
																	provided.innerRef
																}
																{...provided.draggableProps}
																{...provided.dragHandleProps}
															>
																<BoardCard
																	{...allyFieldCard}
																/>
															</div>
														)}
													</Draggable>
												),
											)}
											{provided.placeholder}
										</CardPanel>
									)}
								</Droppable>
							</FieldContainer>
							<FieldContainer width="width: 70%;">
								<Droppable
									droppableId={`${ALLY_TYPES.hand}`}
									direction="horizontal"
								>
									{(provided, snapshot) => (
										<CardPanel
											ref={provided.innerRef}
											// isDraggingOver={snapshot.isDraggingOver}
											outter
										>
											{allyCards[ALLY_TYPES.hand].map(
												(allyHandCard, index) => (
													<Draggable
														key={index}
														draggableId={`allyHand${index}`}
														index={index}
														isDragDisabled={
															state.playerNumber !==
															state.game
																.currentPlayerTurn
														}
													>
														{(
															provided,
															snapshot,
														) => (
															<div
																ref={
																	provided.innerRef
																}
																{...provided.draggableProps}
																{...provided.dragHandleProps}
															>
																<BoardCard
																	{...allyHandCard}
																/>
															</div>
														)}
													</Draggable>
												),
											)}
											{provided.placeholder}
										</CardPanel>
									)}
								</Droppable>
							</FieldContainer>
						</DragDropContext>
					</Field>
					<Button
						className="end-turn"
						disabled={state.isOtherPlayerTurn || isGamePaused()}
						onClick={() => {
							props.endTurn()
						}}
					>
						End Turn
					</Button>
					<Button
						className="surrender"
						style={{
							backgroundColor: 'red',
							marginTop: '10px',
						}}
						disabled={isGamePaused()}
						onClick={() => {
							props.surrender()
						}}
					>
						Surrender
					</Button>
				</Game>
			) : (
					<p>Game loading...</p>
				)}
		</Page>
	)
}

const Page = styled.div`

	border-radius: 10px;
	text-align: center;
	margin: 0 auto;
	width: 80%;
	height: 80%;
	color: #fff;
	background-color: #1f1f1f;
	display: flex;
	align-items: center;
	> h1 {
		margin-top: 0;
	}
	@media(max-width: 891px){
		/* border: 3px solid red; */
		height: 80%;
		margin: 0 auto 10%;
	}
	@media(max-width: 578px){
		width: 95%;
	}
`
const Game = styled.div`
	width: 95%;
	margin: 0 auto;
	/* border: 3px dashed orange; */
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 90%;
	/* @media(max-width: 891px){
		width: 95%;
	} */
`
const CardContainer = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	/* border: 2px solid purple; */
	margin: 0 auto;
	width: 95%;
	> div {
		background-color: rgb(105, 102, 102);
		height: 100px;
		position: relative;
		border-radius: 0.3rem;
		/* @media(max-width: 891px){

		} */
		&::before{
			content: "?";
			position: absolute;
			width: 20px;
			height: 20px;
			left: 50%;
			margin-left: -10px;
			top: 50%;
			margin-top: -10px;
		}
	}
`
const FieldContainer = styled.div`
	background-color: lightgrey;
	${(props) => props.width}
	${({ top }) => top && css`
		/* border: 1px solid red; */
		border-radius: 0.3rem;
		overflow: hidden;
		@media(max-width: 891px){
		width: 95%;
		/* border: 1px dashed red; */
	}
	`}
	height: 150px;
	margin: 0 auto;
	@media(max-width: 891px){
		width: 95%;
		/* border: 1px dashed red; */
	}
`
const StatsBox = styled.div`
	position: absolute;
	background-color: white;
	border-radius: 0.3rem;
	min-width: 120px;
	overflow: hidden;
	/* box-shadow: 0 0 10px 0px #afafaf; */
	/* border: 2px solid red; */
	@media(max-width: 891px){
		width: 300px;
		margin-left: -150px;
	}
	@media(max-width: 425px){
		width: 200px;
		margin-left: -100px;
	}
`
const EnemyStatsBox = styled(StatsBox)`
	top: 15px;
	left: 15px;
	/* border: 2px solid yellow; */
	display: flex;
	flex-direction: column;
	/* border-radius: 0.3rem; */
	/* overflow: hidden; */
	> p {
			color: #fff;
			font-size: 20px;
			font-weight: 900;
			flex: 1;
			margin: 0;
			padding: 10px 20px;
			text-align: center;
			display: flex;
			justify-content: space-around;
			align-items: center;
		&:first-child{
			position: absolute;
			bottom: -50px;
			text-transform: uppercase;
			@media(max-width: 891px){
				display: none;
			}
		}

		&:nth-child(2){
			background-color: #df2230;
		}

		&:last-child{
			background-color: #7c18e0;
		}
	}
	&.attack-mode {
		background-color: tomato;
		cursor: pointer;
		color: white;

		&:hover {
			opacity: 0.7;
		}
	}
	@media(max-width: 891px){
		top: -55px;
		left: 50%;
		flex-direction: row;
	}
`
const AllyStatsBox = styled(StatsBox)`
	bottom: 15px;
	right: 15px;

	display: flex;
	flex-direction: column;
	/* border-radius: 0.3rem; */
	> p {
			color: #fff;
			font-size: 20px;
			font-weight: 900;
			flex: 1;
			margin: 0;
			padding: 10px 20px;
			text-align: center;
			display: flex;
			justify-content: space-around;
			align-items: center;
		&:first-child{
			position: absolute;
			top: -50px;
			text-transform: uppercase;
			@media(max-width: 891px){
				display: none;
			}
		}

		&:nth-child(2){
			background-color: #df2230;
		}

		&:last-child{
			background-color: #7c18e0;
		}
	}
	@media(max-width: 891px){
		bottom: -55px;
		flex-direction: row;
		left: 50%;
	}
`
const EnemyDeck = styled.div`
	position: absolute;
	right: 15px;
	top: 15px;
	height: 100px;
	width:150px;
	text-align: center;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 900;
	background-color: rgb(105, 102, 102);
	border-radius: 0.2rem;
	@media(max-width: 891px){
		display: none;
	}
`
const YourDeck = styled.div`
	position: absolute;
	left: 15px;
	bottom: 15px;
	/* border: 2px solid red; */
	height: 100px;
	width:150px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-weight: 900;
	background-color: #ff8a32;
	border-radius: 0.2rem;
	color: #000;
	@media(max-width: 891px){
		display: none;
	}
`

const ExitLink = styled(Link)`
	background-color: rgb(42, 90, 162);
	border: none;
	border-radius: 10px;
	padding: 20px;
	color: white;
	cursor: pointer;
	display: inline-block;
	text-decoration: none;
	min-width: 200px;
	margin-bottom: 20px;
	display: ${(props) => (props.hidden ? 'none' : 'block')};

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
const ResultMsg = styled.h1`
	font-size: ${(props) => (props.winner || props.loser ? '18pt' : '32px')};
	color: ${(props) =>
		props.winner ? 'green' : props.loser ? 'tomato' : 'black'};
`
const EnemyField = styled.div`
	display: flex;
	width: 70%;
	margin: 10px 0;
	overflow: auto;
	>* + * {
		margin-left: 10px;
	}
	> * {
		border-radius: 0.3rem;
	}

	&.attack-mode div:not(.empty-item) {
		background-color: tomato;
		cursor: pointer;

		&:hover {
			opacity: 0.7;
		}
	}
	@media(max-width: 891px){
		width: 95%;
	}
`
const Field = styled.div`
	width: 60%;
	margin: 0 auto;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	> div {
		flex: 1;
	}
	@media(max-width: 891px){
		height: 100%;
		width: 100%;
		/* border: 2px solid red; */
	}
`
const Button = styled.button`
	background-color: rgb(42, 90, 162);
	border: none;
	border-radius: 50%;
	width: 80px;
	height: 80px;
	position: absolute;
	right: 1%;
	bottom: 35%;
	color: white;
	cursor: pointer;
	/* display: inline-block; */
	text-decoration: none;
	&.end-turn{
		top: 35%;
		@media(max-width: 891px){
			/* bottom: 0; */
			top: 111.5%;
			left: 35%
		}
		@media(max-width: 630px){
			/* bottom: -26.5%; */
			left: 19%;
		}
	}

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
	@media(max-width: 891px){
		bottom: -23%;
		right: 35%;
		width: 70px;
		height: 70px;
	}
	@media(max-width: 630px){
		right: 25%;
	}
`
const CardPanel = styled.div`
	background: ${({ outter }) => (outter ? '#1f1f1f' : 'lightgrey')};
	display: flex;
	/* flex-direction: center; */
	justify-content: center;
	align-items: center;
	height: 100%;
	overflow: auto;
	/* border: 1px solid red; */
`