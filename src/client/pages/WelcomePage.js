import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'
import GameList from '../components/GameList'

export default class WelcomePage extends Component {
	constructor(props) {
		super(props)
	}

	render() {
		return (
			<Page>
				<h1>Welcome to YTX Decentralized Cards Game!</h1>
				<LinkContainer>
					<BoxyLink to="/create">Create game</BoxyLink>
				</LinkContainer>

				<GameList />
			</Page>
		)
	}
}

const Page = styled.div`
	box-shadow: 0 0 30px 0 lightgrey;
	padding: 50px;
	border-radius: 10px;
	text-align: center;
	margin: 0 auto;
	min-width: 250px;
	max-width: 550px;

	h1 {
		margin-top: 0;
	}
`
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

	a:not(:last-child) {
		margin-bottom: 10px;
	}
`
