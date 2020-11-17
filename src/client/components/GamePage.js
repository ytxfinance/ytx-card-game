import React, { useContext, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import GAME_CONFIG from '../../../GAME_CONFIG.json'
import { store } from './Store'
const FIELD_SIZE = GAME_CONFIG.maxCardsInField

// The individual Card component
const Card = props => {
    // If the card is ally, display the attack button or invoke, else don't display actions
    let buttonToDisplay
    if (props.isInvoked && props.id[0] == 'A') {
        buttonToDisplay = (
            <button disabled={!props.canAttack || props.turnEnded} onClick={() => {
                props.toggleAttackMode(props)
            }}>Attack</button>
        )
    } else if (props.id[0] == 'A') {
        buttonToDisplay = (
            <button disabled={props.turnEnded} onClick={() => {
                props.invokeCard(props)
            }}>invoke</button>
        )
    }
    return (
        <div className={"card " + props.type} data-id={props.dataId}>
            <div>cost: {props.cost}</div>
            <div>life: {props.life}</div>
            <div>attack: {props.attack}</div>
            <div>type: {props.type}</div>
            <div className="spacer"></div>
            { buttonToDisplay }
        </div>
    )
}

const GameView = props => {
    const { state } = useContext(store)

    return (
        <div className='page game-page'>
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
            <Link
                className={state.gameOver ? 'margin-bot button-like' : 'hidden'}
                to='/'
            >
                Exit
            </Link>
            <div className='game'>
                <div
                    className={
                        state.isAttackMode ? 'enemy-stats attack-mode' : 'enemy-stats'
                    }
                    onClick={() => {
                        if (state.isAttackMode) props.attackDirectly()
                    }}
                >
                    <p>Enemy</p>
                    <p>
                        {state.playerNumber === 1
                            ? state.game.player2.life
                            : state.game.player1.life}{' '}
                        HP
                    </p>
                    <p>
                        {state.playerNumber === 1
                            ? state.game.player2.energy
                            : state.game.player1.energy}{' '}
                        Energy
                    </p>
                </div>
                <div className='my-stats'>
                    <p>You</p>
                    <p>
                        {state.playerNumber === 1
                            ? state.game.player1.life
                            : state.game.player2.life}{' '}
                        HP
                    </p>
                    <p>
                        {state.playerNumber === 1
                            ? state.game.player1.energy
                            : state.game.player2.energy}{' '}
                        Energy
                    </p>
                </div>
                <div className='cards-container enemy-cards-container'>
                    { state.enemyHand }
                </div>
                <div className='field'>
                    <div
                        className={
                            state.isAttackMode ? 'enemy-field attack-mode' : 'enemy-field'
                        }
                    >
                        {/* {enemyFieldHtml} */}
                    </div>
                    <div className='friendly-field'>
                        {/* {allyFieldHtml} */}
                    </div>
                </div>
                <div className='cards-container ally-cards-container'>
                    { state.allyHand }
                </div>
                <button
                    className='end-turn'
                    disabled={ state.isOtherPlayerTurn }
                    onClick={() => {
                        props.endTurn()
                    }}
                >
                    End Turn
                </button>
            </div>
        </div>
    )
}

export default () => {
    const { state, dispatch } = useContext(store)

    useEffect(() => {
        if (state.playerNumber === 2) {
            const enemyHand = state.game.player1.hand.map(index => (
                <div className="card" key={Math.random()}></div>
            ))
            const allyHand = generateHandCards(state.game.player2.hand)
            dispatch({
                type: 'SET_IS_OTHER_PLAYER_TURN',
                payload: {
                    isOtherPlayerTurn: true,
                }
            })
            dispatch({
                type: 'SET_HAND_CARDS',
                payload: {
                    enemyHand,
                    allyHand,
                }
            })
        } else {
            const enemyHand = state.game.player2.hand.map(index => (
                <div className="card" key={Math.random()}></div>
            ))
            const allyHand = generateHandCards(state.game.player1.hand)
            dispatch({
                type: 'SET_HAND_CARDS',
                payload: {
                    enemyHand,
                    allyHand,
                }
            })
        }

        setListeners()
    }, [])

    const generateHandCards = handCards => {
        let cards = handCards.length > 0 ? handCards.map(card => (
            <Card
                {...card}
                key={card.id}
                dataId={card.id}
                turnEnded={state.isOtherPlayerTurn}
                // invokeCard={propsCard => invokeCard(propsCard, state.playerNumber === 1 ? state.game.player1 : state.game.player2)}
                // toggleAttackMode={propsCard => {
                //     toggleAttackMode(propsCard)
                // }}
            />
        )) : [(<div className="card" key={Math.random()}></div>)]
        return cards
     }

    const setListeners = () => {
        state.socket.on('start-turn', () => {
            dispatch({
                type: 'SET_IS_OTHER_PLAYER_TURN',
                payload: {
                    isOtherPlayerTurn: false,
                }
            })
        })
    }

    const endTurn = () => {
        const game = { ...state.game }
        if (state.playerNumber === 1) {
            game.player1.turn++
        } else {
            game.player2.turn++
        }
        dispatch({
            type: 'SET_IS_OTHER_PLAYER_TURN',
            payload: {
                isOtherPlayerTurn: true,
            }
        })
        dispatch({
            type: 'SET_GAME',
            payload: {
                game,
            }
        })
        state.socket.emit('end-turn', {
            game,
        })
    }

    return (
        <GameView
            // {...this.state}
            // invokeCard={card => invokeCard(card, state.playerNumber === 1 ? state.game.player1 : state.game.player2)}
            // toggleAttackMode={card => toggleAttackMode(card)}
            // attackDirectly={() => this.attackDirectly()}
            // attackField={target => this.attackField(target)}
            endTurn={() => endTurn()}
        />
    )
}