import React, { createContext, useReducer } from 'react'

const initialState = {
    account: null,
	setupComplete: false,
    socket: null,
    error: '',
    success: '',
    showError: false,
    showSuccess: false,
    ytxBet: 0,
    redirect: null,
    gameList: [],
    game: {},
    playerNumber: 1, // Can be player 1 or player 2
    attackingCardId: 0,
    isAttackMode: false,
    isOtherPlayerTurn: false,
    visualEnemyHand: [],
    visualAllyHand: [],
    gameOver: false,
    enemyFieldHtml: null,
    allyFieldHtml: null,
}
const store = createContext(initialState)
const { Provider } = store

const StateProvider = ({ children }) => {
    const [state, dispatch] = useReducer((state, action) => {
        let newState
        switch (action.type) {
            case 'SET_FIELDS':
                console.log('set fields')
                newState = {
                    ...state,
                    enemyFieldHtml: action.payload.enemyFieldHtml,
                    allyFieldHtml: action.payload.allyFieldHtml,
                }
                return newState
            case 'SET_ALLY_HAND':
                console.log('set ally hand')
                newState = {
                    ...state,
                    visualAllyHand: action.payload.visualAllyHand,
                }
                return newState
            case 'SET_IS_OTHER_PLAYER_TURN':
                console.log('set is other player turn')
                newState = {
                    ...state,
                    isOtherPlayerTurn: action.payload.isOtherPlayerTurn,
                }
                return newState
            case 'SET_GAME_OVER':
                console.log('set game over')
                newState = {
                    ...state,
                    gameOver: action.payload.gameOver,
                }
                return newState
            case 'SET_ATTACK_MODE':
                console.log('set attack mode')
                newState = {
                    ...state,
                    isAttackMode: action.payload.isAttackMode,
                    attackingCardId: action.payload.attackingCardId,
                }
                return newState
            case 'SET_HAND_CARDS':
                console.log('set hand cards')
                newState = {
                    ...state,
                    visualEnemyHand: action.payload.visualEnemyHand,
                    visualAllyHand: action.payload.visualAllyHand,
                }
                return newState
            case 'SET_PLAYER_NUMBER':
                console.log('set player number')
                newState = {
                    ...state,
                    playerNumber: action.payload.playerNumber,
                }
                return newState
            case 'SET_GAME':
                console.log('set game')
                newState = {
                    ...state,
                    game: action.payload.game,
                }
                return newState
            case 'SET_GAME_LIST':
                console.log('set game list')
                newState = {
                    ...state,
                    gameList: action.payload.gameList,
                }
                return newState
            case 'SET_YTX_BET':
                console.log('set bet')
                newState = {
                    ...state,
                    ytxBet: action.payload.ytxBet,
                }
                return newState
            case 'SET_SUCCESS':
                console.log('set success')
                newState = {
                    ...state,
                    success: action.payload.success,
                    showSuccess: true,
                }
                return newState
            case 'SET_SHOW_ERROR':
                console.log('set show error')
                newState = {
                    ...state,
                    showError: action.payload.showError,
                }
                return newState
            case 'SET_SHOW_SUCCESS':
                console.log('set show success')
                newState = {
                    ...state,
                    showSuccess: action.payload.showSuccess,
                }
                return newState
            case 'SET_ERROR':
                console.log('set error', `"${action.payload.error}"`)
                newState = {
                    ...state,
                    error: action.payload.error,
                    showError: true,
                }
                return newState
            case 'SET_SOCKET':
                console.log('set socket')
                newState = {
                    ...state,
                    socket: action.payload.socket,
                }
                return newState
            case 'SET_SETUP_COMPLETE':
                console.log('set setup complete')
                newState = {
                    ...state,
                    setupComplete: action.payload.setupComplete,
                }
                return newState
            case 'SET_ACCOUNT':
                console.log('set account')
                newState = {
                    ...state,
                    account: action.payload.account,
                }
                return newState
            default:
                console.log('default state')
                return state
        }
    }, initialState)
    return (
        <Provider value={{ state, dispatch }}>
            { children }
        </Provider>
    )
}

export { store, StateProvider }