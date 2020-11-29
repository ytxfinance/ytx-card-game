import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import GameList from './GameList'

export default class WelcomePage extends Component {
    constructor (props) {
        super(props)
    }

    render () {
        return (
            <div className="page welcome-page">
                <h1>Welcome to YTX Decentralized Cards Game!</h1>
                <div className="link-container">
                    <Link className="boxy-link" to="/create">Create game</Link>
                </div>
                
                <GameList />
            </div>
        )
    }
}
