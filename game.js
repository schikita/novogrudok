/**
 * Novogrudok Pixel Game - Stardew Valley style
 * Пройти через туман — пиксельная RPG в стиле Stardew Valley
 */

(function () {
    'use strict';

    const TILE = 16;
    const WORLD_W = 120;
    const WORLD_H = 80;
    let VIEW_W = 800;
    let VIEW_H = 500;
    const PLAYER_SPEED = 1.2;
    const PHOTO_POINTS = 100;
    // Радиус видимости (туман войны)
    const FOG_OF_WAR_RADIUS = 9;
    const FOG_OF_WAR_SOFT = 3;
    const CAMERA_LERP = 0.12;
    const CAMERA_ZOOM = 1.6; // приближение камеры к герою

    // Hero sprite sheet config
    const HERO_SPRITE_ROWS = 4;
    const HERO_SPRITE_COLS = 5;
    // Точный размер одного кадра героя
    const HERO_FRAME_WIDTH = 205;
    const HERO_FRAME_HEIGHT = 265;
    const HERO_IDLE_COL = 2;
    const HERO_WALK_SEQUENCE = [1, 2, 3, 2];
    const HERO_ANIM_SPEED = 0.12;

    // Stardew Valley color palette
    const COLORS = {
        grass: ['#4a7c23', '#5a8c2e', '#6b9c3a', '#3d6b1e'],
        earth: ['#8b6b4a', '#7a5a3a', '#6b4a2a', '#9a7b5a'],
        path: ['#6a6a5a', '#5a5a4a', '#7a7a6a', '#4a4a3a'],
        pathEdge: '#5a5248',
        pit: '#1a1a2e',
        pitEdge: '#2a2a3e'
    };

    // Sprite storage
    const SPRITES = {};
    const SPRITE_PATH = 'sprites/';

    // Фото/спрайты достопримечательностей Новогрудка
    const LANDMARKS = [
        {
            name: 'Новогрудский замок',
            img: './photo/Castle.jpg',
            sprite: 'zamok-1',
            x: 15,
            y: 8,
            solid: true,
            wTiles: 3,
            hTiles: 3
        },
        {
            name: 'Руины башни Щитовки',
            img: './photo/Tower.jpg',
            sprite: 'zamok-2',
            x: 45,
            y: 15,
            solid: true,
            wTiles: 3,
            hTiles: 3
        },
        {
            name: 'Фарный костёл',
            img: './photo/Castel.jpg',
            sprite: 'zamok-3',
            x: 65,
            y: 35,
            solid: true,
            wTiles: 3,
            hTiles: 3
        },
        {
            name: 'Дом Мицкевича',
            img: './photo/House.jpg',
            sprite: 'zamok-4',
            x: 55,
            y: 55,
            solid: true,
            wTiles: 3,
            hTiles: 3
        },
        {
            name: 'Гора Миндовга',
            img: './photo/Rock.jpg',
            sprite: 'zamok-5',
            x: 85,
            y: 45,
            solid: true,
            wTiles: 3,
            hTiles: 3
        }
    ];

    const JOURNALISTS = { x: 95, y: 65, w: 5, h: 4 };

    // Tile types: 0 grass, 1 earth, 2 road, 3 pit
    let world = [];
    let fogNoise = [];
    let fogPhase = 0;
    let revealed = [];
    let PIT_CLUSTERS = [];

    let canvas, ctx;
    let player = {
        x: 5,
        y: 5,
        w: 1,
        h: 1,
        dir: 'down',
        isMoving: false,
        animIndex: 0,      // индекс в HERO_WALK_SEQUENCE
        animTimer: 0       // таймер для переключения кадров
    };
    let camera = { x: 0, y: 0 };
    let keys = {};
    let score = 0;
    let photosTaken = 0;
    let photographed = new Set();
    let gameOver = false;
    let gameWon = false;
    let gameStarted = false;
    let gamePaused = false;
    let lastLandmark = null;
    let animId = null;

    function loadSprite(name, src) {
        const img = new Image();
        img.onload = () => {
            img._ok = true;
        };
        img.onerror = () => {
            console.warn('Sprite failed to load:', src);
            img._ok = false;
        };
        img.src = src;
        SPRITES[name] = img;
        return img;
    }

    function isMobile() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    function init() {
        canvas = document.getElementById('gameCanvas');
        if (!canvas) return;

        ctx = canvas.getContext('2d');
        // Гладкие пиксели нам не нужны — отключаем сглаживание,
        // чтобы избежать белой сетки между тайлами
        ctx.imageSmoothingEnabled = false;

        // Load external sprites from /sprites folder (relative to index.html)
        loadSprite('hero', SPRITE_PATH + 'hero.png');
        loadSprite('journalists', SPRITE_PATH + 'journalists.png');
        loadSprite('pit', SPRITE_PATH + 'pit.png');
        loadSprite('gard', SPRITE_PATH + 'gard.png');
        loadSprite('ground1', SPRITE_PATH + 'ground1.png');
        loadSprite('road', SPRITE_PATH + 'road.png');
        loadSprite('trava1', SPRITE_PATH + 'trava-1.png');
        loadSprite('trava2', SPRITE_PATH + 'trava-2.png');
        loadSprite('zamok-1', SPRITE_PATH + 'zamok-1.png');
        loadSprite('zamok-2', SPRITE_PATH + 'zamok-2.png');
        loadSprite('zamok-3', SPRITE_PATH + 'zamok-kastle.png');
        loadSprite('zamok-4', SPRITE_PATH + 'zamok-house.png');
        loadSprite('zamok-5', SPRITE_PATH + 'zamok-mindowg.png');
        resizeCanvas();
        buildWorld();
        buildFogNoise();
        initRevealed();
        bindEvents();
        updateUI();
        window.addEventListener('resize', resizeCanvas);
    }

    function resizeCanvas() {
        const container = canvas.parentElement;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const w = rect.width || VIEW_W;
        const h = rect.height || VIEW_H;
        if (canvas.width !== w || canvas.height !== h) {
            VIEW_W = canvas.width = w;
            VIEW_H = canvas.height = h;
        }
    }

    function initRevealed() {
        revealed = [];
        for (let y = 0; y < WORLD_H; y++) {
            revealed[y] = [];
            for (let x = 0; x < WORLD_W; x++) revealed[y][x] = false;
        }
    }

    function tileHash(x, y) {
        return ((x * 73856093) ^ (y * 19349663)) >>> 0;
    }

    function isBlockedTile(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) return true;

        // яма — непроходимый тайл
        if (world[ty] && world[ty][tx] === 3) return true;

        // твёрдые достопримечательности
        for (const lm of LANDMARKS) {
            if (!lm.solid) continue;
            const w = lm.wTiles || 1;
            const h = lm.hTiles || 1;
            if (
                tx >= lm.x &&
                tx < lm.x + w &&
                ty >= lm.y &&
                ty < lm.y + h
            ) {
                return true;
            }
        }

        return false;
    }

    function buildWorld() {
        world = [];
        for (let y = 0; y < WORLD_H; y++) {
            world[y] = [];
            for (let x = 0; x < WORLD_W; x++) {
                let t = 0;
                if ((tileHash(x, y) % 100) < 18) t = 1;
                world[y][x] = t;
            }
        }

        // Road from start (5,5) to journalists (95,65) - winding path
        for (let x = 5; x <= 35; x++) world[5][x] = 2;
        for (let y = 5; y <= 25; y++) world[y][35] = 2;
        for (let x = 35; x <= 55; x++) world[25][x] = 2;
        for (let y = 25; y <= 45; y++) world[y][55] = 2;
        for (let x = 55; x <= 75; x++) world[45][x] = 2;
        for (let y = 45; y <= 65; y++) world[y][75] = 2;
        for (let x = 75; x <= 100; x++) world[65][x] = 2;
        for (let y = 65; y <= 70; y++) world[y][95] = 2;

        // Pits - avoid road tiles (each entry is center of 3x3 ямы)
        const pits = [[20, 15], [50, 30], [70, 20], [40, 50], [80, 55], [25, 45], [60, 10]];
        pits.forEach(([px, py]) => {
            for (let dy = -1; dy <= 1; dy++)
                for (let dx = -1; dx <= 1; dx++) {
                    const nx = px + dx, ny = py + dy;
                    if (nx >= 0 && nx < WORLD_W && ny >= 0 && ny < WORLD_H && world[ny][nx] !== 2)
                        world[ny][nx] = 3;
                }
        });

        PIT_CLUSTERS = pits;
    }

    function buildFogNoise() {
        fogNoise = [];
        for (let y = 0; y < WORLD_H + 4; y++) {
            fogNoise[y] = [];
            for (let x = 0; x < WORLD_W + 4; x++) {
                fogNoise[y][x] = (Math.sin(x * 0.09) * Math.cos(y * 0.2) + 1) * 0.5 +
                    Math.random() * 0.09;
            }
        }
    }

    function bindEvents() {
        document.getElementById('gameStart')?.addEventListener('click', startGame);
        document.getElementById('gamePhoto')?.addEventListener('click', takePhoto);
        document.getElementById('gameFullscreenToggle')?.addEventListener('click', () => {
            if (!isMobile()) return;
            updateFullscreenIcon();
            const section = document.getElementById('game');
            if (!section) return;
            if (section.classList.contains('game-fullscreen')) {
                exitFullscreen();
            } else {
                enterFullscreen();
            }
        });
        document.getElementById('gameModalClose')?.addEventListener('click', closePhotoModal);
        document.getElementById('gameRestart')?.addEventListener('click', restartGame);
        document.getElementById('gameExitFullscreen')?.addEventListener('click', exitFullscreen);
        document.getElementById('gamePhotoModal')?.querySelector('.game-modal__backdrop')?.addEventListener('click', closePhotoModal);

        document.addEventListener('keydown', e => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', ' '].includes(e.code))
                e.preventDefault();
            keys[e.code] = true;
            if (e.code === 'KeyF' || e.code === 'Space') takePhoto();
        });
        document.addEventListener('keyup', e => { keys[e.code] = false; });

        document.querySelectorAll('.game-key[data-dir]').forEach(btn => {
            btn.addEventListener('mousedown', () => { keys[dirToKey(btn.dataset.dir)] = true; });
            btn.addEventListener('mouseup', () => { keys[dirToKey(btn.dataset.dir)] = false; });
            btn.addEventListener('mouseleave', () => { keys[dirToKey(btn.dataset.dir)] = false; });
            btn.addEventListener('touchstart', e => { e.preventDefault(); keys[dirToKey(btn.dataset.dir)] = true; });
            btn.addEventListener('touchend', e => { e.preventDefault(); keys[dirToKey(btn.dataset.dir)] = false; });
        });
    }

    function dirToKey(dir) {
        const map = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
        return map[dir] || '';
    }

    function updateFullscreenIcon() {
        const btn = document.getElementById('gameFullscreenToggle');
        const section = document.getElementById('game');
        if (!btn || !section) return;
        // Фото 1 — войти в полноэкранный, Фото 2 — выйти
        btn.textContent = section.classList.contains('game-fullscreen') ? '▢' : '⛶';
    }

    function enterFullscreen() {
        if (!isMobile()) return;
        const section = document.getElementById('game');
        if (section) {
            section.classList.add('game-fullscreen');
            document.body.style.overflow = 'hidden';
            setTimeout(resizeCanvas, 100);
            updateFullscreenIcon();
        }
    }

    function exitFullscreen() {
        const section = document.getElementById('game');
        if (section) {
            section.classList.remove('game-fullscreen');
            document.body.style.overflow = '';
            resizeCanvas();
            updateFullscreenIcon();
        }
    }

    function startGame() {
        gameStarted = true;
        gameOver = false;
        gameWon = false;
        gamePaused = false;
        score = 0;
        photosTaken = 0;
        photographed.clear();
        player.x = 5;
        player.y = 5;
        player.dir = 'down';
        player.isMoving = false;
        player.animIndex = 0;
        player.animTimer = 0;
        camera.x = player.x * TILE - VIEW_W / 2;
        camera.y = player.y * TILE - VIEW_H / 2;
        buildWorld();
        initRevealed();
        document.getElementById('gameStart').style.display = 'none';
        const controlsEl = document.getElementById('gameControlsKeys');
        if (controlsEl && isMobile()) {
            controlsEl.classList.add('game-controls__keys--visible');
            enterFullscreen();
        }
        updateFullscreenIcon();
        setHint('WASD или стрелки — движение. F или 📷 — сфотографировать. Найдите журналистов СБ!');
        loop();
    }

    function restartGame() {
        const winModal = document.getElementById('gameWinModal');
        if (winModal) winModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        startGame();
    }

    function loop() {
        if (gameOver || gameWon || gamePaused) {
            // Пока игра на паузе или завершена — не планируем новый кадр,
            // чтобы не накапливать несколько циклов и не ускорять движение.
            return;
        }

        const dx = (keys['ArrowRight'] || keys['KeyD'] ? 1 : 0) - (keys['ArrowLeft'] || keys['KeyA'] ? 1 : 0);
        const dy = (keys['ArrowDown'] || keys['KeyS'] ? 1 : 0) - (keys['ArrowUp'] || keys['KeyW'] ? 1 : 0);

        player.isMoving = dx !== 0 || dy !== 0;

        if (player.isMoving) {
            if (dy < 0) player.dir = 'up';
            else if (dy > 0) player.dir = 'down';
            else if (dx < 0) player.dir = 'left';
            else if (dx > 0) player.dir = 'right';

            player.animTimer += HERO_ANIM_SPEED;
            if (player.animTimer >= 1) {
                player.animTimer = 0;
                player.animIndex = (player.animIndex + 1) % HERO_WALK_SEQUENCE.length;
            }
        } else {
            // стоим – всегда показываем idle-кадр
            player.animTimer = 0;
            player.animIndex = 0;
        }

        if (player.isMoving) {
            const nx = player.x + dx * PLAYER_SPEED * 0.1;
            const ny = player.y + dy * PLAYER_SPEED * 0.1;
            const tx = Math.floor(nx), ty = Math.floor(ny);
            if (tx >= 0 && tx < WORLD_W && ty >= 0 && ty < WORLD_H) {
                if (!isBlockedTile(tx, ty)) {
                    player.x = Math.max(0.5, Math.min(WORLD_W - 0.6, nx));
                    player.y = Math.max(0.5, Math.min(WORLD_H - 0.6, ny));
                } else if (world[ty] && world[ty][tx] === 3) {
                    gameOver = true;
                    setHint('Вы попали в яму! Нажмите «Начать игру» снова.');
                    document.getElementById('gameStart').style.display = 'block';
                    document.getElementById('gameStart').textContent = 'Начать заново';
                    return;
                }
            }
        }

        fogPhase += 0.008;

        lastLandmark = null;
        const px = player.x;
        const py = player.y;
        LANDMARKS.forEach((lm) => {
            const w = lm.wTiles || 2;
            const h = lm.hTiles || 2;
            const margin = 10.0; // активная зона фото в радиусе ~10 тайлов
            const left = lm.x - margin;
            const right = lm.x + w + margin;
            const top = lm.y - margin;
            const bottom = lm.y + h + margin;
            if (px >= left && px <= right && py >= top && py <= bottom) {
                lastLandmark = lm;
            }
        });
        if (lastLandmark && !photographed.has(lastLandmark.name)) {
            setHint(`Рядом: ${lastLandmark.name}. Нажмите 📷 или F!`);
        } else {
            setHint('Идите по дороге. Фотографируйте достопримечательности. Найдите журналистов СБ!');
        }

        const j = JOURNALISTS;
        if (player.x >= j.x && player.x < j.x + j.w && player.y >= j.y && player.y < j.y + j.h) {
            gameWon = true;
            document.getElementById('gameWinScore').textContent = score;
            document.getElementById('gameWinModal').setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            return;
        }

        render();
        updateUI();
        animId = requestAnimationFrame(loop);
    }

    function render() {
        const targetCamX = player.x * TILE - VIEW_W / 2;
        const targetCamY = player.y * TILE - VIEW_H / 2;
        camera.x += (targetCamX - camera.x) * CAMERA_LERP;
        camera.y += (targetCamY - camera.y) * CAMERA_LERP;
        const camX = camera.x, camY = camera.y;

        ctx.fillStyle = '#1a2a1a';
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);

        ctx.save();
        // Приближаем мир к камере (зум)
        ctx.translate(VIEW_W / 2, VIEW_H / 2);
        ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
        ctx.translate(-VIEW_W / 2, -VIEW_H / 2);

        const startTx = Math.floor(camX / TILE);
        const startTy = Math.floor(camY / TILE);
        const endTx = Math.ceil((camX + VIEW_W) / TILE) + 1;
        const endTy = Math.ceil((camY + VIEW_H) / TILE) + 1;

        for (let ty = startTy; ty < endTy; ty++) {
            for (let tx = startTx; tx < endTx; tx++) {
                const screenX = tx * TILE - camX;
                const screenY = ty * TILE - camY;
                const distToPlayer = Math.hypot(tx + 0.5 - player.x, ty + 0.5 - player.y);
                if (distToPlayer <= FOG_OF_WAR_RADIUS + FOG_OF_WAR_SOFT && ty >= 0 && ty < WORLD_H && tx >= 0 && tx < WORLD_W) {
                    revealed[ty][tx] = true;
                }
                const inView = distToPlayer < FOG_OF_WAR_RADIUS || (distToPlayer < FOG_OF_WAR_RADIUS + FOG_OF_WAR_SOFT && revealed[ty]?.[tx]);
                if (!inView) continue;

                if (ty >= 0 && ty < WORLD_H && tx >= 0 && tx < WORLD_W) {
                    const t = world[ty][tx];
                    const dimmed = distToPlayer > FOG_OF_WAR_RADIUS;
                    const alpha = dimmed ? 0.4 : 1;
                    const h = tileHash(tx, ty);

                    if (t === 0 || t === 1 || t === 2) {
                        drawGroundFromAtlas(t, screenX, screenY, alpha, h);
                    } else if (t === 3) {
                        // Яма должна быть одной картинкой, а не дублироваться по клеткам
                        const isCenter = PIT_CLUSTERS.some(
                            ([px, py]) => px === tx && py === ty
                        );

                        if (!isCenter) {
                            // Для соседних тайлов вокруг ямы просто рисуем траву,
                            // чтобы не было тёмной рамки вокруг спрайта.
                            drawGroundFromAtlas(0, screenX, screenY, alpha, h);
                        } else {
                            const pitSprite = SPRITES.pit;
                            ctx.globalAlpha = alpha;

                            if (
                                pitSprite &&
                                pitSprite.complete &&
                                pitSprite.naturalWidth > 0 &&
                                pitSprite._ok !== false
                            ) {
                                // Масштабируем яму пропорционально, примерно на 3 тайла по высоте
                                const targetH = TILE * 3;
                                const scale = targetH / pitSprite.naturalHeight;
                                const drawH = pitSprite.naturalHeight * scale;
                                const drawW = pitSprite.naturalWidth * scale;

                                const drawX = screenX - drawW / 2;
                                const drawY = screenY - drawH / 2;

                                ctx.drawImage(
                                    pitSprite,
                                    0,
                                    0,
                                    pitSprite.naturalWidth,
                                    pitSprite.naturalHeight,
                                    drawX,
                                    drawY,
                                    drawW,
                                    drawH
                                );
                            } else {
                                const drawSize = TILE * 3;
                                const drawX = screenX - drawSize / 2;
                                const drawY = screenY - drawSize / 2;
                                ctx.fillStyle = COLORS.pit;
                                ctx.fillRect(drawX, drawY, drawSize, drawSize);
                                ctx.strokeStyle = COLORS.pitEdge;
                                ctx.lineWidth = 1;
                                ctx.strokeRect(drawX + 0.5, drawY + 0.5, drawSize - 1, drawSize - 1);
                            }
                        }
                    }
                    ctx.globalAlpha = 1;
                }
            }
        }

        LANDMARKS.forEach(lm => {
            const dist = Math.hypot(lm.x - player.x, lm.y - player.y);
            if (dist > FOG_OF_WAR_RADIUS + FOG_OF_WAR_SOFT && !revealed[Math.floor(lm.y)]?.[Math.floor(lm.x)]) return;
            const sx = lm.x * TILE - camX;
            const sy = lm.y * TILE - camY;
            const dimmed = dist > FOG_OF_WAR_RADIUS;
            ctx.globalAlpha = dimmed ? 0.4 : 1;
            const spriteName = lm.sprite;
            const lmSprite = spriteName && SPRITES[spriteName];
            if (lmSprite && lmSprite.complete && lmSprite.naturalWidth > 0 && lmSprite._ok !== false) {
                const wTiles = lm.wTiles || 2;
                const hTiles = lm.hTiles || 2;
                // значительно увеличиваем замки относительно коллизий
                let scaleW = 2.0;
                const scaleH = 2.0;
                // дом (zamok-house) делаем шире по горизонтали
                if (spriteName === 'zamok-4') {
                    scaleW = 2.6;
                }
                const drawW = TILE * wTiles * scaleW;
                const drawH = TILE * hTiles * scaleH;
                ctx.drawImage(
                    lmSprite,
                    0,
                    0,
                    lmSprite.naturalWidth,
                    lmSprite.naturalHeight,
                    sx - (drawW - TILE * wTiles) / 2,
                    sy - (drawH - TILE * hTiles),
                    drawW,
                    drawH
                );
            } else {
                drawStardewBuilding(ctx, sx, sy, TILE * 2, TILE * 2, photographed.has(lm.name));
            }
            ctx.globalAlpha = 1;
        });

        const j = JOURNALISTS;
        const jCenterX = j.x + j.w / 2, jCenterY = j.y + j.h / 2;
        const jDist = Math.hypot(jCenterX - player.x, jCenterY - player.y);
        const jVisible = jDist < FOG_OF_WAR_RADIUS + FOG_OF_WAR_SOFT;
        if (jVisible) {
            const jx = j.x * TILE - camX, jy = j.y * TILE - camY;
            ctx.globalAlpha = jDist > FOG_OF_WAR_RADIUS ? 0.4 : 1;
            const jSprite = SPRITES.journalists;
            if (jSprite && jSprite.complete && jSprite.naturalWidth > 0 && jSprite._ok !== false) {
                ctx.drawImage(
                    jSprite,
                    jx - TILE,
                    jy - TILE * 1.5,
                    j.w * TILE + TILE * 2,
                    j.h * TILE + TILE * 2
                );
            } else {
                ctx.fillStyle = '#4a5a6a';
                ctx.fillRect(jx, jy, j.w * TILE, j.h * TILE);
                ctx.fillStyle = '#6a7a8a';
                ctx.fillRect(jx + 2, jy + 2, j.w * TILE - 4, j.h * TILE - 4);
                ctx.fillStyle = '#e8e6e1';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('СБ', jx + (j.w * TILE) / 2, jy + (j.h * TILE) / 2 + 4);
                ctx.textAlign = 'left';
            }
            ctx.globalAlpha = 1;
        }

        const playerScreenX = player.x * TILE - camX;
        const playerScreenY = player.y * TILE - camY;
        drawStardewPlayer(ctx, Math.round(playerScreenX), Math.round(playerScreenY));

        renderFog(camX, camY);
        renderFogOfWar(camX, camY);

        ctx.restore();
    }

    function drawStardewBuilding(ctx, x, y, w, h, visited) {
        const wall = visited ? '#5a7a5a' : '#6b5444';
        const roof = visited ? '#4a6a4a' : '#5a4433';
        const window = visited ? '#7a9a7a' : '#8a7a5a';
        ctx.fillStyle = wall;
        ctx.fillRect(x, y + h * 0.3, w, h * 0.7);
        ctx.fillStyle = roof;
        ctx.fillRect(x, y, w, h * 0.35);
        ctx.fillStyle = window;
        ctx.fillRect(x + w * 0.25, y + h * 0.5, w * 0.2, h * 0.25);
        ctx.fillRect(x + w * 0.55, y + h * 0.5, w * 0.2, h * 0.25);
        ctx.strokeStyle = '#4a3a2a';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }

    function directionToRow(dir) {
        switch (dir) {
            // 0 — вверх, 1 — влево, 2 — вправо, 3 — вниз
            case 'up': return 0;
            case 'left': return 1;
            case 'right': return 2;
            case 'down': return 3;
            default: return 0;
        }
    }

    function getHeroSpriteFrame(sprite) {
        const row = directionToRow(player.dir);

        const sw = HERO_FRAME_WIDTH;
        const sh = HERO_FRAME_HEIGHT;

        const currentCol = player.isMoving
            ? HERO_WALK_SEQUENCE[player.animIndex]
            : HERO_IDLE_COL;

        const sx = currentCol * sw;
        const sy = row * sh;

        return { sx, sy, sw, sh };
    }

    function drawGroundFromAtlas(type, x, y, alpha, hash) {
        const drawX = Math.floor(x);
        const drawY = Math.floor(y);

        // 1. Нижний слой: базовая трава gard.png для всех типов
        const gard = SPRITES['gard'];
        if (
            gard &&
            gard.complete &&
            gard.naturalWidth > 0 &&
            gard._ok !== false
        ) {
            ctx.globalAlpha = alpha;
            ctx.drawImage(
                gard,
                0,
                0,
                gard.width,
                gard.height,
                drawX,
                drawY,
                TILE,
                TILE
            );
            ctx.globalAlpha = 1;
        } else {
            // fallback: плоская трава
            ctx.globalAlpha = alpha;
            ctx.fillStyle = COLORS.grass[0];
            ctx.fillRect(drawX, drawY, TILE, TILE);
            ctx.globalAlpha = 1;
        }

        // 2. Верхний слой: грунт и дорога поверх травы
        if (type === 1) {
            const ground1 = SPRITES['ground1'];
            if (
                ground1 &&
                ground1.complete &&
                ground1.naturalWidth > 0 &&
                ground1._ok !== false
            ) {
                ctx.globalAlpha = alpha;
                ctx.drawImage(
                    ground1,
                    0,
                    0,
                    ground1.width,
                    ground1.height,
                    drawX,
                    drawY,
                    TILE,
                    TILE
                );
                ctx.globalAlpha = 1;
                return;
            }
            ctx.fillStyle = COLORS.earth[0];
        } else if (type === 2) {
            const road = SPRITES['road'];
            if (
                road &&
                road.complete &&
                road.naturalWidth > 0 &&
                road._ok !== false
            ) {
                ctx.globalAlpha = alpha;
                ctx.drawImage(
                    road,
                    0,
                    0,
                    road.width,
                    road.height,
                    drawX,
                    drawY,
                    TILE,
                    TILE
                );
                ctx.globalAlpha = 1;
                return;
            }
            ctx.fillStyle = COLORS.path[0];
        } else {
            // type === 0 — чистая трава, без доп. покрытия
            ctx.fillStyle = COLORS.grass[0];
        }

        // 3. Декоративные кустики на чистой траве (type === 0)
        if (type === 0) {
            const travaSprites = [
                SPRITES['trava1'],
                SPRITES['trava2']
            ].filter(
                (s) => s && s.complete && s.naturalWidth > 0 && s._ok !== false
            );

            if (travaSprites.length > 0) {
                // Используем hash тайла, чтобы распределять кусты детерминированно
                const r = hash ?? 0;
                // Примерно на каждом 4–5 тайле рисуем куст
                if (r % 5 === 0) {
                    const idx = r % travaSprites.length;
                    const spr = travaSprites[idx];
                    const sprScale = 0.2; // делаем кусты крупнее относительно тайла
                    const w = spr.width * sprScale;
                    const h = spr.height * sprScale;

                    ctx.globalAlpha = alpha;
                    ctx.drawImage(
                        spr,
                        0,
                        0,
                        spr.width,
                        spr.height,
                        drawX + (TILE - w) / 2,
                        drawY + (TILE - h), // прижимаем к "земле"
                        w,
                        h
                    );
                    ctx.globalAlpha = 1;
                }
            }
        }
    }

    function drawStardewPlayer(ctx, px, py) {
        const s = TILE;

        ctx.save();
        // позиционируем по центру тайла, опорная точка — низ спрайта
        const centerX = px + s / 2;
        const centerY = py + s;
        ctx.translate(centerX, centerY);

        const heroSprite = SPRITES.hero;
        if (
            heroSprite &&
            heroSprite.complete &&
            heroSprite.naturalWidth > 0 &&
            heroSprite._ok !== false
        ) {
            const { sx, sy, sw, sh } = getHeroSpriteFrame(heroSprite);
            const scale = 0.16; // ещё немного уменьшаем героя (~16% от оригинала)
            const drawW = sw * scale;
            const drawH = sh * scale;

            ctx.drawImage(
                heroSprite,
                sx,
                sy,
                sw,
                sh,
                -drawW / 2,
                -drawH,
                drawW,
                drawH
            );
            ctx.restore();
            return;
        }

        // Простой fallback, если спрайт не загрузился
        ctx.fillStyle = '#5a7a9a';
        ctx.fillRect(-s / 2, -s, s, s * 1.2);
        ctx.restore();
    }

    function renderFog(camX, camY) {
        // Мягкий туман без клеток: один большой вертикальный градиент поверх сцены
        const baseAlpha = 0.2 + 0.05 * Math.sin(fogPhase * 0.3);
        const topAlpha = Math.max(0, Math.min(0.5, baseAlpha));

        const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
        gradient.addColorStop(0, 'rgba(210,224,236,0)');
        gradient.addColorStop(1, `rgba(210,224,236,${topAlpha})`);

        ctx.save();
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
        ctx.restore();
    }

    function renderFogOfWar(camX, camY) {
        const px = player.x * TILE - camX;
        const py = player.y * TILE - camY;
        const radius = FOG_OF_WAR_RADIUS * TILE;
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius);
        // Центр почти прозрачный, затем "туман" вместо чёрного
        gradient.addColorStop(0, 'rgba(210,224,236,0)');
        gradient.addColorStop(0.55, 'rgba(210,224,236,0.12)');
        gradient.addColorStop(0.8, 'rgba(196,210,224,0.35)');
        gradient.addColorStop(1, 'rgba(176,192,210,0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(-TILE * 2, -TILE * 2, VIEW_W + TILE * 4, VIEW_H + TILE * 4);
    }

    function takePhoto() {
        if (!gameStarted || gameOver || gameWon) return;
        if (lastLandmark && !photographed.has(lastLandmark.name)) {
            photographed.add(lastLandmark.name);
            photosTaken++;
            score += PHOTO_POINTS;
            gamePaused = true;
            document.getElementById('gamePhotoImg').src = lastLandmark.img;
            document.getElementById('gamePhotoCaption').textContent = lastLandmark.name;
            const modal = document.getElementById('gamePhotoModal');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            setHint(`Сфотографировано: ${lastLandmark.name}! +${PHOTO_POINTS} очков`);
        } else if (lastLandmark) {
            setHint('Вы уже сфотографировали это место.');
        } else {
            setHint('Подойдите ближе к достопримечательности.');
        }
    }

    function closePhotoModal() {
        document.getElementById('gamePhotoModal').setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        gamePaused = false;
        if (gameStarted && !gameOver && !gameWon) loop();
    }

    function setHint(text) {
        const el = document.getElementById('gameHint');
        if (el) el.textContent = text;
    }

    function updateUI() {
        const scoreEl = document.getElementById('gameScore');
        const photosEl = document.getElementById('gamePhotos');
        if (scoreEl) scoreEl.textContent = score;
        if (photosEl) photosEl.textContent = photosTaken + '/' + LANDMARKS.length;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
