import React, { useEffect, useContext, useState } from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route, Switch, useHistory } from 'react-router-dom'
import WelcomePage from './components/WelcomePage'
import CreatePage from './components/CreatePage'
import JoinPage from './components/JoinPage'
import GamePage from './components/GamePage'
import Web3 from 'web3'
import io from 'socket.io-client'
import { store, StateProvider } from './components/Store'
import './index.styl'

const App = () => {
	const { state, dispatch } = useContext(store)
	const [showError, setShowError] = useState(false)
	const [showSuccess, setShowSuccess] = useState(false)
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
		}
	}, [state.socket])

	const showSuccessMessage = () => {
		window.clearTimeout(showTimeout)
		setShowSuccess(true)
		const timeout = setTimeout(() => {
			setShowSuccess(false)
		}, 3e3)
		setShowTimeout(timeout)
	}

	const showErrorMessage = () => {
		window.clearTimeout(showTimeout)
		setShowError(true)
		const timeout = setTimeout(() => {
			setShowError(false)
		}, 3e3)
		setShowTimeout(timeout)
	}

	const setListeners = () => {
		state.socket.on('player-two-joined', () => {
			history.push('/game')
		})
		state.socket.on('game-deleted-successfully', () => {
			dispatch({
				type: 'SET_SUCCESS',
				payload: {
					success: 'Game deleted successfully'
				}
			})
			history.push('/')
			showSuccessMessage()
		})
		state.socket.on('game-created', () => {
			dispatch({
				type: 'SET_SUCCESS',
				payload: {
					success: 'Game created successfully'
				}
			})
			showSuccessMessage()
		})
		state.socket.on('user-error', data => {
			dispatch({
				type: 'SET_ERROR',
				payload: {
					error: data,
				},
			})
			showErrorMessage()
		})
	}

	const setup = async () => {
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
			} catch (error) {
				alert(
					'You must approve this dApp to interact with it, reload and try again'
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
		} else {
			console.log(
				'Non-Ethereum browser detected. You should consider trying MetaMask!'
			)
			alert(
				'Metamask not detected, install it or log in to use this dApp and reload the page.'
			)
		}
		dispatch({
			type: 'SET_SOCKET',
			payload: {
				socket: io(),
			},
		})
	}

	return (
		<div>
			<p className={showSuccess ? 'success-message' : 'hidden'}>
				{state.success}
			</p>
			<p className={showError ? 'error-message' : 'hidden'}>
				{state.error}
			</p>
			<Switch>
				<Route
					path='/'
					exact
					render={context => (
						<WelcomePage
							history={context.history}
							redirectTo={(history, location) => {
								redirectTo(history, location)
							}}
							socket={state.socket}
						/>
					)}
				/>
				<Route
					path='/create'
					render={context => (
						<CreatePage
							account={state.account}
							history={context.history}
							redirectTo={(history, location) => {
								redirectTo(history, location)
							}}
							socket={state.socket}
						/>
					)}
				/>
				<Route
					path='/join'
					render={context => (
						<JoinPage
							account={state.account}
							history={context.history}
							redirectTo={(history, location) => {
								redirectTo(history, location)
							}}
							socket={socket}
						/>
					)}
				/>
				<Route
					path='/game'
					render={context => (
						<GamePage
							account={state.account}
							setupComplete={state.setupComplete}
							history={context.history}
							redirectTo={(history, location) => {
								redirectTo(history, location)
							}}
							socket={state.socket}
						/>
					)}
				/>
				<Route render={() => (
					<h1>Default 404 page</h1>
				)}/>
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
	document.querySelector('#root')
)
