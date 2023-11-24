import { Player } from "./main";

function findDistanceToTarget(wolf, pig) {
  const dist = Math.sqrt(
    Math.pow(pig.x - wolf.x, 2) + Math.pow(pig.y - wolf.y, 2)
  );
  return dist;
}

export function doWolfThings(playerDatabase: Record<string, Player>) {
  const wolf = playerDatabase["0"];
  const closestTarget = Infinity;
  const closestPlayer;
  Object.entries(playerDatabase).forEach(([id, player]) => {
    if (id === "0") {
      return;
    }
    const distance2Piggie = findDistanceToTarget(wolf, player);
    if (distance2Piggie < closestTarget) {
      closestTarget = distance2Piggie;
    }
  });
}
