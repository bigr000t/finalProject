"use strict";


// ==================== 몬스터 데이터 ====================

export const MONSTERS = [

  // ==================== 일반 몬스터 ====================

  {
    id: "skeleton",
    name: "해골병사",
    image: "/images/enemy00.png",
    hp: 80,
    atk: 16,
    def: 8,
    spd: 0.85,
    crit: 0.03
  },

  {
    id: "slime",
    name: "슬라임",
    image: "/images/enemy01.png",
    hp: 100,
    atk: 10,
    def: 15,
    spd: 0.65,
    crit: 0.01
  },

  {
    id: "guardDog",
    name: "경비견",
    image: "/images/enemy02.png",
    hp: 65,
    atk: 12,
    def: 5,
    spd: 1.20,
    crit: 0.03
  },

  {
    id: "skeletonArcher",
    name: "해골궁수",
    image: "/images/enemy03.png",
    hp: 60,
    atk: 13,
    def: 5,
    spd: 0.85,
    crit: 0.15
  },

  {
    id: "skeletonGuard",
    name: "해골방패병",
    image: "/images/enemy04.png",
    hp: 110,
    atk: 10,
    def: 20,
    spd: 0.60,
    crit: 0.01
  },

  {
    id: "eagle",
    name: "독수리",
    image: "/images/enemy05.png",
    hp: 65,
    atk: 13,
    def: 5,
    spd: 1.40,
    crit: 0.05
  },

  {
    id: "ghost",
    name: "유령",
    image: "/images/enemy06.png",
    hp: 75,
    atk: 15,
    def: 6,
    spd: 0.90,
    crit: 0.20
  },

  {
    id: "skeletonKnight",
    name: "해골기사",
    image: "/images/enemy07.png",
    hp: 110,
    atk: 25,
    def: 15,
    spd: 0.85,
    crit: 0.05
  },

  {
    id: "golem",
    name: "골렘",
    image: "/images/enemy08.png",
    hp: 140,
    atk: 15,
    def: 28,
    spd: 0.45,
    crit: 0.01
  },

  {
    id: "skeletonCrossbowman",
    name: "해골석궁병",
    image: "/images/enemy09.png",
    hp: 80,
    atk: 22,
    def: 10,
    spd: 0.55,
    crit: 0.30
  },

  {
    id: "gargoyle",
    name: "가고일",
    image: "/images/enemy10.png",
    hp: 150,
    atk: 18,
    def: 32,
    spd: 0.60,
    crit: 0.03
  },

  {
    id: "griffin",
    name: "그리핀",
    image: "/images/enemy11.png",
    hp: 90,
    atk: 18,
    def: 10,
    spd: 1.50,
    crit: 0.05
  },

  {
    id: "wraithAssassin",
    name: "망령 암살자",
    image: "/images/enemy12.png",
    hp: 80,
    atk: 20,
    def: 8,
    spd: 1.25,
    crit: 0.35
  },


  // ==================== 엘리트 몬스터 ====================

  {
    id: "cerberus",
    name: "케르베로스",
    image: "/images/elite00.png",
    hp: 110,
    atk: 16,
    def: 10,
    spd: 1.50,
    crit: 0.05,
    isElite: true
  },

  {
    id: "kingSlime",
    name: "킹슬라임",
    image: "/images/elite01.png",
    hp: 180,
    atk: 18,
    def: 35,
    spd: 0.50,
    crit: 0.03,
    isElite: true
  },

  {
    id: "boneWyvern",
    name: "본 와이번",
    image: "/images/elite02.png",
    hp: 180,
    atk: 30,
    def: 25,
    spd: 1.00,
    crit: 0.30,
    isElite: true
  },

  {
    id: "deathKnight",
    name: "데스나이트",
    image: "/images/elite03.png",
    hp: 220,
    atk: 45,
    def: 30,
    spd: 0.80,
    crit: 0.10,
    isElite: true
  },


  // ==================== 보스 몬스터 ====================

  {
    id: "wyvern",
    name: "와이번",
    image: "/images/boss00.png",
    hp: 160,
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
    hp: 240,
    atk: 50,
    def: 35,
    spd: 1.00,
    crit: 0.15,
    isBoss: true
  }

];


// ==================== 층별 등장 규칙 ====================

export const ENEMY_POOLS = [

  // ==================== 지하 감옥 ====================

  {
    minFloor: 1,
    maxFloor: 9,
    monsters: [
      "skeleton",
      "slime",
      "guardDog",
      "skeletonArcher"
    ]
  },

  // 10층 엘리트
  {
    minFloor: 10,
    maxFloor: 10,
    monsters: [
      "cerberus"
    ]
  },

  {
    minFloor: 11,
    maxFloor: 49,
    monsters: [
      "skeleton",
      "slime",
      "guardDog",
      "skeletonArcher"
    ]
  },


  // ==================== 버려진 성채 ====================

  // 50층 엘리트
  {
    minFloor: 50,
    maxFloor: 50,
    monsters: [
      "kingSlime"
    ]
  },

  {
    minFloor: 51,
    maxFloor: 99,
    monsters: [
      "skeleton",
      "skeletonGuard",
      "eagle",
      "ghost"
    ]
  },

  // 100층 보스
  {
    minFloor: 100,
    maxFloor: 100,
    monsters: [
      "wyvern"
    ]
  },


  // ==================== 무너진 성벽 ====================

  {
    minFloor: 101,
    maxFloor: 149,
    monsters: [
      "skeletonKnight",
      "golem",
      "eagle",
      "skeletonCrossbowman"
    ]
  },


  // ==================== 마법 고탑 ====================

  // 150층 엘리트
  {
    minFloor: 150,
    maxFloor: 150,
    monsters: [
      "boneWyvern"
    ]
  },

  {
    minFloor: 151,
    maxFloor: 189,
    monsters: [
      "skeletonKnight",
      "gargoyle",
      "griffin",
      "wraithAssassin"
    ]
  },

  // 190층 엘리트
  {
    minFloor: 190,
    maxFloor: 190,
    monsters: [
      "deathKnight"
    ]
  },

  {
    minFloor: 191,
    maxFloor: 199,
    monsters: [
      "skeletonKnight",
      "gargoyle",
      "griffin",
      "wraithAssassin"
    ]
  },

  // 200층 보스
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

  hp: 0.06,
  atk: 0.012,
  def: 0.012,
  spd: 0.006,
  crit: 0.0006,

  hpPower: 1.24,
  atkPower: 1.24,
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

    isElite: monster.isElite ?? false,

    maxHp,

    currentHp: maxHp,

    atk,

    def,

    spd,

    crit

  };

}
