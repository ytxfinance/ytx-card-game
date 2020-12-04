import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import GameList from './GameList'

export default class WelcomePage extends Component {
	constructor(props) {
		super(props)
	}

	render() {
		return (
			<div className="page welcome-page">
				<h1>Welcome to YTX Decentralized Cards Game!</h1>
				<LinkContainer>
					<BoxyLink to="/create">
						Create game
					</BoxyLink>
				</LinkContainer>

				<GameList />
			</div>
		)
	}
}

const BoxyLink = styled(Link)`
	color: white;
	text-decoration: none;
	padding: 20px 0;
	width: 100%;
	text-align: center;
	background-color: #444444;

	&:hover {
		background-color: #2e2e2e;
	}

	&:active {
		color: whitesmoke;
		background-color: #000000;		
	}
`

const LinkContainer = styled.div`
	display: flex;
	flex-direction: column;
`