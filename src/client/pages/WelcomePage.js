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
					<BoxyLink to="/create">CREATE GAME</BoxyLink>
				</LinkContainer>

				<GameList />
			</Page>
		)
	}
}

const Page = styled.div`
	color: #fff;
	background-color: #1f1f1f;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	border-radius: 10px;
	text-align: center;
	margin: 0 auto;
	width: 80%;
	height: 80%;

	h1 {
		margin-top: 0;
		text-transform: uppercase;
	}
	@media(max-width:425px){
		width: 90%;
		height: 85%;
		padding:20px;
	} 
`
const BoxyLink = styled(Link)`
	color: #000;
	text-decoration: none;
	padding: 20px 5rem;
	margin:0 auto;
	border-radius: 0.5rem;
	text-align: center;
	background-color: #ff8a32;
	letter-spacing:1px;
	font-size: 12px;
	font-weight: 700;
	white-space: nowrap;
	&:hover {
		background-color: #2e2e2e;
		color: #fff;
	}

	&:active {
		color: whitesmoke;
		background-color: #000000;
	}
	@media(max-width: 420px){
		padding: 20px 28px;
	}
`

const LinkContainer = styled.div`
	display: flex;
	flex-direction: column;
	width: 60%;
	a:not(:last-child) {
		margin-bottom: 10px;
	}
`
