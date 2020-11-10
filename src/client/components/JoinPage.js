import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import CardContract from '../../../build/contracts/Card.json'
import io from 'socket.io-client'

export default class WelcomePage extends Component {
    constructor (props) {
        super(props)
        this.state = {
            address: '',
            errorMessage: '',
            bet: 0,
            isSetup: false,
        }
    }

    async joinGame() {
        if(this.state.address.length === 0) {
            return this.setState({errorMessage: 'You need to paste the game address before joining'})
        } else if(this.state.bet === 0) {
            return this.setState({errorMessage: 'You need to setup your bet before joining'})
        } else {
            this.setState({errorMessage: ''})
        }

        const contract = new myWeb3.eth.Contract(CardContract.abi, this.state.address)
        const transaction = await contract.methods.setupPlayer2().send({
            from: this.props.account,
            value: myWeb3.utils.toWei(this.state.bet),
        })
        this.props.setState({
            escrowPlayerTwo: myWeb3.utils.toWei(this.state.bet),
            contract,
        })
        this.setState({isSetup: true})
        io().emit('player-two-joined')
        this.props.redirectTo(this.props.history, '/game')
    }

    render () {
        return (
            <div className="page welcome-page">
                <h1>Join a game</h1>
                <b className={this.state.isSetup ? 'margin-bot' : 'hidden'}>Success! The game is setup and ready to play!</b>
                <p className={this.state.errorMessage.length === 0 ? 'hidden' : 'error-message'}>{this.state.errorMessage}</p>

                <ul className="link-container">
                    <li></li>
                </ul>
            </div>
        )
    }
}
