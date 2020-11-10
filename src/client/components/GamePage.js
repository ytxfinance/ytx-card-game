import React, { Component } from 'react'
import { Link } from 'react-router-dom'
import CardContract from '../../../build/contracts/Card.json'
import abi from 'ethereumjs-abi'
import io from 'socket.io-client'
import GAME_CONFIG from '../../../GAME_CONFIG.json'

// This component manages all the actions and logic as a controller
export default class GamePage extends Component {
    constructor(props) {
        super(props)

        // Cards have each 4 parameters: cost, life, attack, type we'll store them as
        // objects and convert them to arrays in the hashing function
        // Global variales not needed for the hashed messages
        this.globalCardTypes = ['fire', 'water', 'wind', 'life', 'death', 'neutral']
        this.globalMinAttack = GAME_CONFIG.minCardAttack
        this.globalMaxAttack = GAME_CONFIG.maxCardAttack
        this.globalMinLife = GAME_CONFIG.minCardLife
        this.globalMaxLife = GAME_CONFIG.maxCardLife
        this.enemyLastCardId = GAME_CONFIG.initialCardsInHand
        this.lastEnergy = GAME_CONFIG.initialEnergy

        this.state = {
            me: {
                cards: this.generateInitialCards(true),
                life: GAME_CONFIG.initialLife,
                field: [],
                energy: GAME_CONFIG.initialEnergy,
            },
            enemy: {
                cards: Array(GAME_CONFIG.initialCardsInHand).fill(0),
                life: GAME_CONFIG.initialLife,
                field: [],
                energy: GAME_CONFIG.initialEnergy,
            },
            myLastCardId: 3,
            fieldSize: GAME_CONFIG.maxCardsInField,
            nonce: Math.floor(Math.random() * 1e16),
            sequence: 1,
            error: '',
            isAttackMode: false,
            attackingCardId: 0,
            gameOver: false,
            winner: null,
            turnEnded: this.props.isThisPlayerOne ? true : false,
            socket: '',
            signedMessage: '',
        }
        this.setListeners()
    }

    bytes32(name) {
        return myWeb3.utils.fromAscii(name)
    }

    async getEncryptedFields() {
        let allyBytes32FieldCards = []
        await this.state.me.field.asyncForEach(card => {
            allyBytes32FieldCards.push(this.bytes32(String(card.id)))
            allyBytes32FieldCards.push(this.bytes32(String(card.isInvoked)))
            allyBytes32FieldCards.push(this.bytes32(String(card.canAttack)))
            allyBytes32FieldCards.push(this.bytes32(String(card.cost)))
            allyBytes32FieldCards.push(this.bytes32(String(card.life)))
            allyBytes32FieldCards.push(this.bytes32(String(card.attack)))
            allyBytes32FieldCards.push(this.bytes32(String(card.type)))
        })
        return allyBytes32FieldCards
    }

    // The order for hashing is: playerNonce, cardsCurrentPlayer, playerLife, turn, playerSequence
    async generateHash() {
        let allyBytes32FieldCards = await this.getEncryptedFields()
        // Maybe because enemy's field is empty (?
        const hash = '0x' + abi.soliditySHA3(
            ['uint256', 'bytes32[]', 'uint256', 'uint256'],
            [String(this.state.nonce), allyBytes32FieldCards, String(this.state.me.life), String(this.state.sequence)],
        ).toString('hex')
        return hash
    }

    signMessage(hash) {
        return new Promise((resolve, reject) => {
            myWeb3.eth.personal.sign(hash, this.props.account, (err, result) => {
                if(err) return reject(err)
                resolve(result)
            })
        })
    }

    asyncSetState(state) {
        return new Promise(resolve => {
            this.setState(state, () => resolve())
        })
    }

    emitEventOne(data) {
        const setupEvent = this.props.isThisPlayerOne ? 'one-setup-player-one' : 'one-setup-player-two'
        this.state.socket.emit(setupEvent, data)
    }

    emitInvoke(data) {
        this.state.socket.emit('one-half-invoke', data)
    }

    emitDirectAttack(data) {
        this.state.socket.emit('one-half-attack-directly', data)
    }

    emitFieldAttack(data) {
        this.state.socket.emit('one-half-attack-field', data)
    }

    emitFinish(data) {
        this.state.socket.emit('three-finish', data)
    }

    emitEventTwo(signedMessage) {
        const signEvent = this.props.isThisPlayerOne ? 'two-message-player-one' : 'two-message-player-two'
        const emitData = {
            signedMessage,
            nonce: this.state.nonce,
            allyField: this.state.me.field,
            enemyField: this.state.enemy.field,
            allyLife: this.state.me.life,
            enemyLife: this.state.enemy.life,
            sequence: this.state.sequence,
        }

        this.state.socket.emit(signEvent, emitData)
    }

    emitDrawEnemy(data) {
        this.state.socket.emit('one-half-draw-card', data)
    }

    async setListeners() {
        await this.props.setup()
        await this.asyncSetState({socket: io()})

        // Connect
        this.state.socket.on('connect', () => {
            console.log('Socket id connected to server', this.state.socket.id)
            this.emitEventOne({
                socket: this.state.socket.id,
                address: this.props.account,
                contractAddress: this.props.contractAddress,
                escrow: this.props.isThisPlayerOne ? this.props.escrowPlayerOne : this.props.escrowPlayerTwo,
            })
        })

        // Error
        this.state.socket.on('error', message => {
            console.log('Socket error', message)
        })

        // Invoke
        this.state.socket.on('one-half-enemy-invoke', async message => {
            if((message.isThisPlayerOne && !this.props.isThisPlayerOne) || (!message.isThisPlayerOne && this.props.isThisPlayerOne)) {
                const copyEnemyCards = this.state.enemy.cards.slice(0)
                copyEnemyCards.length--
                const newEnemyField = []

                await message.field.asyncForEach(card => {
                    const cardIdNumber = card.dataId.substr(-1)
                    card.dataId = `ENEMY${cardIdNumber}`
                    card.id = `ENEMY${cardIdNumber}`
                    newEnemyField.push(card)
                })

                this.setState({
                    enemy: {
                        cards: copyEnemyCards,
                        life: this.state.enemy.life,
                        field: newEnemyField,
                        energy: message.energy,
                    }
                })
            }
        })

        // Attack directly
        this.state.socket.on('one-half-receive-attack-directly', async message => {
            if((message.isThisPlayerOne && !this.props.isThisPlayerOne) || (!message.isThisPlayerOne && this.props.isThisPlayerOne)) {
                this.setState({
                    me: {
                        cards: this.state.me.cards,
                        life: message.remainingLife,
                        field: this.state.me.field,
                        energy: this.state.me.energy,
                    },
                })
            }
        })

        // Attack field
        this.state.socket.on('one-half-receive-attack-field', async message => {
            if((message.isThisPlayerOne && !this.props.isThisPlayerOne) || (!message.isThisPlayerOne && this.props.isThisPlayerOne)) {
                let copyAllyField = []
                let copyEnemyField = []

                // 1. Update the receiving card life points
                await this.state.me.field.asyncForEach(card => {
                    let isDead = false
                    if(card.id.substr(-1) == message.victim.id.substr(-1)) {
                        card.life = message.victim.life
                        if(card.life <= 0) isDead = true
                    }
                    if(!isDead) copyAllyField.push(Object.assign({}, card))
                })

                // 2. Update the enemy field
                await this.state.enemy.field.asyncForEach(card => {
                    let isDead = false
                    if(card.id.substr(-1) == message.attacker.id.substr(-1)) {
                        card.life = message.attacker.life
                        if(card.life <= 0) isDead = true
                    }
                    if(!isDead) copyEnemyField.push(Object.assign({}, card))
                })

                // 3. Update fields
                this.setState({
                    me: {
                        cards: this.state.me.cards,
                        life: this.state.me.life,
                        field: copyAllyField,
                        energy: this.state.me.energy,
                    },
                    enemy: {
                        cards: this.state.enemy.cards,
                        life: this.state.enemy.life,
                        field: copyEnemyField,
                        energy: this.state.enemy.energy,
                    },
                })
            }
        })

        this.state.socket.on('one-half-enemy-draw-card', async message => {
            if((message.isThisPlayerOne && !this.props.isThisPlayerOne) || (!message.isThisPlayerOne && this.props.isThisPlayerOne)) {
                let countIncrease = this.state.enemy.cards.length + 1
                this.setState({
                    enemy: {
                        cards: Array(countIncrease).fill(0),
                        life: this.state.enemy.life,
                        field: this.state.enemy.field,
                        energy: this.state.enemy.energy,
                    }
                })
            }
        })

        this.state.socket.on('one-half-next-turn', async message => {
            if(this.props.isThisPlayerOne != message.isThisPlayerOne &&  this.state.turnEnded) {
                // Update cards in the field to allow them to attack if they been there
                let updatedField = []
                await this.state.me.field.asyncForEach(card => {
                    card.canAttack = true
                    updatedField.push(card)
                })
                this.lastEnergy += GAME_CONFIG.energyPerTurn
                this.setState({
                    turnEnded: false,
                    me: {
                        cards: this.state.me.cards,
                        life: this.state.me.life,
                        field: updatedField,
                        energy: this.lastEnergy,
                    }
                })
                if(this.state.me.cards.length < GAME_CONFIG.maxCardsInHand) this.drawCard()
            } else {
                this.lastEnergy += GAME_CONFIG.energyPerTurn
                this.setState({
                    enemy: {
                        cards: this.state.enemy.cards,
                        life: this.state.enemy.life,
                        field: this.state.enemy.field,
                        energy: this.lastEnergy,
                    }
                })
            }
        })

        // Finish the game, if you are not the player sending this message, if
        // you're the receiver basically you lost
        this.state.socket.on('three-finished', async message => {
            if((message.isThisPlayerOne && !this.props.isThisPlayerOne) || (!message.isThisPlayerOne && this.props.isThisPlayerOne)) {
                await this.asyncSetState({
                    me: {
                        cards: this.state.me.cards,
                        life: 0,
                        field: this.state.me.field,
                        energy: this.state.me.energy,
                    },
                })
                // Turn each card into bytes32 with the desired signature
                let allyBytes32FieldCards = await this.getEncryptedFields()

                // Finish the game by sending the final contract call to close the state channel
                const signedMessage = await this.signMessage(await this.generateHash())
                await this.props.contract.methods.verifyPlayerBalance(
                    signedMessage,
                    allyBytes32FieldCards,
                    this.state.me.life,
                    String(this.state.nonce),
                    this.state.sequence,
                    this.props.account,
                ).send({
                    from: this.props.account
                })

                this.setState({
                    gameOver: true,
                    winner: this.props.isThisPlayerOne ? 2 : 1,
                })
            }
        })
    }

    // Three initial cards random
    generateInitialCards(isAllyCards) {
        let cards = []
        for(let i = 0; i < GAME_CONFIG.initialCardsInHand; i++) {
            let life = this.randomRange(this.globalMinLife, this.globalMaxLife)
            let attack = this.randomRange(this.globalMinAttack, this.globalMaxAttack)
            let type = this.globalCardTypes[this.randomRange(0, this.globalCardTypes.length - 1)]
            // The cost is calculated based on the value of attack and life
            // There's a minimum cost of 1
            // Each point in life above 10 adds 0.5 cost
            // Each point in attack above 5 adds 1 cost
            // So a 18 life and 10 attack would cost 10 points
            let addAttackPoints = 0
            let addLifePoints = (life % 10 / 2)
            if(attack >= 10) addAttackPoints = 5
            else if(attack > 5) addAttackPoints = attack % 5
            let cost = 1 + addLifePoints + addAttackPoints

            let card = {
                id: isAllyCards ? `ALLY${i + 1}` : `ENEMY${i + 1}`,
                isInvoked: isAllyCards ? false : true,
                canAttack: false,
                cost,
                life,
                attack,
                type
            }
            cards.push(card)
        }
        return cards
    }

    // Min and max inclusive both
    randomRange(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // To set the error state and remove it after 5 seconds
    emitError(msg) {
        setTimeout(() => {
            this.setState({error: ''})
        }, 5e3)
        this.setState({error: msg})
    }

    // Invokes a card into the field and updates ally hand with a new deep copy
    async invokeCard(card) {
        if(this.state.me.field.length >= this.state.fieldSize) {
            return this.emitError('The field is full')
        }
        if(card.cost > this.state.me.energy) {
            return this.emitError("You don't have enough energy")
        }
        let cardsDeepCopy = []
        let allyUpdatedField = this.state.me.field.slice(0)
        let invokedCardDeepCopy = Object.assign({}, card)

        invokedCardDeepCopy.isInvoked = true
        allyUpdatedField.push(invokedCardDeepCopy)
        // Update the cards in ally hand by removing the one invoked
        await this.state.me.cards.asyncForEach(myCard => {
            // Don't copy the card that has been invoked into ally hand
            if(card.id == myCard.id) return
            cardsDeepCopy.push(Object.assign({}, myCard))
        })

        this.setState({
            me: {
                cards: cardsDeepCopy,
                life: this.state.me.life,
                field: allyUpdatedField,
                energy: this.state.me.energy - card.cost,
            }
        }, () => {
            this.emitInvoke({
                isThisPlayerOne: this.props.isThisPlayerOne,
                field: allyUpdatedField,
                energy: this.state.me.energy,
            })
        })
    }

    toggleAttackMode(card) {
        this.setState({
            isAttackMode: !this.state.isAttackMode,
            attackingCardId: !this.state.isAttackMode ? card.id : 0,
        })
    }

    async attackDirectly() {
        // Find card stats by searching in the field
        let card
        await this.state.me.field.asyncForEach(currentCard => {
            if(currentCard.id == this.state.attackingCardId) {
                return card = currentCard
            }
        })
        let updatedLife = this.state.enemy.life - card.attack
        let allyUpdatedField = []

        await this.state.me.field.asyncForEach(currentCard => {
            if(currentCard.id == card.id) {
                // Update the attacking card's property canAttack since you can only attack once per turn
                currentCard.canAttack = false
            }
            allyUpdatedField.push(currentCard)
        })

        // Update enemy's HP or end the game if he lost then we set the state variables
        // gameOver and winner. The winner will be 1 or 2 if you're player one or player 2
        // we know that from the App component because it keeps track of the first player
        // that created the game
        this.setState({
            me: {
                cards: this.state.me.cards,
                life: this.state.me.life,
                field: allyUpdatedField,
                energy: this.state.me.energy,
            },
            enemy: {
                cards: this.state.enemy.cards,
                life: updatedLife <= 0 ? 0 : updatedLife,
                field: this.state.enemy.field,
                energy: this.state.enemy.energy,
            },
            isAttackMode: false,
            attackingCardId: 0,
        })

        if(updatedLife <= 0) {
            // 2. Turn each card into bytes32 with the desired signature
            let allyBytes32FieldCards = await this.getEncryptedFields()

            // 3. Finish the game by sending the final contract call to close the state channel
            const signedMessage = await this.signMessage(await this.generateHash())
            await this.props.contract.methods.verifyPlayerBalance(
                signedMessage,
                allyBytes32FieldCards,
                this.state.me.life,
                String(this.state.nonce),
                this.state.sequence,
                this.props.account,
            ).send({
                from: this.props.account
            })

            // 4. Show your winning message
            this.setState({
                winner: this.props.isThisPlayerOne ? 1 : 2,
                gameOver: true,
            })

            // 5. Emmit the loss to the other player
            this.emitFinish({
                isThisPlayerOne: this.props.isThisPlayerOne,
            })
        } else {
            // Send a game over event if the ended life is zero after the attack
            this.emitDirectAttack({
                remainingLife: updatedLife,
                isThisPlayerOne: this.props.isThisPlayerOne,
            })
        }
    }

    getDamageMultiplier(attackerType, victimType) {
        // this.globalCardTypes = ['fire', 'water', 'wind', 'life', 'death', 'neutral']
        let damageMultiplier = 1
        switch(attackerType) {
            case 'fire':
                if(victimType == 'wind') damageMultiplier = 2
                else if(victimType == 'water' || victimType == 'life' || victimType == 'death') damageMultiplier = 0.5
                break
            case 'wind':
                if(victimType == 'water') damageMultiplier = 2
                else if(victimType == 'fire' || victimType == 'life' || victimType == 'death') damageMultiplier = 0.5
                break
            case 'water':
                if(victimType == 'fire') damageMultiplier = 2
                else if(victimType == 'wind' || victimType == 'life' || victimType == 'death') damageMultiplier = 0.5
                break
            case 'life':
                if(victimType == 'fire' || victimType == 'wind' || victimType == 'water' || victimType == 'neutral') damageMultiplier = 2
                break
            case 'death':
                if(victimType == 'fire' || victimType == 'wind' || victimType == 'water' || victimType == 'neutral') damageMultiplier = 2
                break
            case 'neutral':
                if(victimType == 'fire' || victimType == 'wind' || victimType == 'water' || victimType == 'life' || victimType == 'death') damageMultiplier = 0.5
                break
        }
        return damageMultiplier
    }

    async attackField(target) {
        // Find card stats by searching in the field
        let victim = null
        let attacker = {}
        let allyUpdatedField = []
        let enemyUpdatedField = []

        await this.state.enemy.field.asyncForEach(currentCard => {
            if(currentCard.id == target.firstChild.dataset.id) {
                victim = currentCard
            }
        })

        if(!victim) return this.toggleAttackMode()

        await this.state.me.field.asyncForEach(currentCard => {
            if(currentCard.id == this.state.attackingCardId) {
                attacker = currentCard
            }
        })

        let attackingDamageMultiplier = this.getDamageMultiplier(attacker.type, victim.type)
        let victimDamageMultiplier = this.getDamageMultiplier(victim.type, attacker.type)

        // Reduce attacker's and receiver's card life
        victim.life = victim.life - attacker.attack * attackingDamageMultiplier
        attacker.life = attacker.life - victim.attack * victimDamageMultiplier
        attacker.canAttack = false

        // Update the field by deleting the destroyed cards, we don't care bout those, they are gone forever
        await this.state.enemy.field.asyncForEach(currentCard => {
            let addCard = true
            if(currentCard.id == target.firstChild.dataset.id) {
                if(victim.life <= 0) addCard = false
            }
            if(addCard) enemyUpdatedField.push(Object.assign({}, currentCard))
        })
        await this.state.me.field.asyncForEach(currentCard => {
            let addCard = true
            if(currentCard.id == this.state.attackingCardId) {
                if(attacker.life <= 0) addCard = false
            }
            if(addCard) allyUpdatedField.push(Object.assign({}, currentCard))
        })

        this.setState({
            me: {
                cards: this.state.me.cards,
                life: this.state.me.life,
                field: allyUpdatedField,
                energy: this.state.me.energy,
            },
            enemy: {
                cards: this.state.enemy.cards,
                life: this.state.enemy.life,
                field: enemyUpdatedField,
                energy: this.state.enemy.energy,
            },
            isAttackMode: false,
            attackingCardId: 0,
        })

        this.emitFieldAttack({
            isThisPlayerOne: this.props.isThisPlayerOne,
            attacker,
            victim,
        })
    }

    async endTurn() {
        const signedMessage = await this.signMessage(await this.generateHash())
        await this.asyncSetState({
            turnEnded: true,
            sequence: ++this.state.sequence,
            nonce: Math.floor(Math.random() * 1e16),
            signedMessage,
        })
        this.emitEventTwo(signedMessage)
    }

    async drawCard() {
        let life = this.randomRange(this.globalMinLife, this.globalMaxLife)
        let attack = this.randomRange(this.globalMinAttack, this.globalMaxAttack)
        let type = this.globalCardTypes[this.randomRange(0, this.globalCardTypes.length - 1)]
        let addAttackPoints = 0
        let addLifePoints = (life % 10 / 2)
        if(attack >= 10) addAttackPoints = 5
        else if(attack > 5) addAttackPoints = attack % 5
        let cost = 1 + addLifePoints + addAttackPoints
        let myLastCardId = this.state.myLastCardId + 1

        let card = {
            id: `ALLY${myLastCardId}`,
            isInvoked: false,
            canAttack: false,
            cost,
            life,
            attack,
            type
        }

        let updatedHand = this.state.me.cards.slice(0)
        updatedHand.push(card)

        this.setState({
            me: {
                cards: updatedHand,
                life: this.state.me.life,
                field: this.state.me.field,
                energy: this.state.me.energy,
            },
            myLastCardId,
        })

        this.emitDrawEnemy({
            isThisPlayerOne: this.props.isThisPlayerOne,
        })
    }

    // We pass the entire state to the view
    render() {
        return (
            <GameView
                {...this.state}
                isThisPlayerOne={this.props.isThisPlayerOne}
                invokeCard={card => this.invokeCard(card)}
                toggleAttackMode={card => this.toggleAttackMode(card)}
                attackDirectly={() => this.attackDirectly()}
                attackField={target => this.attackField(target)}
                endTurn={() => this.endTurn()}
            />
        )
    }
}



// This component manages the entire interface exclusively
class GameView extends Component {
    constructor () {
        super()
    }

    // Returns ally array of JSX cards
    displayHandCards() {
        let cards = this.props.me.cards.length > 0 ? this.props.me.cards.map((card, index) => (
            <Card
                {...card}
                key={card.id}
                dataId={card.id}
                turnEnded={this.props.turnEnded}
                invokeCard={propsCard => this.props.invokeCard(propsCard)}
                toggleAttackMode={propsCard => {
                    this.props.toggleAttackMode(propsCard)
                }}
            />
        )) : [(<div className="card" key={Math.random()}></div>)]
        return cards
    }

    generateFieldCards() {
        let allySortedField = Array(this.props.fieldSize).fill(0)
        let allyFieldHtml = []
        let enemySortedField = Array(this.props.fieldSize).fill(0)
        let enemyFieldHtml =[]

        // Sort the array so that cards are positioned in the middle
        if(this.props.me.field.length > 0) {
            let mid = Math.floor(this.props.fieldSize / 2)
            let sidesSize = 1
            for(let i = 0; i < this.props.fieldSize; i++) {
                // Go mid, then right, if there's item right move left, if there's left move right + 1 and so on
                if(i == 0) {
                    allySortedField[mid] = this.props.me.field[i]
                } else if(this.props.me.field[i]) {
                    // If there's a card to the right move to the left
                    if(allySortedField[mid + sidesSize]) {
                        allySortedField[mid - sidesSize] = this.props.me.field[i]
                        sidesSize++
                    } else {
                        allySortedField[mid + sidesSize] = this.props.me.field[i]
                    }
                }
            }
        }

        if(this.props.enemy.field.length > 0) {
            let mid = Math.floor(this.props.fieldSize / 2)
            let sidesSize = 1
            for(let i = 0; i < this.props.fieldSize; i++) {
                if(i == 0) {
                    enemySortedField[mid] = this.props.enemy.field[i]
                } else if(this.props.enemy.field[i]) {
                    // If there's a card to the right move to the left
                    if(enemySortedField[mid + sidesSize]) {
                        enemySortedField[mid - sidesSize] = this.props.enemy.field[i]
                        sidesSize++
                    } else {
                        enemySortedField[mid + sidesSize] = this.props.enemy.field[i]
                    }
                }
            }
        }

        // Populate ally field with ally invoked cards or empty placeholders
        for(let i = 0; i < this.props.fieldSize; i++) {
            allyFieldHtml.push((
                <div className="field-item" key={i + Math.random()}>
                    {allySortedField[i] ? <Card
                        dataId={allySortedField[i].id}
                        key={allySortedField[i].id}
                        {...allySortedField[i]}
                        turnEnded={this.props.turnEnded}
                    /> : ''}
                </div>
            ))
            enemyFieldHtml.push((
                <div className="field-item" key={i + Math.random()} onClick={e => {
                    if(this.props.isAttackMode) this.props.attackField(e.currentTarget)
                }}>
                    {enemySortedField[i] ? <Card
                        dataId={enemySortedField[i].id}
                        key={enemySortedField[i].id}
                        {...enemySortedField[i]}
                        turnEnded={this.props.turnEnded}
                    /> : ''}
                </div>
            ))
        }

        return {allyFieldHtml, enemyFieldHtml}
    }

    render () {
        let enemyCardsInHand = this.props.enemy.cards.map(index => (
            <div className="card" key={index + Math.random()}></div>
        ))

        let allyCards = this.displayHandCards()
        let {allyFieldHtml, enemyFieldHtml} = this.generateFieldCards()
        let areYouTheWinner = (this.props.gameOver && ((this.props.isThisPlayerOne && this.props.winner == 1) || (!this.props.isThisPlayerOne && this.props.winner == 2)))

        return (
            <div className="page game-page">
                <h1 className={this.props.gameOver && areYouTheWinner ? 'winner-message' : (this.props.gameOver && !areYouTheWinner ? 'loser-message' : '')}>
                    {
                        this.props.gameOver && areYouTheWinner ?
                            'Congratulations! You are the winner!' :
                            (this.props.gameOver && !areYouTheWinner ? 'You lost! Better luck next time!' : 'Game On')
                    }
                </h1>
                <Link className={this.props.gameOver ? 'margin-bot button-like' : 'hidden'} to="/">Exit</Link>
                <p className={this.props.error.length === 0 ? 'hidden' : 'error-message'}>{this.props.error}</p>
                <div className="game">
                    <div className={this.props.isAttackMode ? "enemy-stats attack-mode" : "enemy-stats"} onClick={() => {
                        if(this.props.isAttackMode) this.props.attackDirectly()
                    }}>
                        <p>Enemy</p>
                        <p>{this.props.enemy.life} HP</p>
                        <p>{this.props.enemy.energy} Energy</p>
                    </div>
                    <div className="my-stats">
                        <p>You</p>
                        <p>{this.props.me.life} HP</p>
                        <p>{this.props.me.energy} Energy</p>
                    </div>
                    <div className="cards-container enemy-cards-container">{enemyCardsInHand}</div>
                    <div className="field">
                        <div className={this.props.isAttackMode ? "enemy-field attack-mode" : "enemy-field"}>
                            {enemyFieldHtml}
                        </div>
                        <div className="friendly-field">
                            {allyFieldHtml}
                        </div>
                    </div>
                    <div className="cards-container ally-cards-container">{allyCards}</div>
                    <button className="end-turn" disabled={this.props.turnEnded} onClick={() => {
                        this.props.endTurn()
                    }}>End Turn</button>
                </div>
            </div>
        )
    }
}

// The individual Card component
const Card = (props) => {
    // If the card is ally, display the attack button or invoke, else don't display actions
    let buttonToDisplay
    if(props.isInvoked && props.id[0] == 'A') {
        buttonToDisplay = (
            <button disabled={!props.canAttack || props.turnEnded} onClick={() => {
                props.toggleAttackMode(props)
            }}>Attack</button>
        )
    } else if(props.id[0] == 'A') {
        buttonToDisplay = (
            <button disabled={props.turnEnded} onClick={() => {
                props.invokeCard(props)
            }}>invoke</button>
        )
    }
    return (
        <div className={"card " + props.type} data-id={props.dataId}>
            <div>cost: {props.cost}</div>
            <div>life: {props.life}</div>
            <div>attack: {props.attack}</div>
            <div>type: {props.type}</div>
            <div className="spacer"></div>
            {buttonToDisplay}
        </div>
    )
}
