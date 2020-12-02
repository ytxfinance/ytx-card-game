const Card = artifacts.require('Card')

module.exports = (deployer, network, accounts) => {
	deployer.deploy(Card, {
		from: accounts[0],
		value: web3.utils.toWei('0.1'), // This is the escrow for player 1
	})
}
