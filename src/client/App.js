import React, { useEffect, useContext } from 'react'
import ReactDOM from 'react-dom'
import { BrowserRouter, Route } from 'react-router-dom'
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

	const setListeners = () => {
		state.socket.on('player-two-joined', () => {
			// redirectTo(history, '/game')
		})
		state.socket.on('user-error', data => {
			dispatch({
				type: 'SET_ERROR',
				payload: {
					error: data,
				},
			})
		})
	}

	const redirectTo = (history, location) => {
		history.push(location)
	}

	return (
		<BrowserRouter>
			<div>
				<p className={!state.error ? 'hidden' : 'error-message'}>
					{state.error}
				</p>
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
			</div>
		</BrowserRouter>
	)
}

ReactDOM.render(
	<StateProvider>
		<App />
	</StateProvider>,
	document.querySelector('#root')
)
