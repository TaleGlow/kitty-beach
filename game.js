// ================================================
// Kitty Beach - Final Clean Version (Game Jam Ready)
// ================================================

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 500,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: { preload: preload, create: create, update: update },
    scale: { 
        mode: Phaser.Scale.FIT, 
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800, 
        height: 500 
    }
};

const game = new Phaser.Game(config);

// Global game variables
let clawUnit;
let loadedCoconut = null;
let isLoaded = false;
let cursors;
let spaceKey;
let isDelivering = false;
let mealsDeliveredCount = 0;
let robotsEnabled = false;
let robotSpawnTimer = null;
let archCatHealth = 0;
let bgMusic;
let soundOn = true;

// Background constants
const skyY = 96; 
const skyHeight = 191;
const oceanY = 189; 
const oceanHeight = 18;
const sandY = 480; 
const sandHeight = 565;
const railY = 80; 
const clawY = 80;
const treeTrunkHeight = 422; 
const treeLeafY = 66;
const leftTreeX = 45; 
const rightTreeX = 755; 
const railWidth = 688;

// ==================== ENERGY BAR (Desktop vs Android) ====================
let energyBarY = 436;
let energyBarWidth = 400;
let energyBarHeight = 19;

// Android / Mobile adjustments
if (window.innerWidth <= 900 || window.innerHeight < 650) {
    energyBarY = 428;           // Raise the bar on small screens
    energyBarWidth = 340;
    energyBarHeight = 30;
}

function preload() {
    this.load.audio('bgMusic', 'assets/Traditions.mp3');  
    // Credits - Track: Traditions Music by: https://www.fiftysounds.com
    console.log("Preload complete");
}

// ==================== MEALS DELIVERED COUNTER ====================
function updateMealsDelivered() {
    const el = document.getElementById('meals-delivered');
    if (el) {
        mealsDeliveredCount = (parseInt(el.textContent) || 0) + 1;
        el.textContent = mealsDeliveredCount;    
        console.log(`Meal delivered! Total meals: ${mealsDeliveredCount}`);
    }

    if (mealsDeliveredCount >= 3 && !robotsEnabled) {
        robotsEnabled = true;
        console.log("=== 3 MEALS REACHED - STARTING ROBOT INVASION ===");

        const scene = game.scene.scenes[0];
        if (scene) {
            startRobotSpawning(scene);
        } else {
            console.error("ERROR: Could not find scene!");
        }
    }
}

function create() {
    const scene = this;  // Safe reference for everything inside create

    // ==================== PORTRAIT WARNING ====================
    function checkOrientation() {
        const warningId = 'portrait-warning';
        let warning = document.getElementById(warningId);
        if (window.innerHeight > window.innerWidth) {
            if (!warning) {
                warning = document.createElement('div');
                warning.id = warningId;
                warning.style.position = 'fixed';
                warning.style.top = '50%';
                warning.style.left = '50%';
                warning.style.transform = 'translate(-50%, -50%)';
                warning.style.background = 'rgba(0,0,0,0.92)';
                warning.style.color = '#ffeeaa';
                warning.style.padding = '25px 40px';
                warning.style.borderRadius = '16px';
                warning.style.fontSize = '20px';
                warning.style.textAlign = 'center';
                warning.style.zIndex = '9999';
                warning.style.border = '3px solid #ffcc00';
                warning.innerHTML = 'Please rotate your device to<br><strong>LANDSCAPE</strong> mode<br>for the best experience!';
                document.body.appendChild(warning);
            }
        } else {
            if (warning) warning.remove();
        }
    }
    window.addEventListener('load', checkOrientation);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    // ==================== BACKGROUND ====================
    scene.add.rectangle(400, skyY, 800, skyHeight, 0x88ccff);
    scene.add.rectangle(400, oceanY, 800, oceanHeight, 0x44aaff);
    scene.add.rectangle(400, sandY, 800, sandHeight, 0xeedd99);

    // Palm Trees
    scene.add.rectangle(leftTreeX, 280, 34, treeTrunkHeight, 0x8B4513);
    scene.add.rectangle(leftTreeX - 13, 210, 22, 120, 0x8B4513);
    scene.add.rectangle(leftTreeX - 30, treeLeafY, 85, 75, 0x228B22);

    scene.add.rectangle(rightTreeX, 280, 34, treeTrunkHeight, 0x8B4513);
    scene.add.rectangle(rightTreeX + 13, 210, 22, 120, 0x8B4513);
    scene.add.rectangle(rightTreeX + 30, treeLeafY, 85, 75, 0x228B22);

    // Steel rail
    scene.add.rectangle(400, railY, railWidth, 14, 0x444444);

    // ==================== CLAW + COCONUT KITTY ====================
    clawUnit = scene.add.container(400, clawY);
    const box = scene.add.rectangle(0, 0, 48, 32, 0x666666);
    const clawTeeth = scene.add.rectangle(0, 18, 56, 14, 0x555555);
    const coconutKitty = scene.add.text(0, -32, '🐱', { fontSize: '56px' }).setOrigin(0.5);
    coconutKitty.setShadow(3, 3, '#000000', 5);

    clawUnit.add([box, clawTeeth, coconutKitty]);
    clawUnit.coconutKitty = coconutKitty;

    clawUnit.setSize(80, 80);
    clawUnit.setInteractive({ draggable: true });
    scene.physics.add.existing(clawUnit, true);

    // Drag controls
    scene.input.on('drag', (pointer, gameObject, dragX) => {
        if (gameObject === clawUnit) {
            clawUnit.x = Phaser.Math.Clamp(dragX, 80, 720);
        }
    });
    scene.input.on('dragstart', (pointer, gameObject) => {
        if (gameObject === clawUnit) gameObject.setScale(1.12);
    });
    scene.input.on('dragend', (pointer, gameObject) => {
        if (gameObject === clawUnit) gameObject.setScale(1);
    });

    // Coconut Kitty idle bob
    scene.tweens.add({
        targets: coconutKitty,
        y: -28 + 4,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // ==================== INPUT ====================
    cursors = scene.input.keyboard.createCursorKeys();
    spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    scene.input.on('pointerdown', onPointerDown, scene);
    scene.input.on('pointerup', onPointerUp, scene);
    scene.input.keyboard.on('keydown-R', () => spawnRobotKitty(scene));

    // Meal handlers
    const self = scene;
    document.getElementById('pate').addEventListener('click', () => spawnFoodBowl.call(self, 'pate', '🥩'));
    document.getElementById('salmon').addEventListener('click', () => spawnFoodBowl.call(self, 'salmon', '🐟'));
    document.getElementById('turkey').addEventListener('click', () => spawnFoodBowl.call(self, 'turkey', '🦃'));
    document.getElementById('cheese').addEventListener('click', () => spawnFoodBowl.call(self, 'cheese', '🧀'));
    document.getElementById('peanut').addEventListener('click', () => spawnFoodBowl.call(self, 'peanut', '🥜'));
    document.getElementById('milk').addEventListener('click', () => spawnFoodBowl.call(self, 'milk', '🥛'));

    // Groups
    scene.coconuts = scene.physics.add.group();
    scene.robots = scene.physics.add.group();
    scene.kitties = scene.physics.add.group();

    // Collisions
    scene.physics.add.overlap(scene.coconuts, scene.robots, (coconut, robot) => {
        if (!coconut || !robot || !coconut.active || !robot.active) return;
        coconut.destroy();
        scene.tweens.add({
            targets: robot,
            scale: { from: 1, to: 0.15 },
            alpha: 0,
            duration: 280,
            onComplete: () => { if (robot.active) robot.destroy(); }
        });
        updateRivalsCaptured();
    });

    scene.physics.add.overlap(scene.coconuts, scene.kitties, (coconut, kitty) => {
        if (!coconut || !kitty || !coconut.active || !kitty.active) return;
        coconut.destroy();
        const scatterX = kitty.x + (Phaser.Math.Between(0, 1) ? -200 : 200);
        scene.tweens.add({
            targets: kitty,
            x: scatterX,
            y: kitty.y + Phaser.Math.Between(-40, 40),
            duration: 600,
            ease: 'Power2',
            onComplete: () => { if (kitty.active) kitty.destroy(); }
        });

        const hub = document.getElementById('message-center');
        if (hub) {
            hub.textContent = 'Oops! Coconut hit a kitty!';
            setTimeout(() => { if (hub.textContent.includes('Oops')) hub.textContent = ''; }, 1800);
        }
    });

    scene.physics.add.overlap(scene.robots, scene.kitties, (robot, kitty) => {
        if (!robot || !kitty || !robot.active || !kitty.active || robot.isCapturing) return;
        scareKittyAndCaptureFood.call(scene, robot, kitty);
    });

    // ==================== ENERGY BAR ====================
    scene.archCatEnergy = 0;
    scene.energyWarningShown = false;
    scene.bossActive = false;

    scene.energyBarBG = scene.add.rectangle(400, energyBarY, energyBarWidth, energyBarHeight, 0x222222)
        .setOrigin(0.5, 0.5);

    scene.energyBar = scene.add.rectangle(400 - energyBarWidth/2, energyBarY, energyBarWidth, energyBarHeight, 0xffdd00)
        .setOrigin(0, 0.5)
        .setScale(0, 1);

    scene.energyBar.setStrokeStyle(3, 0x000000);

    scene.energyText = scene.add.text(400, energyBarY - 1.28, 'Arch Cat Energy', 
        { fontSize: '18px', color: '#fcfeff' }).setOrigin(0.5);

    // ==================== WELCOME MESSAGES ====================
    let welcomeMessages = [
        "Welcome to Kitty Beach!",
        "Click or Tap foods. Feed kitties!",
        "Mouse drag/drop on Zoey OR ⇽ ⇾/space to drop.",
        "Robot Cats steal food for Arch Cat!",
        "Control Zoey's coconut machine!",
        "Defeat Robots! Save the kitties!"
    ];
    let currentMsgIndex = 0;
    let messageInterval = null;
    const hub = document.getElementById('message-center');

    scene.input.once('pointerdown', () => {
        if (messageInterval) clearInterval(messageInterval);
        if (hub) hub.textContent = welcomeMessages[currentMsgIndex];
        messageInterval = setInterval(() => {
            if (hub) {
                currentMsgIndex = (currentMsgIndex + 1) % welcomeMessages.length;
                hub.textContent = welcomeMessages[currentMsgIndex];
            }
        }, 3000);
    });

                    // ==================== BACKGROUND MUSIC + TOGGLE ====================
    bgMusic = scene.sound.add('bgMusic', { 
        loop: true, 
        volume: 0.6 
    });
    bgMusic.play();

    // Sound Toggle Button
    const soundBtn = document.getElementById('sound-kitty');
    if (soundBtn) {
        soundBtn.textContent = '🔊';   // initial state

        soundBtn.addEventListener('click', () => {
            soundOn = !soundOn;
            
            if (soundOn) {
                bgMusic.setVolume(0.6);
                soundBtn.textContent = '🔊';
            } else {
                bgMusic.setVolume(0);
                soundBtn.textContent = '🔇';
            }
        });
    }

        // Fullscreen Button - Native behavior
    const fullscreenBtn = document.getElementById('fullscreen-kitty');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log("Fullscreen failed:", err);
                    // Fallback to Phaser scale
                    scene.scale.startFullscreen();
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

    console.log("✅ Create() finished successfully");
}

            // ============ SAILBOAT (disabled for now to keep game stable) ========
/*
    function spawnSailboat(s) {
        const sailboat = s.add.text(100, 205, '⛵');
        sailboat.setOrigin(0.5);
        sailboat.setFontSize(58);

        s.tweens.add({
            targets: sailboat,
            x: 900,
            duration: 22000,
            ease: 'Linear',
            onComplete: function() {
                sailboat.destroy();
                s.time.addEvent({
                    delay: 10000,
                    callback: function() {
                        spawnSailboat(s);
                    }
                });
            }
        });
    }

    spawnSailboat(this);
*/
    

// ==================== UPDATE & COCONUT CONTROLS ====================
function update() {
    if (!clawUnit) return;

    const speed = 5;
    if (cursors.left.isDown) clawUnit.x -= speed;
    else if (cursors.right.isDown) clawUnit.x += speed;

    clawUnit.x = Phaser.Math.Clamp(clawUnit.x, 80, 720);

    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
        if (!isLoaded) loadCoconut(this);
        else dropCoconut(this);
    }
}

function onPointerDown() { 
    if (!isLoaded) loadCoconut(this); 
}

function onPointerUp() { 
    if (isLoaded) dropCoconut(this); 
}

function loadCoconut(scene) {
    if (isLoaded) return;
    isLoaded = true;
    loadedCoconut = scene.add.rectangle(0, 35, 32, 32, 0x88cc44);
    clawUnit.add(loadedCoconut);
}

function dropCoconut(scene) {
    if (!isLoaded || !loadedCoconut) return;
    isLoaded = false;

    const dropX = clawUnit.x;
    const dropY = clawUnit.y + 35;

    clawUnit.remove(loadedCoconut);
    loadedCoconut.setPosition(dropX, dropY);

    scene.coconuts.add(loadedCoconut);
    scene.physics.add.existing(loadedCoconut);

    loadedCoconut.body.setVelocityY(240);
    loadedCoconut.body.setAngularVelocity(Phaser.Math.Between(-200, 200));
    loadedCoconut.body.setBounce(0.3);

    loadedCoconut = null;   // clear reference
}

// ==================== CORE FUNCTIONS ====================
function spawnRobotKitty(scene) {
    if (!scene) return;

    const fromLeft = Phaser.Math.Between(0, 1) === 0;
    const startX = fromLeft ? -50 : 850;
    const minY = sandY - sandHeight + 222;
    const maxY = sandY - 48;
    const startY = Phaser.Math.Between(Math.floor(minY), Math.floor(maxY));

    const robot = scene.add.text(startX, startY, '🤖', { fontSize: '44px', color: '#ff4444' }).setOrigin(0.5);

    scene.robots.add(robot);
    scene.physics.add.existing(robot);
    robot.fromLeft = fromLeft;

    const moveRobot = () => {
        const targetX = Phaser.Math.Between(45, 755);
        const targetY = Phaser.Math.Between(Math.floor(minY), Math.floor(maxY));
        scene.tweens.add({
            targets: robot,
            x: targetX,
            y: targetY,
            duration: Phaser.Math.Between(7000, 7100),
            ease: 'Sine.easeInOut',
            onComplete: moveRobot
        });
    };
    moveRobot();
}

function startRobotSpawning(scene) {
    if (!scene || robotSpawnTimer) {
        console.log("startRobotSpawning skipped");
        return;
    }
    console.log("Robot invasion started");

    const hub = document.getElementById('message-center');
    if (hub) {
        hub.textContent = ' Robot cats are invading the beach!';
        setTimeout(() => { if (hub) hub.textContent = ''; }, 4000);
    }

    spawnRobotKitty(scene);

    robotSpawnTimer = scene.time.addEvent({
        delay: Phaser.Math.Between(4000, 6500),
        callback: () => {
            if (robotsEnabled && !scene.bossActive) spawnRobotKitty(scene);
        },
        loop: true
    });
}

function scareKittyAndCaptureFood(robot, kitty) {
    const scene = this;
    if (robot.isCapturing || !kitty.active || !robot.active || kitty.isLeaving) return;
    robot.isCapturing = true;

    scene.tweens.killTweensOf(kitty);
    kitty.successfullyFed = false;
    kitty.isLeaving = false;

    const scatterLeft = Phaser.Math.Between(0, 1) === 0;
    const scatterX = scatterLeft ? -150 : 950;
    const scatterY = kitty.y + Phaser.Math.Between(-45, 45);

    scene.tweens.add({
        targets: kitty,
        x: scatterX,
        y: scatterY,
        duration: 720,
        ease: 'Power2',
        onComplete: () => { if (kitty.active) kitty.destroy(); }
    });

    const hub = document.getElementById('message-center');
    if (hub) {
        hub.textContent = 'Robot scared the kitty and stole the food!';
        setTimeout(() => { if (hub) hub.textContent = ''; }, 3600);
    }

    if (kitty.foodDrop && kitty.foodDrop.active) {
        const foodX = kitty.foodDrop.x;
        const foodY = kitty.foodDrop.y;

        scene.tweens.add({
            targets: robot,
            x: foodX,
            y: foodY - 30,
            duration: 480,
            ease: 'Power1',
            onComplete: () => {
                scene.archCatEnergy = Math.min(scene.archCatEnergy + 11.5, 100);
                
                if (scene.energyBar) {
                    scene.energyBar.scaleX = scene.archCatEnergy / 100;
                    if (scene.archCatEnergy >= 78) {
                        scene.energyBar.setFillStyle(0xff4444);
                    }
                }

                if (scene.archCatEnergy >= 78 && !scene.energyWarningShown) {
                    scene.energyWarningShown = true;
                    const warnHub = document.getElementById('message-center');
                    if (warnHub) {
                        warnHub.textContent = ' Arch Cat is about to awaken!';
                        setTimeout(() => { if (warnHub) warnHub.textContent = ''; }, 4000);
                    }
                }

                if (scene.archCatEnergy >= 100 && !scene.bossActive) {
                    scene.bossActive = true;
                    spawnArchCat(scene);
                }

                scene.tweens.add({
                    targets: robot,
                    y: foodY - 48,
                    duration: 160,
                    yoyo: true,
                    repeat: 4,
                    onComplete: () => {
                        robot.isCapturing = false;
                        const minY = sandY - sandHeight + 95;
                        const maxY = sandY - 55;
                        const moveRobot = () => {
                            const tx = Phaser.Math.Between(120, 680);
                            const ty = Phaser.Math.Between(Math.floor(minY), Math.floor(maxY));
                            scene.tweens.add({
                                targets: robot,
                                x: tx,
                                y: ty,
                                duration: Phaser.Math.Between(1350, 2750),
                                ease: 'Sine.easeInOut',
                                onComplete: moveRobot
                            });
                        };
                        moveRobot();
                    }
                });

                if (kitty.foodDrop && kitty.foodDrop.active) kitty.foodDrop.destroy();
            }
        });
    } else {
        robot.isCapturing = false;
    }
}

function spawnFoodBowl(type, emoji) {
    if (isDelivering) return;
    isDelivering = true;
    const scene = this;

    const bowlX = Phaser.Math.Between(160, 640);
    const minSandY = sandY - sandHeight / 2 + 65;
    const maxSandY = sandY - 48;
    const bowlY = Phaser.Math.Between(Math.floor(minSandY), Math.floor(maxSandY));

    const hub = document.getElementById('message-center');
    if (hub) hub.textContent = 'Rusty is delivering food!';

    const rustyFromLeft = Phaser.Math.Between(0, 1) === 0;
    const rustyStartX = rustyFromLeft ? -60 : 860;
    const rustyStartY = Phaser.Math.Between(Math.floor(minSandY), Math.floor(maxSandY));

    const deliveryGroup = scene.add.container(rustyStartX, rustyStartY);
    const rusty = scene.add.text(0, 0, '🐶', { fontSize: '48px' }).setOrigin(0.5);
    const deliveryBag = scene.add.text(34, -12, '🛍️', { fontSize: '38px' }).setOrigin(0.5);
    deliveryGroup.add([rusty, deliveryBag]);
    rusty.flipX = !rustyFromLeft;

    scene.tweens.add({
        targets: deliveryGroup,
        x: bowlX - 38,
        y: bowlY - 32,
        duration: Phaser.Math.Between(1450, 1950),
        ease: 'Sine.easeOut',
        onComplete: () => {
            // FIXED: Use the passed emoji
            const foodDrop = scene.add.text(bowlX, bowlY - 35, emoji || '🍖', { fontSize: '34px' }).setOrigin(0.5);
            updateMealsDelivered();

            scene.tweens.add({ 
                targets: foodDrop, 
                y: bowlY - 48, 
                duration: 220, 
                yoyo: true, 
                ease: 'Power1' 
            });

            //if (hub) hub.textContent = 'WOOF! Treat delivered!';
            
                       if (hub) {
                // Don't overwrite invasion message
                if (hub.textContent.includes('ROBOT') || hub.textContent.includes('INVADING')) {
                    return; // skip WOOF if invasion is active
                }
                hub.textContent = 'WOOF! WOOF!';
                setTimeout(() => {
                    if (hub && hub.textContent.includes('WOOF! WOOF!')) {
                        hub.textContent = '';
                    }
                }, 700);
            }
            
            // Kitty comes to eat
            const kittyFromLeft = Phaser.Math.Between(0, 1) === 0;
            const kittyStartX = kittyFromLeft ? -45 : 845;

            const kitty = scene.add.text(kittyStartX, bowlY - 22, '🐱', { fontSize: '42px' }).setOrigin(0.5);
            
            kitty.setData('bowlEmoji', emoji);
            kitty.foodDrop = foodDrop;
            kitty.fromLeft = kittyFromLeft;
            kitty.bowlX = bowlX;
            kitty.successfullyFed = false;

            scene.kitties.add(kitty);
            scene.physics.add.existing(kitty);

            // ... (rest of the eating animation stays exactly as you had it)
            scene.tweens.add({
                targets: kitty,
                x: bowlX - 18,
                duration: 1480,
                ease: 'Linear',
                onComplete: () => {
                    scene.tweens.add({
                        targets: kitty,
                        y: kitty.y - 14,
                        duration: 115,
                        yoyo: true,
                        repeat: 8,
                        ease: 'Sine.easeInOut',
                        onStart: () => {
                            kitty.successfullyFed = true;
                            if (kitty.foodDrop && kitty.foodDrop.active) {
                                scene.tweens.add({
                                    targets: kitty.foodDrop,
                                    alpha: 0,
                                    y: kitty.foodDrop.y - 20,
                                    duration: 800,
                                    onComplete: () => { if (kitty.foodDrop && kitty.foodDrop.active) kitty.foodDrop.destroy(); }
                                });
                            }
                        },
                        onComplete: () => {
                            const exitX = kittyFromLeft ? 860 : -60;
                            kitty.isLeaving = true;
                            scene.tweens.add({
                                targets: kitty,
                                x: exitX,
                                duration: 820,
                                ease: 'Linear',
                                onComplete: () => {
                                    if (kitty.active) {
                                        kitty.destroy();
                                        if (kitty.successfullyFed) updateKittiesFed();
                                    }
                                }
                            });
                        }
                    });
                }
            });

            const rustyExitX = rustyFromLeft ? 880 : -80;
            scene.tweens.add({
                targets: deliveryGroup,
                x: rustyExitX,
                duration: 1080,
                ease: 'Linear',
                onComplete: () => {
                    deliveryGroup.destroy();
                    isDelivering = false;
                }
            });
        }
    });
}

function spawnArchCat(scene) {
    console.log("=== ARCH CAT SPAWNED - READY FOR BATTLE ===");

    const archCat = scene.add.text(400, 340, '😾', { fontSize: '98px' }).setOrigin(0.5);
    scene.archCat = archCat;

    archCat.setData('health', 4);
    archCat.isDead = false;

    scene.physics.add.existing(archCat, false);
    archCat.body.setSize(170, 140);
    archCat.body.setOffset(-85, -70);
    archCat.body.setImmovable(true);

    archCat.hitCooldown = false;

    const hub = document.getElementById('message-center');
    if (hub) {
        hub.textContent = 'THE ARCH CAT HAS ARRIVED! Hit him 4 times!';
        setTimeout(() => { if (hub) hub.textContent = ''; }, 5000);
    }

    scatterRobots(scene);

    // Patrol + Bob
    const patrol = () => {
        scene.tweens.add({
            targets: archCat,
            x: Phaser.Math.Between(80, 720),
            duration: Phaser.Math.Between(2200, 3400),
            ease: 'Sine.easeInOut',
            onComplete: patrol
        });
    };
    patrol();

    scene.tweens.add({
        targets: archCat,
        y: 365,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
    });

    // === FINAL PROTECTED OVERLAP ===
    if (!scene.archCatOverlap) {
        scene.archCatOverlap = scene.physics.add.overlap(scene.coconuts, archCat, (coconut, boss) => {
            if (!coconut.active || !boss.active || boss.hitCooldown || boss.isDead) return;

            boss.hitCooldown = true;
            coconut.destroy();

            let health = boss.getData('health') || 4;
            health--;
            boss.setData('health', health);

            console.log(`Arch Cat HIT! Health left: ${health}/4`);

            // Visual hit
            scene.tweens.add({
                targets: boss,
                scale: 1.45,
                angle: Phaser.Math.Between(-25, 25),
                duration: 100,
                yoyo: true,
                repeat: 1,
                onComplete: () => {
                    boss.hitCooldown = false;
                    boss.setAngle(0);
                }
            });

            if (health <= 0 && !boss.isDead) {
                boss.isDead = true;

                scene.tweens.add({
                    targets: boss,
                    scale: 0.05,
                    alpha: 0,
                    rotation: Phaser.Math.DegToRad(Phaser.Math.Between(-60, 60)),
                    duration: 1200,
                    ease: 'Back.easeIn',
                    onComplete: () => {
                        boss.destroy();
                        scene.bossActive = false;
                        scene.archCatEnergy = 0;
                        if (scene.energyBar) scene.energyBar.scaleX = 0;

                        const winHub = document.getElementById('message-center');
                        if (winHub) {
                            winHub.textContent = '🎉 ARCH CAT DEFEATED! 🎉';
                            setTimeout(() => { 
                                if (winHub) winHub.textContent = 'You saved the beach!'; 
                            }, 5000);
                        }
                    }
                });
            }
        });
    }
}

function scatterRobots(scene) {
    scene.robots.getChildren().forEach(robot => {
        if (!robot || !robot.active) return;
        const exitLeft = robot.fromLeft !== undefined ? !robot.fromLeft : Phaser.Math.Between(0, 1) === 0;
        const exitX = exitLeft ? -100 : 900;
        const exitY = robot.y + Phaser.Math.Between(-40, 40);
        scene.tweens.add({
            targets: robot,
            x: exitX,
            y: exitY,
            duration: Phaser.Math.Between(800, 1400),
            ease: 'Power2',
            onComplete: () => { if (robot.active) robot.destroy(); }
        });
    });
}

// ==================== HELPER FUNCTIONS (place at the very bottom) ====================

function updateMealsDelivered() {
    const el = document.getElementById('meals-delivered');
    if (el) {
        mealsDeliveredCount = (parseInt(el.textContent) || 0) + 1;
        el.textContent = mealsDeliveredCount;    
        
        console.log(`Meal delivered! Total meals: ${mealsDeliveredCount}`);
    }

    if (mealsDeliveredCount >= 3 && !robotsEnabled) {
        robotsEnabled = true;
        console.log("=== 3 MEALS REACHED - STARTING ROBOT INVASION ===");
        const scene = game.scene.scenes[0];
        if (scene) startRobotSpawning(scene);        
    }
        
}

function updateKittiesFed() {
    const el = document.getElementById('kitties-fed');
    if (el) el.textContent = (parseInt(el.textContent) || 0) + 1;
}

function updateRivalsCaptured() {
    const el = document.getElementById('rivals-captured');
    if (el) el.textContent = (parseInt(el.textContent) || 0) + 1;
}

function disableContextMenus() {
    const noMenu = (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
    };

    ['contextmenu', 'long-press', 'touchhold'].forEach(event => {
        document.addEventListener(event, noMenu, true);
    });

    document.querySelectorAll('#top-strip, #bottom-strip, #meals-left, #meals-right, .meal-icon, #message-center').forEach(el => {
        el.style.userSelect = 'none';
        el.style.webkitUserSelect = 'none';
        el.style.touchAction = 'none';
        el.addEventListener('contextmenu', noMenu, true);
    });
}

function flashSprite(sprite, color = 0xffffff) {
    if (!sprite || !sprite.active) return;
    const originalTint = sprite.tint || 0xffffff;
    sprite.setTint(color);
    sprite.setAlpha(0.6);
    setTimeout(() => {
        if (sprite.active) {
            sprite.setAlpha(1);
            sprite.setTint(originalTint);
        }
    }, 120);
}
