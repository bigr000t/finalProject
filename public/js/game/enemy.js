"use strict";


// ==================== 몬스터 데이터 ====================

export const MONSTERS = [

  {
    id: "wolf",
    name: "늑대",
    image: "/images/enemy00.png",
    hp: 65,
    atk: 12,
    def: 5,
    spd: 1.20,
    crit: 0.05
  },

  {
    id: "boar",
    name: "멧돼지",
    image: "/images/enemy01.png",
    hp: 85,
    atk: 14,
    def: 9,
    spd: 0.85,
    crit: 0.01
  },

  {
    id: "bear",
    name: "곰",
    image: "/images/enemy02.png",
    hp: 130,
    atk: 17,
    def: 10,
    spd: 0.65,
    crit: 0.02
  },

  {
    id: "slime",
    name: "슬라임",
    image: "/images/enemy03.png",
    hp: 90,
    atk: 52,
    def: 24,
    spd: 0.30,
    crit: 0.02
  },

  {
    id: "skeleton",
    name: "해골 병사",
    image: "/images/enemy04.png",
    hp: 110,
    atk: 39,
    def: 12,
    spd: 1.20,
    crit: 0.05
  },

  {
    id: "wyvern",
    name: "와이번",
    image: "/images/boss00.png",
    hp: 250,
    atk: 30,
    def: 20,
    spd: 1.00,
    crit: 0.10,
    isBoss: true
  },

  {
    id: "dragon",
    name: "드래곤",
    image: "/images/boss01.png",
    hp: 400,
    atk: 50,
    def: 35,
    spd: 1.00,
    crit: 0.15,
    isBoss: true
  }

];


// ==================== 층별 등장 규칙 ====================

export const ENEMY_POOLS = [

  {
    minFloor: 1,
    maxFloor: 9,

    monsters: [
      "wolf",
      "boar"
    ]
  },

  {
    minFloor: 10,
    maxFloor: 10,

    monsters: [
      "bear"
    ]
  },

  {
    minFloor: 11,
    maxFloor: 49,

    monsters: [
      "wolf",
      "boar",
      "bear"
    ]
  },

  {
    minFloor: 50,
    maxFloor: 99,

    monsters: [
      "wolf",
      "boar",
      "bear",
      "slime"
    ]
  },

  {
    minFloor: 100,
    maxFloor: 100,

    monsters: [
      "wyvern"
    ]
  },

  {
    minFloor: 101,
    maxFloor: 149,

    monsters: [
      "wolf",
      "boar",
      "bear",
      "slime",
      "skeleton"
    ]
  },

  {
    minFloor: 150,
    maxFloor: 150,

    monsters: [
      "wyvern"
    ]
  },

    {
    minFloor: 151,
    maxFloor: 199,

    monsters: [
      "bear",
      "slime",
      "skeleton"
    ]
  },

  {
    minFloor: 200,
    maxFloor: 200,

    monsters: [
      "dragon"
    ]
  }

];


// ==================== 몬스터 성장치 ====================

export const ENEMY_GROWTH = {

  hp: 0.01,
  atk: 0.018,
  def: 0.03,
  spd: 0.005,
  crit: 0.0004,

  hpPower: 1.24,
  atkPower: 1.20,
  defPower: 1.24,

  maxSpd: 3.0,
  maxCrit: 0.5

};


// ==================== 층별 체력 계산 ====================

export function calculateEnemyHp(baseHp, floor) {

  return Math.floor(

    baseHp * (

      1 + ENEMY_GROWTH.hp *

      Math.pow(
        floor - 1,
        ENEMY_GROWTH.hpPower
      )

    )

  );

}


// ==================== 층별 공격력 계산 ====================

export function calculateEnemyAtk(baseAtk, floor) {

  return Math.floor(

    baseAtk * (

      1 + ENEMY_GROWTH.atk *

      Math.pow(
        floor - 1,
        ENEMY_GROWTH.atkPower
      )

    )

  );

}


// ==================== 층별 방어력 계산 ====================

export function calculateEnemyDef(baseDef, floor) {

  return Math.floor(

    baseDef * (

      1 + ENEMY_GROWTH.def *

      Math.pow(
        floor - 1,
        ENEMY_GROWTH.defPower
      )

    )

  );

}


// ==================== 층별 공격 속도 계산 ====================

export function calculateEnemySpd(baseSpd, floor) {

  return Math.min(

    ENEMY_GROWTH.maxSpd,

    Number(

      (

        baseSpd *

        (1 + ENEMY_GROWTH.spd * (floor - 1))

      ).toFixed(3)

    )

  );

}


// ==================== 층별 치명타 확률 계산 ====================

export function calculateEnemyCrit(baseCrit, floor) {

  return Math.min(

    ENEMY_GROWTH.maxCrit,

    Number(

      (

        baseCrit +

        ENEMY_GROWTH.crit * (floor - 1)

      ).toFixed(4)

    )

  );

}


// ==================== 등장 가능한 몬스터 조회 ====================

export function getEnemyPool(floor) {

  if (
    !Number.isSafeInteger(floor) ||
    floor < 1
  ) {

    throw new Error("잘못된 층수입니다.");

  }

  // 200층 단위 순환
  const localFloor = ((floor - 1) % 200) + 1;

  const pool = ENEMY_POOLS.find(group => {

    return (

      localFloor >= group.minFloor &&

      localFloor <= group.maxFloor

    );

  });

  return MONSTERS.filter(monster => {

    return pool.monsters.includes(monster.id);

  });

}


// ==================== 몬스터 생성 ====================

export function createEnemy(floor) {

  const pool = getEnemyPool(floor);

  const index = Math.floor(
    Math.random() * pool.length
  );

  const monster = pool[index];


  // ==================== 최종 능력치 계산 ====================

  const maxHp = calculateEnemyHp(
    monster.hp,
    floor
  );

  const atk = calculateEnemyAtk(
    monster.atk,
    floor
  );

  const def = calculateEnemyDef(
    monster.def,
    floor
  );

  const spd = calculateEnemySpd(
    monster.spd,
    floor
  );

  const crit = calculateEnemyCrit(
    monster.crit,
    floor
  );


  // ==================== 몬스터 반환 ====================

  return {

    ...monster,

    isBoss: monster.isBoss ?? false,

    maxHp,

    currentHp: maxHp,

    atk,

    def,

    spd,

    crit

  };

}