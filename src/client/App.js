import React, { useEffect, useContext, useState } from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route, Switch, useHistory } from 'react-router-dom'
import styled from 'styled-components'
import WelcomePage from './components/WelcomePage'
import CreatePage from './components/CreatePage'
import GamePage from './components/GamePage'
import Web3 from 'web3'
import io from 'socket.io-client'
import { store, StateProvider } from './components/Store'
import './index.styl'

const App = () => {
	const { state, dispatch } = useContext(store)
	const [showTimeout, setShowTimeout] = useState(null)
	const history = useHistory()

	useEffect(() => {
		setup()
	}, [])

	useEffect(() => {
		if (state.socket) {
			dispatch({
				type: 'SET_SETUP_COMPLETE',
				payload: {
					setupComplete: true,
				},
			})
			setListeners()
			getGameList()
			setInterval(getGameList, 3e3)
		}
	}, [state.socket])

	useEffect(() => {
		window.clearTimeout(showTimeout)
		if (state.showError) {
			const timeout = setTimeout(() => {
				dispatch({
					type: 'SET_SHOW_ERROR',
					payload: {
						showError: false,
					},
				})
			}, 3e3)
			setShowTimeout(timeout)
		}
	}, [state.showError])

	useEffect(() => {
		window.clearTimeout(showTimeout)
		if (state.showSuccess) {
			const timeout = setTimeout(() => {
				dispatch({
					type: 'SET_SHOW_SUCCESS',
					payload: {
						showSuccess: false,
					},
				})
			}, 3e3)
			setShowTimeout(timeout)
		}
	}, [state.showSuccess])

	const setListeners = () => {
		state.socket.on('player-two-joined', () => {
			history.push('/game')
		})
		state.socket.on('game-deleted-successfully', () => {
			dispatch({
				type: 'SET_SUCCESS',
				payload: {
					success: 'Game deleted successfully',
				},
			})
			history.push('/')
		})
		state.socket.on('game-created', () => {
			dispatch({
				type: 'SET_SUCCESS',
				payload: {
					success: 'Game created successfully',
				},
			})
		})
		state.socket.on('user-error', (data) => {
			dispatch({
				type: 'SET_ERROR',
				payload: {
					error: data,
				},
			})
		})
		state.socket.on('receive-game-list', (games) => {
			dispatch({
				type: 'SET_GAME_LIST',
				payload: {
					gameList: games,
				},
			})
		})
		state.socket.on('player-joined', (game) => {
			console.log('player-joined', game)

			dispatch({
				type: 'SET_GAME',
				payload: {
					game,
				},
			})
			history.push('/game')
		})
	}

	const getGameList = () => {
		state.socket.emit('get-game-list')
	}

	const setup = async () => {
		const socket = io()
		if (window.ethereum) {
			ethereum.autoRefreshOnNetworkChange = true
			window.myWeb3 = new Web3(ethereum)
			myWeb3.eth.transactionConfirmationBlocks = 1 // Hard code number of blocks needed
			try {
				await ethereum.enable()
				ethereum.on('accountsChanged', function () {
					console.log('Account Changed!')
					window.location.reload()
				})
				dispatch({
					type: 'SET_ACCOUNT',
					payload: {
						account: ethereum.selectedAddress,
					},
				})
				socket.emit('set-account', ethereum.selectedAddress)
			} catch (error) {
				alert(
					'You must approve this dApp to interact with it, reload and try again',
				)
			}
		} else if (window.web3) {
			window.myWeb3 = new Web3(web3.currentProvider)
			let accounts = await myWeb3.eth.getAccounts()
			dispatch({
				type: 'SET_ACCOUNT',
				payload: {
					account: accounts[0],
				},
			})
			socket.emit('set-account', accounts[0])
		} else {
			console.log(
				'Non-Ethereum browser detected. You should consider trying MetaMask!',
			)
			alert(
				'Metamask not detected, install it or log in to use this dApp and reload the page.',
			)
		}
		dispatch({
			type: 'SET_SOCKET',
			payload: {
				socket,
			},
		})
	}

	const ErrorMsg = styled.p`
		color: tomato;
		font-size: 14pt;
		text-align: center;
		display: ${(props) => (props.hidden ? 'none' : 'block')};
	`
	const SuccessMsg = styled.p`
		color: green;
		font-size: 14pt;
		text-align: center;
		display: ${(props) => (props.hidden ? 'none' : 'block')};
	`
	
	return (
		<div>
			<SuccessMsg hidden={!state.showSuccess}>{state.success}</SuccessMsg>
			<ErrorMsg hidden={!state.showError}>{state.error}</ErrorMsg>
			<Switch>
				<Route path="/" exact render={() => <WelcomePage />} />
				<Route path="/create" render={() => <CreatePage />} />
				<Route path="/game" render={() => <GamePage />} />
				<Route render={() => <h1>Default 404 page</h1>} />
			</Switch>
		</div>
	)
}

ReactDOM.render(
	<StateProvider>
		<BrowserRouter>
			<App />
		</BrowserRouter>
	</StateProvider>,
	document.querySelector('#root'),
)
