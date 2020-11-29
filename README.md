## How to run
- `yarn` installs dependencies
- `yarn fe:watch` will compile jsx
- `yarn be:dev` starts localhost:8000 and will serve the client
- optional replacement: `yarn fe:dev` will run the client without being served from the server

## General Specification
- Each user has 100 life points and an initial 10 energy points.
- Energy points are used to deploy new cards.
- Each card has a specific attack and life point attributes. The attack values range from 5 to 7.
- Each turn, the energy is increased by 1 point.
- When the game starts, each user gets 3 random cards. The first user gets 4 since they draw a card each turn.
- You can attack the opponent directly whenever you want with the deployed cards.
- A player loses when his life points are reduced to 0.
- There's a button saying "End Turn" that you press to end your turn and pass to the next one.
- Each player has 60 seconds to complete his turn, if the time passes the turn is passed automatically. If 3 consecutive turns are passed automatically, the remaining player is considered the winner.
- Each player can have a maximum of 5 cards in the field.

## Card Specification
Cards have the following attributes:
- Attack: between 5 and 10, randomly chosen.
- Life points: cards have 10 life points and they get destroyed after removing them all.
- Defence: there's no defence attribute yet.
- Deployment cost: each card costs between 1 and 5 energy points to deploy. The more expensive it is, the more life points or attack it will have randomly. For instance:
    - A card that costs 1 energy point will have 10 life points, 5 attack.
    - A card that costs 2 energy points will either have 12 life points or 6 attack.
    - A card that costs 5 energy points will have 18 life points and 9 attack.
- Each deployment point can increase 2 life or 1 attack, randomly. Each point changes one parameter.
- Type: each card has a type which determines its strength and weaknesses against other types.
- Deployed cards can't attack during the first turn.
- Each card can only attack once per turn.
- When you attack, you also receive damage as if the other card attacked you, so the cards' life points are both reduced.
- If you attack your opponent directly, the card life isn't reduced.

## Type Specification
Each card has a type that inflicts increased or reduced damage to another type. Vulnerable types receive 2X damage, resistant types receive 0.5X damage.
- Fire: 2X on wind, 0.5X on water, life and death.
- Wind: 2X on water, 0.5X on fire, life and death.
- Water: 2X on fire, 0.5X on wind, life and death.
- Life: 2x on fire, wind, water and neutral.
- Death: 2x on fire, wind, water and neutral.
- Neutral: 0.5X on fire, wind, water, life and death.

## Technical Specification
Each card has the following attributes:
```
{
    id: Number,
    isInvoked: true | false,
    canAttack: true | false,
    cost: 1 to 10,
    life: 10 to 18,
    attack: 5 to 9,
    type: 'fire' | 'water' | 'wind' | 'life' | 'death' | 'neutral',
}
```