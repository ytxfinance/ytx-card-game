import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { Link } from 'react-router-dom'
import GAME_CONFIG from '../../../GAME_CONFIG.json';
import React, { useContext, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import styled from 'styled-components';
import { BoardCard } from './BoardCard';
import { store } from '../store/Store';
const FIELD_SIZE = GAME_CONFIG.maxCardsInField;
const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

/**
*@param {source} - source 
*@param {destination} - destination
*@param {droppableSource} - source 
*@param {droppableDestination} - destination
**/
const move = (source, destination, droppableSource, droppableDestination) => {
	const sourceClone = Array.from(source);
	const destClone = Array.from(destination);
	const [removed] = sourceClone.splice(droppableSource.index, 1);

	destClone.splice(droppableDestination.index, 0, removed);

	const result = {};
	result[droppableSource.droppableId] = sourceClone;
	result[droppableDestination.droppableId] = destClone;

	return result;
};

const ALLY_TYPES = {
	hand: 'allyHand',
	field: 'allyField'
}

export const Board = (props) => {
	const { state, dispatch } = useContext(store)
	const isGamePaused = () => state.game && state.game.gamePaused
    const [allyCards, setAllyCards] = useState({ [ALLY_TYPES.hand]: [], [ALLY_TYPES.field]: [] })

	useLayoutEffect(() => {
        if(state.game) {
            if(state.playerNumber === 1) {
                setAllyCards({[ALLY_TYPES.hand]: [...state.game.player1.hand], [ALLY_TYPES.field]: [...state.game.player1.field]})
            } else {
                setAllyCards({[ALLY_TYPES.hand]: [...state.game.player2.hand], [ALLY_TYPES.field]: [...state.game.player2.field]})
            }
        }
	}, [state.game]);

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

	const onDragEnd = useCallback((result) => {
		const { source, destination } = result;
		if (!destination) {
            return;
        }
        let allyState = getAllyStateType(source.droppableId);
        const isEnoughEnergyToInvoke = state.playerNumber === 1 ? state.game.player1.energy : state.game.player2.energy;
        console.log(isEnoughEnergyToInvoke, allyState.cost, 'energy', state.playerNumber, state.game.player1.energy, state.game.player2.energy)
        if(isEnoughEnergyToInvoke < allyState[source.index].cost) {
            return;
        }
		if (source.droppableId === destination.droppableId) {
            const items = reorder(
                allyState,
                source.index,
                destination.index
            );
            setAllyCards({...allyCards, [source.droppableId]: items})
		} else {
            //invoke card
            invokeCard(allyCards[ALLY_TYPES.hand][source.index]);
			const result = move(getAllyStateType(source.droppableId), getAllyStateType(destination.droppableId), source, destination);
            setAllyCards({[ALLY_TYPES.hand]: result[ALLY_TYPES.hand], [ALLY_TYPES.field]: result[ALLY_TYPES.field]});
		}
    }, [state.game, allyCards]);

	const getListStyle = isDraggingOver => ({
		background: isDraggingOver ? 'lightblue' : 'lightgrey',
		display: 'flex',
		flexDirection: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
		overflow: 'auto',
	  });
	  
	return (
		<div className="page game-page">
			<h1
				className={
					state.gameOver && state.areYouTheWinner
						? 'winner-message'
						: state.gameOver && !state.areYouTheWinner
						? 'loser-message'
						: ''
				}
			>
				{state.gameOver && state.areYouTheWinner
					? 'Congratulations! You are the winner!'
					: state.gameOver && !state.areYouTheWinner
					? 'You lost! Better luck next time!'
					: 'Game On'}
			</h1>
			<p>Turn: {state.game ? state.game.currentTurnNumber : 0}</p>
			<p>Timer: {props.turnCountdownTimer}</p>
			<Link
				className={state.gameOver ? 'margin-bot button-like' : 'hidden'}
				to="/"
			>
				Exit
			</Link>
			{state.game ? (
				<div className="game">
					<div
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
							&nbsp;HP
						</p>
						<p>
							{state.playerNumber === 1
								? state.game.player2.energy
								: state.game.player1.energy}
							&nbsp;Energy
						</p>
					</div>
					<div className="my-stats">
						<p>You</p>
						<p>
							{state.playerNumber === 1
								? state.game.player1.life
								: state.game.player2.life}
							&nbsp;HP
						</p>
						<p>
							{state.playerNumber === 1
								? state.game.player1.energy
								: state.game.player2.energy}
							&nbsp;Energy
						</p>
					</div>
					<div className="cards-container enemy-cards-container">
						{state.visualEnemyHand}
					</div>
                    <div className="field">
					<DragDropContext onDragEnd={onDragEnd}>
							<div
								className={
									state.isAttackMode
										? 'enemy-field attack-mode'
										: 'enemy-field'
								}
							>
								{state.enemyFieldHtml}
							</div>
							<FieldContainer width='width: 70%;'>
								<Droppable droppableId={`${ALLY_TYPES.field}`} direction="horizontal" >
									{(provided, snapshot) => (
                                        <div 
                                            ref={provided.innerRef}
										    style={getListStyle(snapshot.isDraggingOver)}
                                            >
                                            {allyCards[ALLY_TYPES.field].map((allyFieldCard, index) => (
                                                    <Draggable
                                                        key={index}
                                                        draggableId={`allyFieldCard${index}`}
                                                        index={index}
                                                        isDragDisabled={true}>
                                                            {(provided, snapshot)=> (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                >
                                                                    <BoardCard
                                                                        {...allyFieldCard}
                                                                    />
                                                                </div>
                                                            )}
                                                        </Draggable>
                                            ))}
										    {provided.placeholder}
										</div>
									)}
								</Droppable>
							</FieldContainer>
                        <FieldContainer width='width: 70%;'>
							<Droppable droppableId={`${ALLY_TYPES.hand}`} direction="horizontal">
								{(provided, snapshot) => (
									<div ref={provided.innerRef}
										style={getListStyle(snapshot.isDraggingOver)}
									>
									{allyCards[ALLY_TYPES.hand].map((allyHandCard, index) => (
											<Draggable
												key={index}
												draggableId={`allyHand${index}`}
												index={index}
                                                isDragDisabled={state.playerNumber !== state.game.currentPlayerTurn}
                                            >
													{(provided, snapshot)=> (
														<div
															ref={provided.innerRef}
															{...provided.draggableProps}
															{...provided.dragHandleProps}
														>
															<BoardCard
																{...allyHandCard}
															/>
														</div>
													)}
											</Draggable>											
									))}
									{provided.placeholder}
									</div>
								)}									
							</Droppable>
                            </FieldContainer>
					</DragDropContext>
                    </div>
					<button
						className="end-turn"
						disabled={state.isOtherPlayerTurn || isGamePaused()}
						onClick={() => {
							props.endTurn()
						}}
					>
						End Turn
					</button>
					<button
							className="end-turn"
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
					</button>
				</div>
			) : (
				<p>Game loading...</p>
			)}
		</div>
	)
}

const FieldContainer = styled.div`
    background-color: lightgrey;
    ${props => props.width}
    height: 150px;
    margin: 20px auto;
`