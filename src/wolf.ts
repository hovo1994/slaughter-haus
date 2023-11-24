import send from "koa-send";
import { GameMessage, Player, WOLF_ID, playersDatabase } from "./data";
import { broadcast, sendMessage } from "./main";

function findDistanceToTarget(wolf: Player, pig: Player) {
  const dist = Math.sqrt(
    Math.pow(pig.x - wolf.x, 2) + Math.pow(pig.y - wolf.y, 2)
  );
  return dist;
}
export const WOLF_SPEED = 5;

let score = 0;

function moveTowardsTarget(wolf: Player, player: Player) {
  let distX = player.x - wolf.x;
  let distY = player.y - wolf.y;
  let distToTarget = Math.ceil(findDistanceToTarget(wolf, player));
  if (distToTarget < 20) {
    eat(player);
    return;
  }

  if (Math.abs(distX) > Math.abs(distY)) {
    if (distX != 0) {
      wolf.x += (Math.abs(distX) / distX) * WOLF_SPEED;
    }
  } else {
    if (distY != 0) {
      wolf.y += (Math.abs(distY) / distY) * WOLF_SPEED;
    }
  }
  // make sure we don't go out of bounds

  wolf.x = Math.max(Math.min(650, wolf.x), 0);
  wolf.y = Math.max(Math.min(650, wolf.y), 0);
}

// eat the pig
function eat(player: Player) {
  const message: GameMessage = {
    ...player,
    msg_type: "game_over",
    message: "you were eaten",
  };
  delete playersDatabase[player.user_id];
  sendMessage(message, player.ws);

  // increase all other's scores
  Object.values(playersDatabase).forEach((p) => {
    p.score = p.score + 1;
    const message2: GameMessage = {
      message: "you scored a point!",
      msg_type: "score_point",
      score: p.score,
      user_id: p.user_id,
      x: p.x,
      y: p.y,
      color: p.color,
      image: p.image,
    };
    // tell them all about their scores
    sendMessage(message2, p.ws);

    // and about the deleted player
    sendMessage(
      {
        msg_type: "delete_other_user",
        user_id: player.user_id,
        x: 0,
        y: 0,
        color: "",
        image: "",
      },
      p.ws
    );
  });

  // broadcast(message2, player.ws);
}

export function doWolfThings() {
  const wolf = playersDatabase[WOLF_ID];
  let closestTarget = Infinity;
  let closestPlayerId = "";
  Object.entries(playersDatabase).forEach(([id, player]) => {
    if (id === WOLF_ID) {
      return;
    }
    const distance2Piggie = findDistanceToTarget(wolf, player);
    console.log("distance2Piggie", distance2Piggie);
    if (distance2Piggie <= closestTarget) {
      closestTarget = distance2Piggie;
      closestPlayerId = player.user_id;
    }
  });
  console.log("playerID: ", closestPlayerId);
  moveTowardsTarget(wolf, playersDatabase[closestPlayerId]);
}
