import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const outputRoots = [
  resolve(root, "public/game"),
  resolve(root, "share-src/public/game"),
];

async function alphaBounds(buffer) {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) {
    return { left: 0, top: 0, width: info.width, height: info.height };
  }
  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function unionBounds(bounds, maxWidth, maxHeight, padding = 1) {
  const left = Math.max(0, Math.min(...bounds.map((box) => box.left)) - padding);
  const top = Math.max(0, Math.min(...bounds.map((box) => box.top)) - padding);
  const right = Math.min(
    maxWidth,
    Math.max(...bounds.map((box) => box.left + box.width)) + padding,
  );
  const bottom = Math.min(
    maxHeight,
    Math.max(...bounds.map((box) => box.top + box.height)) + padding,
  );
  return { left, top, width: right - left, height: bottom - top };
}

async function writeToBoth(relativePath, image) {
  const buffer = await image.png().toBuffer();
  await Promise.all(
    outputRoots.map(async (outputRoot) => {
      const destination = resolve(outputRoot, relativePath);
      await mkdir(resolve(destination, ".."), { recursive: true });
      await sharp(buffer).toFile(destination);
    }),
  );
}

async function removeConnectedLightBackground(source) {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const isBackdrop = (index) => {
    const offset = index * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    return (
      Math.min(red, green, blue) >= 224 &&
      Math.max(red, green, blue) - Math.min(red, green, blue) <= 10
    );
  };
  const enqueue = (index) => {
    if (visited[index] || !isBackdrop(index)) return;
    visited[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < info.width; x += 1) {
    enqueue(x);
    enqueue((info.height - 1) * info.width + x);
  }
  for (let y = 0; y < info.height; y += 1) {
    enqueue(y * info.width);
    enqueue(y * info.width + info.width - 1);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % info.width;
    const y = Math.floor(index / info.width);
    if (x > 0) enqueue(index - 1);
    if (x < info.width - 1) enqueue(index + 1);
    if (y > 0) enqueue(index - info.width);
    if (y < info.height - 1) enqueue(index + info.width);
  }

  for (let index = 0; index < pixelCount; index += 1) {
    if (visited[index]) data[index * 4 + 3] = 0;
  }
  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer();
}

async function sliceSheetSet({
  sourceDirectory,
  animations,
  cellWidth,
  cellHeight,
  outputDirectory,
  outputWidth,
  outputHeight,
  cropMode = "all",
  stateCrops = {},
  stateOutputWidths = {},
}) {
  const sheets = {};
  const allCells = [];
  for (const [state, filename] of Object.entries(animations)) {
    const sheetPath = resolve(sourceDirectory, filename);
    const metadata = await sharp(sheetPath).metadata();
    if (
      !metadata.width ||
      metadata.height !== cellHeight ||
      metadata.width % cellWidth !== 0
    ) {
      throw new Error(
        `${filename} 不是预期的 ${cellWidth}×${cellHeight} 分镜表`,
      );
    }
    const frameCount = metadata.width / cellWidth;
    const cells = await Promise.all(
      Array.from({ length: frameCount }, (_, index) =>
        sharp(sheetPath)
          .extract({
            left: index * cellWidth,
            top: 0,
            width: cellWidth,
            height: cellHeight,
          })
          .png()
          .toBuffer(),
      ),
    );
    sheets[state] = cells;
    allCells.push(...cells);
  }

  for (const [state, cells] of Object.entries(sheets)) {
    const commonCrop =
      stateCrops[state] ??
      unionBounds(
        await Promise.all(
          (cropMode === "state" ? cells : allCells).map(alphaBounds),
        ),
        cellWidth,
        cellHeight,
        1,
      );
    const stateOutputWidth = stateOutputWidths[state] ?? outputWidth;
    for (let index = 0; index < cells.length; index += 1) {
      await writeToBoth(
        `${outputDirectory}/${state}/frame-${String(index).padStart(2, "0")}.png`,
        sharp(cells[index])
          .extract(commonCrop)
          .resize(stateOutputWidth, outputHeight, {
            fit: "contain",
            position: "south",
            kernel: sharp.kernel.nearest,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          }),
      );
    }
  }
}

async function slicePlayer() {
  const sources = Array.from({ length: 9 }, (_, index) =>
    resolve(root, `主角/idle/Idle${index + 1}.png`),
  );
  const sourceBuffers = await Promise.all(
    sources.map((source) => sharp(source).png().toBuffer()),
  );
  const bounds = await Promise.all(sourceBuffers.map(alphaBounds));
  const commonCrop = unionBounds(bounds, 64, 64, 0);
  for (let index = 0; index < sourceBuffers.length; index += 1) {
    await writeToBoth(
      `player/idle/idle-${String(index).padStart(2, "0")}.png`,
      sharp(sourceBuffers[index])
        .extract(commonCrop)
        .resize(24, 40, { fit: "fill", kernel: sharp.kernel.nearest }),
    );
  }
}

const mushroomAnimations = {
  idle: "Mushroom-Idle.png",
  run: "Mushroom-Run.png",
  attack: "Mushroom-Attack.png",
  hit: "Mushroom-Hit.png",
  die: "Mushroom-Die.png",
};

async function sliceMushrooms() {
  await sliceSheetSet({
    sourceDirectory: resolve(
      root,
      "蘑菇怪/Mushroom/Mushroom without VFX",
    ),
    animations: mushroomAnimations,
    cellWidth: 80,
    cellHeight: 64,
    outputDirectory: "enemies/mushroom",
    outputWidth: 20,
    outputHeight: 20,
    cropMode: "state",
  });
}

async function sliceTowerAndWalls() {
  const towerWithoutBackdrop = await removeConnectedLightBackground(
    resolve(root, "防御塔/防御塔.png"),
  );
  const towerCrop = unionBounds(
    [await alphaBounds(towerWithoutBackdrop)],
    1254,
    1254,
    2,
  );
  await writeToBoth(
    "structures/tower.png",
    sharp(towerWithoutBackdrop)
      .extract(towerCrop)
      .resize(40, 60, {
        fit: "contain",
        kernel: sharp.kernel.lanczos3,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      }),
  );

  const wallSources = {
    "wood-wall.png": "木墙.png",
    "stone-wall.png": "石墙.png",
    "iron-wall.png": "铁墙.png",
    "crystal-wall.png": "水晶墙.png",
  };
  for (const [outputName, sourceName] of Object.entries(wallSources)) {
    await writeToBoth(
      `structures/${outputName}`,
      sharp(resolve(root, "可放置墙", sourceName)).resize(20, 20, {
        fit: "fill",
        kernel: sharp.kernel.lanczos3,
      }),
    );
  }
}

async function sliceArcher() {
  await sliceSheetSet({
    sourceDirectory: resolve(root, "Archer"),
    animations: {
      idle: "Archer_Idle.png",
      run: "Archer_Run.png",
      shoot: "Archer_Shoot.png",
    },
    cellWidth: 192,
    cellHeight: 192,
    outputDirectory: "units/archer",
    outputWidth: 20,
    outputHeight: 20,
  });
  const arrowSource = await sharp(resolve(root, "Archer/Arrow.png"))
    .png()
    .toBuffer();
  const arrowCrop = unionBounds(
    [await alphaBounds(arrowSource)],
    64,
    64,
    0,
  );
  await writeToBoth(
    "units/archer/arrow.png",
    sharp(arrowSource).extract(arrowCrop),
  );
}

async function sliceAlliedUnitsAndFire() {
  await sliceSheetSet({
    sourceDirectory: resolve(root, "老武士/Sprites"),
    animations: {
      idle: "IDLE.png",
      run: "RUN.png",
      attack: "ATTACK 1.png",
      hit: "HURT.png",
    },
    cellWidth: 96,
    cellHeight: 96,
    outputDirectory: "units/swordsman",
    outputWidth: 28,
    outputHeight: 40,
    cropMode: "state",
  });
  await sliceSheetSet({
    sourceDirectory: resolve(root, "Lancer"),
    animations: {
      idle: "Lancer_Idle.png",
      run: "Lancer_Run.png",
      attack: "Lancer_Right_Attack.png",
    },
    cellWidth: 320,
    cellHeight: 320,
    outputDirectory: "units/spearman",
    outputWidth: 28,
    outputHeight: 40,
    cropMode: "state",
    stateCrops: {
      idle: { left: 105, top: 92, width: 92, height: 116 },
      run: { left: 105, top: 96, width: 92, height: 112 },
      attack: { left: 112, top: 115, width: 198, height: 90 },
    },
    stateOutputWidths: {
      attack: 40,
    },
  });
  await sliceSheetSet({
    sourceDirectory: resolve(root, "Warrior"),
    animations: {
      idle: "Warrior_Idle.png",
      run: "Warrior_Run.png",
      attack: "Warrior_Attack1.png",
      guard: "Warrior_Guard.png",
    },
    cellWidth: 192,
    cellHeight: 192,
    outputDirectory: "units/knight",
    outputWidth: 28,
    outputHeight: 40,
    cropMode: "state",
  });
  await sliceSheetSet({
    sourceDirectory: resolve(root, "Fire"),
    animations: {
      burn: "Fire.png",
    },
    cellWidth: 128,
    cellHeight: 128,
    outputDirectory: "effects/fire",
    outputWidth: 40,
    outputHeight: 40,
    cropMode: "state",
  });
}

async function sliceSupportAndEffects() {
  await sliceSheetSet({
    sourceDirectory: resolve(root, "Monk"),
    animations: {
      idle: "Idle.png",
      heal: "Heal.png",
      "heal-effect": "Heal_Effect.png",
    },
    cellWidth: 192,
    cellHeight: 192,
    outputDirectory: "units/monk",
    outputWidth: 28,
    outputHeight: 32,
    cropMode: "state",
  });
  await sliceSheetSet({
    sourceDirectory: resolve(
      root,
      "Monsters_Creatures_Fantasy/Flying eye",
    ),
    animations: {
      flight: "Flight.png",
      attack: "Attack.png",
      hit: "Take Hit.png",
      die: "Death.png",
    },
    cellWidth: 150,
    cellHeight: 150,
    outputDirectory: "enemies/flying-eye",
    outputWidth: 40,
    outputHeight: 40,
    cropMode: "state",
  });
  await sliceSheetSet({
    sourceDirectory: resolve(root, "Explosion"),
    animations: {
      explode: "Explosions.png",
    },
    cellWidth: 192,
    cellHeight: 192,
    outputDirectory: "effects/explosion",
    outputWidth: 60,
    outputHeight: 60,
    cropMode: "state",
  });
}

async function sliceScenery() {
  await Promise.all([
    writeToBoth(
      "terrain/dirt-1.png",
      sharp(resolve(root, "GandalfHardcore FREE Platformer Assets/BG Dirt1.png")),
    ),
    writeToBoth(
      "terrain/dirt-2.png",
      sharp(resolve(root, "GandalfHardcore FREE Platformer Assets/BG Dirt2.png")),
    ),
    writeToBoth(
      "scenery/decor-sheet.png",
      sharp(resolve(root, "GandalfHardcore FREE Platformer Assets/Decor.png")),
    ),
    writeToBoth(
      "scenery/tent.png",
      sharp(resolve(root, "GandalfHardcore FREE Platformer Assets/Small Tent.png")),
    ),
  ]);

  const treeSheet = resolve(root, "Trees/Tree.png");
  const treeCells = [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [0, 1],
    [1, 1],
  ];
  for (let index = 0; index < treeCells.length; index += 1) {
    const [column, row] = treeCells[index];
    await writeToBoth(
      `scenery/trees/tree-${String(index).padStart(2, "0")}.png`,
      sharp(treeSheet)
        .extract({
          left: column * 192,
          top: row * 192,
          width: 192,
          height: 192,
        })
        .resize(56, 72, {
          fit: "contain",
          position: "south",
          kernel: sharp.kernel.nearest,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        }),
    );
  }

  await sliceSheetSet({
    sourceDirectory: resolve(root, "Sheep"),
    animations: {
      idle: "HappySheep_Idle.png",
      bounce: "HappySheep_Bouncing.png",
    },
    cellWidth: 128,
    cellHeight: 128,
    outputDirectory: "scenery/sheep",
    outputWidth: 20,
    outputHeight: 20,
    cropMode: "state",
  });

  const scarecrowBuffer = await sharp(resolve(root, "稻草人.png"))
    .png()
    .toBuffer();
  const scarecrowCrop = unionBounds(
    [await alphaBounds(scarecrowBuffer)],
    192,
    192,
    1,
  );
  await writeToBoth(
    "scenery/scarecrow.png",
    sharp(scarecrowBuffer)
      .extract(scarecrowCrop)
      .resize(32, 40, {
        fit: "contain",
        position: "south",
        kernel: sharp.kernel.nearest,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      }),
  );
}

async function sliceGrass() {
  await writeToBoth(
    "terrain/grass.png",
    sharp(resolve(root, "草地/grass.png")),
  );
}

async function sliceLargeEnemies() {
  const commonAnimations = {
    idle: "Idle.png",
    walk: "Walk.png",
    attack01: "Attack01.png",
    attack02: "Attack02.png",
    hit: "Hurt.png",
    die: "Death.png",
  };
  await sliceSheetSet({
    sourceDirectory: resolve(
      root,
      "血魔和恶魔/Characters(100x100 split)/Blood Monster_A/Blood Monster_A",
    ),
    animations: Object.fromEntries(
      Object.entries(commonAnimations).map(([state, suffix]) => [
        state,
        `Blood Monster_A_${suffix}`,
      ]),
    ),
    cellWidth: 100,
    cellHeight: 100,
    outputDirectory: "enemies/blood-monster",
    outputWidth: 40,
    outputHeight: 40,
    cropMode: "state",
  });
  await sliceSheetSet({
    sourceDirectory: resolve(
      root,
      "血魔和恶魔/Characters(100x100 split)/Demon_A/Demon_A",
    ),
    animations: Object.fromEntries(
      Object.entries(commonAnimations).map(([state, suffix]) => [
        state,
        `Demon_A_${suffix}`,
      ]),
    ),
    cellWidth: 100,
    cellHeight: 100,
    outputDirectory: "enemies/demon",
    outputWidth: 60,
    outputHeight: 60,
    cropMode: "state",
  });
}

for (const outputRoot of outputRoots) {
  await rm(resolve(outputRoot, "player/idle"), { recursive: true, force: true });
  await rm(resolve(outputRoot, "enemies/mushroom"), {
    recursive: true,
    force: true,
  });
  await rm(resolve(outputRoot, "enemies/blood-monster"), {
    recursive: true,
    force: true,
  });
  await rm(resolve(outputRoot, "enemies/demon"), {
    recursive: true,
    force: true,
  });
  await rm(resolve(outputRoot, "units/archer"), {
    recursive: true,
    force: true,
  });
  await rm(resolve(outputRoot, "units/swordsman"), {
    recursive: true,
    force: true,
  });
  await rm(resolve(outputRoot, "units/spearman"), {
    recursive: true,
    force: true,
  });
  await rm(resolve(outputRoot, "units/knight"), {
    recursive: true,
    force: true,
  });
  await rm(resolve(outputRoot, "units/monk"), {
    recursive: true,
    force: true,
  });
  await rm(resolve(outputRoot, "enemies/flying-eye"), {
    recursive: true,
    force: true,
  });
  await rm(resolve(outputRoot, "effects/explosion"), {
    recursive: true,
    force: true,
  });
  await rm(resolve(outputRoot, "effects/fire"), {
    recursive: true,
    force: true,
  });
  await rm(resolve(outputRoot, "terrain"), {
    recursive: true,
    force: true,
  });
  await rm(resolve(outputRoot, "scenery"), {
    recursive: true,
    force: true,
  });
}
await slicePlayer();
await sliceMushrooms();
await sliceTowerAndWalls();
await sliceArcher();
await sliceAlliedUnitsAndFire();
await sliceSupportAndEffects();
await sliceGrass();
await sliceScenery();
await sliceLargeEnemies();

console.log("已生成草地泥土、塔墙、四类守军、僧侣、火焰爆炸、飞眼及场景装饰素材。");
