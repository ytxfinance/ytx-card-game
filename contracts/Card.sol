pragma solidity 0.5.10;

/*
    We need to keep track of each card in the game and the player lives in each signed message to verify the changes.

    Each card has the following attributes: {
        canAttack: true | false,
        cost: 1 to 10,
        life: 10 to 18,
        attack: 5 to 9,
        type: ['fire', 'water', 'wind', 'life', 'death', 'neutral'],
    }
    Each player will have up to 5 cards in the field with their life and attack, then the players will have their life
    so it will be:
        Player 1 has 58 life points:
        [card canAttack | 1cost | 5attack | 10life | water] [card 1cost | 5attack | 10life | fire] [card  1cost |5attack | 10life | neutral] [card 1cost | 5attack | 10life | fire] [card 1cost | 5attack | 10life | death]
        vs
        Player 2 has 20 life points:
        [card 1cost | 5attack | 10life | death] [card 1cost | 5attack | 10life | life] [card 1cost | 5attack | 10life | neutral] [card 1cost | 5attack | 10life | neutral] [card 1cost | 5attack | 10life | wind]

    We can pass the cards as an array where each card is 3 values for instance, for the first player it will be:
        const cardsPlayerOne = [5, 10, 'water', 5, 10, 'fire', 5, 10, 'neutral', 5, 10, 'fire', 5, 10, 'death'] // 5 cards with their values
        const cardsPlayerTwo = [5, 10, 'death', 5, 10, 'life', 5, 10, 'neutral', 5, 10, 'neutral', 5, 10, 'wind'] // 5 cards with their values
        const playerOneLife = 58
        const playerTwoLife = 20

    We don't care about the cards in hand since they don't affect the state of the game. At least for now.

    So the signed object will be {cardsPlayerOne, cardsPlayerTwo, playerOneLife, playerTwoLife, turn}
*/

contract Card {
    address payable public player1;
    address payable public player2;
    uint256 public player1Escrow;
    uint256 public player2Escrow;

    bool public isPlayer1SetUp;
    bool public isPlayer2SetUp;
    uint256 public winnerNumber; // Can be 1 | 2 indicating the winner is 1 or the winner is 2

    bytes32[] public cardsPlayerOne;
    bytes32[] public cardsPlayerTwo;
    uint256 public playerOneLife; // Remaining life points
    uint256 public playerTwoLife;

    constructor () public payable {
        require(msg.value > 0);
        player1 = msg.sender;
        player1Escrow = msg.value;
    }

    function setupPlayer2() public payable {
        require(msg.value > 0);
        player2 = msg.sender;
        player2Escrow = msg.value;
    }

    /// @notice To verify and save the player balance to distribute it later when the game is completed. The addressOfMessage is important to decide which balance is being updated
    function verifyPlayerBalance(bytes memory playerMessage, bytes32[] memory cardsCurrentPlayer, uint256 playerLife, uint256 playerNonce, uint256 playerSequence, address addressOfMessage) public {
        require(player2 != address(0), '#1 The address of the first player is invalid');
        require(playerMessage.length == 65, '#2 The length of the message is invalid');
        require(addressOfMessage == player1 || addressOfMessage == player2, '#3 You must use a valid address of one of the players');
        require((addressOfMessage == player1 && !isPlayer1SetUp) || (addressOfMessage == player2 && !isPlayer2SetUp), '#5 The player is already setup');
        uint256 escrowToUse = player1Escrow;
        if(addressOfMessage == player2) escrowToUse = player2Escrow;

        // Recreate the signed message for the first player to verify that the parameters are correct
        bytes32 message = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", keccak256(abi.encodePacked(playerNonce, cardsCurrentPlayer, playerLife, playerSequence))));
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(playerMessage, 32))
            s := mload(add(playerMessage, 64))
            v := byte(0, mload(add(playerMessage, 96)))
        }

        address originalSigner = ecrecover(message, v, r, s);
        require(originalSigner == addressOfMessage, '#4 The signer must be the original address');

        if(addressOfMessage == player1) {
            cardsPlayerOne = cardsCurrentPlayer;
            playerOneLife = playerLife;
            isPlayer1SetUp = true;
        } else {
            cardsPlayerTwo = cardsCurrentPlayer;
            playerTwoLife = playerLife;
            isPlayer2SetUp = true;
        }

        if(isPlayer1SetUp && isPlayer2SetUp) {
            if(playerOneLife == 0) {
                winnerNumber = 2;
                player2.transfer(address(this).balance);
            } else {
                winnerNumber = 1;
                player1.transfer(address(this).balance);
            }
        }
    }
}
